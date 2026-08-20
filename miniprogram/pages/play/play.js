const { LEVELS } = require('../../utils/levels')
const { CHARACTERS, byUnit } = require('../../utils/characters')
const {
  buildQuestions,
  buildFindAllGrid,
  buildMatchCards,
  buildBubbleTargets,
  shuffle,
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

  // 干扰项只用已学过的字(旧字 unit 与 level 同值,新字只有 unit)
  poolFor(lv) {
    return CHARACTERS.filter((c) => (c.unit ?? c.level) <= lv.id).map((c) => c.char)
  },

  buildRound() {
    const lv = this.level
    const lvChars = byUnit(lv.id)
    const pool = this.poolFor(lv)
    const r = lv.rounds[this.roundIndex]
    switch (r.type) {
      case 'flashcard':
        return { type: r.type, props: { chars: lvChars } }
      case 'pic2char':
      case 'sound2char': {
        const targets = shuffle(lvChars.map((c) => c.char)).slice(0, r.count)
        return { type: r.type, props: { questions: buildQuestions(targets, pool, r.options) } }
      }
      case 'findall':
        return {
          type: r.type,
          props: {
            grids: shuffle(lvChars)
              .slice(0, r.count)
              .map((c) => ({ target: c, cells: buildFindAllGrid(c.char, pool, 9, 3) })),
          },
        }
      case 'match':
        return { type: r.type, props: { cards: buildMatchCards(shuffle(lvChars).slice(0, r.pairs)) } }
      case 'bubble':
        return { type: r.type, props: { targets: buildBubbleTargets(CHARACTERS.map((c) => c.char), r.target) } }
      case 'whack':
        // 打地鼠:目标字从已学池抽取,组件内部再用全字表造干扰
        return { type: r.type, props: { targets: buildBubbleTargets(pool, r.target) } }
      case 'link':
        // 连连看:本单元字抽 pairs 对,生成字牌+图牌
        return { type: r.type, props: { cards: buildMatchCards(shuffle(lvChars).slice(0, r.pairs)) } }
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
