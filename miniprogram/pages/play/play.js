const { LEVELS } = require('../../utils/levels')
const { CHARACTERS, byUnit, byStage } = require('../../utils/characters')
const {
  buildQuestions, buildFindAllGrid, buildMatchCards, buildBubbleTargets, shuffle, imageChars,
} = require('../../utils/engine')
const { completeLevel } = require('../../utils/progress')

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
    this.setData({ round: this.buildRound() })
  },

  // 干扰项只用已学过的字(unit 即学习顺序)
  poolFor(lv) {
    return CHARACTERS.filter((c) => c.unit <= lv.id).map((c) => c.char)
  },

  // 复习单元:本阶段已学字随机抽样并缓存(切轮不重抽,轮间字池稳定)
  charsFor(lv) {
    if (lv.type !== 'review') return byUnit(lv.id)
    if (!this._reviewPool) this._reviewPool = shuffle(byStage(lv.stage)).slice(0, 12)
    return this._reviewPool
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
        const targets = shuffle(imageChars(lvChars).map((c) => c.char)).slice(0, r.count)
        return { type: r.type, props: { questions: buildQuestions(targets, pool, r.options) } }
      }
      case 'sound2char': {
        const targets = shuffle(lvChars.map((c) => c.char)).slice(0, r.count)
        return { type: r.type, props: { questions: buildQuestions(targets, pool, r.options) } }
      }
      case 'findall':
        return {
          type: r.type,
          props: withVoice({
            grids: shuffle(lvChars)
              .slice(0, r.count)
              .map((c) => ({ target: c, cells: buildFindAllGrid(c.char, pool, 9, 3) })),
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
