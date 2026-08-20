const { playVoice, playSfx, playPraise } = require('../../utils/audio')
const { imageOf } = require('../../utils/characters')

Component({
  properties: {
    cards: { type: Array, value: [] }, // [{key, data(字对象), kind: 'char'|'image'}]
  },

  data: {
    view: [], // 视图模型:{key, char, kind, image} — WXML 不能调函数,图片地址预计算
    flipped: [], // 已翻开卡片的 index(逻辑判断用)
    flippedMap: {}, // 同上 → true(WXML 渲染用,不支持 indexOf)
    matchedMap: {}, // 已配对成功的 char → true
    wrongPairMap: {}, // 当前不匹配的两张牌 index → true(shake 抖动)
    starBurst: false, // 答对星星粒子开关
  },

  lifetimes: {
    attached() {
      this.mistakes = 0
      this.matchedCount = 0
      this.lock = false
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
      this.setData({
        view: this.data.cards.map((c) => ({
          key: c.key,
          char: c.data.char,
          kind: c.kind,
          image: imageOf(c.data),
        })),
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
      const i = e.currentTarget.dataset.i
      if (this.lock || this.data.flippedMap[i] || this.data.matchedMap[this.data.view[i].char]) return
      playSfx('sfx-flip')
      const flipped = [...this.data.flipped, i]
      this.setData({ flipped, flippedMap: { ...this.data.flippedMap, [i]: true } })
      if (flipped.length !== 2) return

      this.lock = true
      const a = this.data.view[flipped[0]]
      const b = this.data.view[flipped[1]]
      if (a.char === b.char && a.kind !== b.kind) {
        this.timers.push(
          setTimeout(() => {
            this.matchedCount++
            this.setData({
              matchedMap: { ...this.data.matchedMap, [a.char]: true },
              flipped: [],
              flippedMap: {},
            })
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
        const wrongPairMap = {}
        flipped.forEach((k) => (wrongPairMap[k] = true))
        this.setData({ wrongPairMap }) // 标记不匹配的两张牌触发抖动
        this.timers.push(
          setTimeout(() => {
            this.setData({ flipped: [], flippedMap: {}, wrongPairMap: {} })
            this.lock = false
            playSfx('sfx-wrong')
            playVoice('voice-try-again')
          }, 900)
        )
      }
    },
  },
})
