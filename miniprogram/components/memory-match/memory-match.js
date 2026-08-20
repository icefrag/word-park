const { playVoice, playSfx, playPraise } = require('../../utils/audio')
const { imageOf } = require('../../utils/characters')

Component({
  properties: {
    cards: { type: Array, value: [] }, // [{key, data(字对象), kind: 'char'|'image'}]
  },

  data: {
    cells: [], // 视图模型:{key, char, kind, image, i, left, top} — 绝对定位坐标,布局不依赖任何 flex/grid
    boardW: 0,
    boardH: 0,
    flippedMap: {}, // 已翻开卡片 index → true
    matchedMap: {}, // 已配对成功的 char → true
    wrongPairMap: {}, // 当前不匹配的两张牌 index → true(shake 抖动)
    starBurst: false, // 答对星星粒子开关
  },

  lifetimes: {
    attached() {
      this.mistakes = 0
      this.matchedCount = 0
      this.lock = false
      this.flippedCards = [] // 当前翻开的两张牌对象
      this.timers = []
      this.buildView()
      playVoice('voice-instr-match')
    },
    detached() {
      this.timers.forEach(clearTimeout)
    },
  },

  observers: {
    cards() {
      this.buildView()
    },
  },

  methods: {
    buildView() {
      // 8 张牌 2 行×4 列,坐标算死:每张 150rpx、间距 16rpx,总宽 648rpx
      const CELL = 150
      const GAP = 16
      const cells = this.data.cards.map((c, i) => {
        const row = Math.floor(i / 4)
        const col = i % 4
        return {
          key: c.key,
          char: c.data.char,
          kind: c.kind,
          image: imageOf(c.data),
          i,
          left: col * (CELL + GAP),
          top: row * (CELL + GAP),
        }
      })
      this.setData({ cells, boardW: 4 * CELL + 3 * GAP, boardH: 2 * CELL + GAP })
    },

    // 重播本界面指令语音
    speak() {
      playVoice('voice-instr-match')
    },

    // 显示星星粒子,700ms 后自动隐藏
    showStar() {
      this.setData({ starBurst: true })
      clearTimeout(this.starTimer)
      this.starTimer = setTimeout(() => this.setData({ starBurst: false }), 700)
      this.timers.push(this.starTimer)
    },

    flip(e) {
      const cell = e.currentTarget.dataset.cell
      if (this.lock || this.data.flippedMap[cell.i] || this.data.matchedMap[cell.char]) return
      playSfx('sfx-flip')
      this.flippedCards = [...this.flippedCards, cell]
      this.setData({ flippedMap: { ...this.data.flippedMap, [cell.i]: true } })
      if (this.flippedCards.length !== 2) return

      this.lock = true
      const a = this.flippedCards[0]
      const b = this.flippedCards[1]
      if (a.char === b.char && a.kind !== b.kind) {
        this.timers.push(
          setTimeout(() => {
            this.matchedCount++
            this.setData({
              matchedMap: { ...this.data.matchedMap, [a.char]: true },
              flippedMap: {},
            })
            this.flippedCards = []
            this.lock = false
            playSfx('sfx-correct')
            this.showStar() // 配对成功:星星粒子正反馈
            if (this.matchedCount === this.data.cards.length / 2) {
              playPraise()
              this.timers.push(setTimeout(() => this.triggerEvent('complete', { mistakes: this.mistakes }), 800))
            }
          }, 500)
        )
      } else {
        this.mistakes++
        this.setData({ wrongPairMap: { [a.i]: true, [b.i]: true } }) // 标记不匹配的两张牌触发抖动
        this.timers.push(
          setTimeout(() => {
            this.setData({ flippedMap: {}, wrongPairMap: {} })
            this.flippedCards = []
            this.lock = false
            playSfx('sfx-wrong')
            playVoice('voice-try-again')
          }, 900)
        )
      }
    },
  },
})
