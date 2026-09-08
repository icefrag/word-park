const { playVoice, playSfx, playPraise } = require('../../utils/audio')
const { rpx2px } = require('../../utils/layout')
const { imageOf } = require('../../utils/characters')

Component({
  properties: {
    cards: { type: Array, value: [] }, // [{key, data(字对象), kind: 'char'|'image'}]
  },

  data: {
    cells: [], // 视图模型:{key, char, kind, image, i, left, top} — 绝对定位坐标,布局不依赖任何 flex/grid
    boardW: 0,
    boardH: 0,
    cell: 0, // 单牌边长 px(随屏宽缩放封顶,行内样式使用)
    imgSize: 0,
    charFont: 0,
    backFont: 0,
    flippedMap: {}, // 已翻开卡片 index → true
    matchedMap: {}, // 已配对成功的 char → true
    matchedN: 0, // 已配对数(进度条用)
    wrongPairMap: {}, // 当前不匹配的两张牌 index → true(shake 抖动)
    hintPairMap: {}, // 提示高亮的一对牌 index → true(累错3次起)
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
      // 8 张牌 3 列排布(3+3+2),像素坐标随屏宽缩放封顶(utils/layout)
      const px = rpx2px()
      const CELL = px(170)
      const GAP = px(20)
      const COLS = 3
      const cells = this.data.cards.map((c, i) => {
        const row = Math.floor(i / COLS)
        const col = i % COLS
        return {
          key: c.key,
          char: c.data.char,
          kind: c.kind,
          image: imageOf(c.data),
          i,
          // 末行只有 2 张时整体右移半格,视觉居中
          left: col * (CELL + GAP) + (row === 2 ? (CELL + GAP) / 2 : 0),
          top: row * (CELL + GAP),
        }
      })
      this.setData({
        cells,
        boardW: 3 * CELL + 2 * GAP,
        boardH: 3 * CELL + 2 * GAP,
        cell: CELL, // 尺寸走行内 px,样式表不再写死 rpx,平板大屏不爆版
        imgSize: Math.round(CELL * 0.82),
        charFont: Math.round(CELL * 0.61),
        backFont: Math.round(CELL * 0.56),
      })
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
              matchedN: this.matchedCount,
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
            if (this.mistakes >= 3) this.showHintPair()
          }, 900)
        )
      }
    },

    // 累错3次起:翻回后短暂高亮一对未配对的字牌+图牌,降低纯碰运气的试错成本
    showHintPair() {
      const charCell = this.data.cells.find((c) => !this.data.matchedMap[c.char] && c.kind === 'char')
      if (!charCell) return
      const imgCell = this.data.cells.find((c) => c.char === charCell.char && c.kind === 'image')
      this.setData({ hintPairMap: { [charCell.i]: true, [imgCell.i]: true } })
      this.timers.push(setTimeout(() => this.setData({ hintPairMap: {} }), 1600))
    },
  },
})
