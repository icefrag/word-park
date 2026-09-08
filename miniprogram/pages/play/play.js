const { LEVELS } = require('../../utils/levels')
const { CHARACTERS, byUnit, byStage } = require('../../utils/characters')
const {
  buildQuestions, buildFindAllGrid, buildMatchCards, buildBubbleTargets, shuffle, imageChars,
  pickReviewTargets, mixTargets,
} = require('../../utils/engine')
const { completeLevel, loadProgress } = require('../../utils/progress')

const CHAR_MAP = Object.fromEntries(CHARACTERS.map((c) => [c.char, c]))

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
    this.setData({ round: this.buildRound() })
  },

  // 干扰项只用已学过的字(unit 即学习顺序)
  poolFor(lv) {
    return CHARACTERS.filter((c) => c.unit <= lv.id).map((c) => c.char)
  },

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
      : [...this.wrongChars]
    return mixTargets(universe.map((c) => c.char), wrong, this.oldTargets(lv, needImage, quota), r.count)
  },

  buildRound() {
    const lv = this.level
    const lvChars = this.charsFor(lv)
    const pool = this.poolFor(lv)
    const r = lv.rounds[this.roundIndex]
    const withVoice = (props) => (r.voice ? { ...props, voice: true } : props)
    switch (r.type) {
      case 'flashcard':
        return { type: r.type, props: { chars: lvChars } }
      case 'pic2char': {
        const targets = this.quizTargets(lv, imageChars(lvChars), r, true)
        return { type: r.type, props: { questions: buildQuestions(targets, pool, r.options) } }
      }
      case 'sound2char': {
        const targets = this.quizTargets(lv, lvChars, r, false)
        return { type: r.type, props: { questions: buildQuestions(targets, pool, r.options) } }
      }
      case 'findall':
        return {
          type: r.type,
          props: withVoice({
            grids: this.quizTargets(lv, lvChars, r, false)
              .map((t) => ({ target: CHAR_MAP[t], cells: buildFindAllGrid(t, pool, 9, 3) })),
          }),
        }
      case 'match':
        return { type: r.type, props: { cards: buildMatchCards(shuffle(imageChars(lvChars)).slice(0, r.pairs)) } }
      case 'bubble':
        // 气泡目标字只用已学池;组件内部再用全字表造干扰
        return { type: r.type, props: withVoice({ targets: buildBubbleTargets(pool, r.target) }) }
      case 'whack':
        return { type: r.type, props: withVoice({ targets: buildBubbleTargets(pool, r.target) }) }
      case 'link':
        return { type: r.type, props: { cards: buildMatchCards(shuffle(imageChars(lvChars)).slice(0, r.pairs)) } }
      default:
        return { type: r.type, props: {} }
    }
  },

  onRoundComplete(e) {
    this.mistakes += e.detail.mistakes ?? 0
    if (this.roundIndex < this.level.rounds.length - 1) {
      this.roundIndex++
      this.setData({ round: this.buildRound() })
    } else {
      const stars = completeLevel(this.level.id, this.mistakes)
      wx.redirectTo({ url: `/pages/reward/reward?levelId=${this.level.id}&stars=${stars}` })
    }
  },
})
