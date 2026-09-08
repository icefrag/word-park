const { LEVELS, STAGE_RHYTHM, unitStage, SEGMENT, poolFor } = require('../../utils/levels')
const { CHARACTERS, byUnit, byStage, CONFUSABLE, pandaImage } = require('../../utils/characters')
const {
  buildQuestions, buildFindAllGrid, buildMatchCards, buildBubbleTargets, shuffle, imageChars,
  pickReviewTargets, mixTargets,
} = require('../../utils/engine')
const { completeLevel, loadProgress } = require('../../utils/progress')

const CHAR_MAP = Object.fromEntries(CHARACTERS.map((c) => [c.char, c]))

// 音近/形近干扰策略(中班起启用,小班纯随机 — spec P0-3):音近=拼音去调相同,形近=CONFUSABLE 手工表
const PY_MAP = Object.fromEntries(CHARACTERS.map((c) => [c.char, c.pinyin]))
const CONF_MAP = {}
for (const [a, b] of CONFUSABLE) {
  ;(CONF_MAP[a] = CONF_MAP[a] || []).push(b)
  ;(CONF_MAP[b] = CONF_MAP[b] || []).push(a)
}
const CONF_OPTS = { pinyin: PY_MAP, confusable: CONF_MAP }

Page({
  data: {
    round: null, // {type, props}:当前轮玩法类型与该组件所需数据
  },

  onLoad(query) {
    const levelId = Number(query.levelId)
    const level = LEVELS.find((l) => l.id === levelId)
    if (!level) {
      wx.navigateBack()
      return
    }
    this.level = level
    this.roundIndex = 0
    this.mistakes = 0
    this.wrongChars = []
    this._miniDone = false
    this._mini = false
    this._breakTimer = null
    this.goRound()
  },

  onUnload() {
    clearTimeout(this._breakTimer)
  },

  // 干扰项/操作类目标只用已学过的字(unit 即学习顺序);band 轮收缩到已教段(levels.poolFor)

  // 复习单元:本阶段已学字按遗忘风险抽样并缓存(切轮不重抽,轮间字池稳定)
  charsFor(lv) {
    if (lv.type !== 'review') return byUnit(lv.id)
    if (!this._reviewPool) {
      this._reviewPool = pickReviewTargets(byStage(lv.stage), lv.id, 12, loadProgress().charStats)
    }
    return this._reviewPool
  },

  // 旧字池:当前单元之前的已学字(掺旧字=间隔效应);复习单元本身就是旧字池,不掺;池太小(开局)不掺
  oldTargets(lv, needImage, quota) {
    if (lv.type === 'review') return []
    const oldPool = CHARACTERS.filter((c) => c.unit < lv.id && (!needImage || c.emojiCode))
    if (oldPool.length < 6) return []
    return pickReviewTargets(oldPool, lv.id, quota, loadProgress().charStats).map((c) => c.char)
  },

  // 练习目标:错字优先 → 旧字 → 单元新字补足(mixTargets 保证配比/去重/至少 1 新字)
  quizTargets(lv, universe, r, needImage) {
    const quota = r.count >= 5 ? 2 : 1
    const wrong = needImage
      ? this.wrongChars.filter((ch) => CHAR_MAP[ch] && CHAR_MAP[ch].emojiCode)
      : this.wrongChars
    return mixTargets(universe.map((c) => c.char), wrong, this.oldTargets(lv, needImage, quota), r.count)
  },

  buildRound() {
    const lv = this.level
    const r = lv.rounds[this.roundIndex]
    if (r.type === 'break') return { type: 'break', props: { panda: pandaImage } }
    // 段轮(大班)只喂本段 5 字;其余轮用整单元/复习字池
    const lvChars = r.band != null
      ? byUnit(lv.id).slice(r.band * SEGMENT, (r.band + 1) * SEGMENT)
      : this.charsFor(lv)
    const pool = poolFor(lv.id, r.band)
    const opts = this.distractOpts(lv)
    const withVoice = (props) => (r.voice ? { ...props, voice: true } : props)
    switch (r.type) {
      case 'flashcard':
        return { type: r.type, props: { chars: lvChars } }
      case 'pic2char': {
        const targets = this.quizTargets(lv, imageChars(lvChars), r, true)
        return { type: r.type, props: { questions: buildQuestions(targets, pool, r.options, opts) } }
      }
      case 'sound2char': {
        const targets = this.quizTargets(lv, lvChars, r, false)
        return { type: r.type, props: { questions: buildQuestions(targets, pool, r.options, opts) } }
      }
      case 'findall':
        return {
          type: r.type,
          props: withVoice({
            grids: this.quizTargets(lv, lvChars, r, false)
              .map((t) => ({ target: CHAR_MAP[t], cells: buildFindAllGrid(t, pool, 9, 3, opts) })),
          }),
        }
      case 'match':
        return { type: r.type, props: { cards: buildMatchCards(shuffle(imageChars(lvChars)).slice(0, r.pairs)) } }
      case 'bubble':
        // 气泡目标字只用已学池;组件内部再用全字表造干扰;节奏按阶段分档(levels.STAGE_RHYTHM)
        return { type: r.type, props: withVoice({ targets: buildBubbleTargets(pool, r.target), ...STAGE_RHYTHM[lv.stage || unitStage(lv.id)] }) }
      case 'whack':
        return { type: r.type, props: withVoice({ targets: buildBubbleTargets(pool, r.target), ...STAGE_RHYTHM[lv.stage || unitStage(lv.id)] }) }
      case 'link':
        return { type: r.type, props: { cards: buildMatchCards(shuffle(imageChars(lvChars)).slice(0, r.pairs)) } }
      default:
        return { type: r.type, props: {} }
    }
  },

  // 错字回流:测验组件答错即上报目标字,跨轮累计去重(后续轮优先重现 + 关末重练)
  onWrong(e) {
    const ch = e.detail.char
    if (ch && !this.wrongChars.includes(ch)) this.wrongChars.push(ch)
  },

  // 轮切换统一入口:进入 break 轮 4s 自动继续,其余轮渲染组件
  goRound() {
    clearTimeout(this._breakTimer)
    const round = this.buildRound()
    this.setData({ round })
    if (round.type === 'break') {
      this._breakTimer = setTimeout(() => {
        this.roundIndex++
        this.goRound()
      }, 4000)
    }
  },

  // 段间过场:点击立即继续
  onBreakTap() {
    if (this.data.round.type !== 'break') return
    clearTimeout(this._breakTimer)
    this.roundIndex++
    this.goRound()
  },

  onRoundComplete(e) {
    if (!this._mini) this.mistakes += e.detail.mistakes ?? 0
    if (this.roundIndex < this.level.rounds.length - 1) {
      this.roundIndex++
      this.goRound()
    } else if (this.wrongChars.length && !this._miniDone) {
      // 关末 mini 复习轮:错字再练一次,该轮错误不计星级(零惩罚,只跑一次)
      this._miniDone = true
      this._mini = true
      this.setData({ round: this.buildMiniRound() })
    } else {
      const stars = completeLevel(this.level.id, this.mistakes, this.wrongChars)
      wx.redirectTo({ url: `/pages/reward/reward?levelId=${this.level.id}&stars=${stars}` })
    }
  },

  // 干扰策略:中班起启用音近/形近,小班 undefined=纯随机(unitStage 经 s.review 覆盖复习单元)
  distractOpts(lv) {
    return unitStage(lv.id) >= 2 ? CONF_OPTS : undefined
  },

  // mini 复习轮:错字取前 3 个听音选字,3 选项(组件照常上报 wrong,进 charStats)
  buildMiniRound() {
    return {
      type: 'sound2char',
      props: { questions: buildQuestions(this.wrongChars.slice(0, 3), poolFor(this.level.id, null), [3, 3, 3], this.distractOpts(this.level)) },
    }
  },
})
