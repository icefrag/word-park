const { playVoice, playSfx, playPraise } = require('../../utils/audio')
const { imageOf } = require('../../utils/characters')

Component({
  properties: {
    cards: { type: Array, value: [] }, // [{key, data(字对象), kind: 'char'|'image'}]
  },

  data: {
    charCards: [], // 左列字牌视图模型 {key, char}
    imgCards: [], // 右列图牌视图模型 {key, char, image}
    selected: '', // 当前选中的字牌 key
    matchedMap: {}, // 已配对成功的 char → true(WXML 渲染用,不支持 indexOf)
    wrongPairMap: {}, // 当前错配的两张牌 key → true(shake 抖动)
    starBurst: false, // 答对星星粒子开关
  },

  lifetimes: {
    attached() {
      this.mistakes = 0
      this.matchedCount = 0
      this.timers = []
      this.buildView()
      playVoice('voice-instr-link')
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
    // 左列字牌、右列图牌(引擎 buildMatchCards 已整体打乱,按 kind 分列保持原顺序)
    buildView() {
      const cards = this.data.cards
      this.setData({
        charCards: cards.filter((c) => c.kind === 'char').map((c) => ({ key: c.key, char: c.data.char })),
        imgCards: cards
          .filter((c) => c.kind === 'image')
          .map((c) => ({ key: c.key, char: c.data.char, image: imageOf(c.data) })),
      })
    },

    // 重播本界面指令语音
    speak() {
      playVoice('voice-instr-link')
    },

    // 显示星星粒子,700ms 后自动隐藏
    showStar() {
      this.setData({ starBurst: true })
      clearTimeout(this.starTimer)
      this.starTimer = setTimeout(() => this.setData({ starBurst: false }), 700)
      this.timers.push(this.starTimer)
    },

    // 错配两牌抖动 500ms 后清除标记(不锁定,可立即重选)
    shakePair(keys) {
      const map = {}
      keys.forEach((k) => (map[k] = true))
      this.setData({ wrongPairMap: map })
      clearTimeout(this.wrongTimer)
      this.wrongTimer = setTimeout(() => this.setData({ wrongPairMap: {} }), 500)
      this.timers.push(this.wrongTimer)
    },

    // 点击字牌:选中(已选另一字牌则换选)
    pickChar(e) {
      const card = e.currentTarget.dataset.card
      if (this.data.matchedMap[card.char]) return
      this.setData({ selected: card.key })
    },

    // 点击图牌:无字牌选中时忽略;有选中则判定同字配对
    pickImage(e) {
      const card = e.currentTarget.dataset.card
      if (this.data.matchedMap[card.char] || this.data.selected === '') return
      const picked = this.data.charCards.find((c) => c.key === this.data.selected)
      if (picked.char === card.char) {
        this.matchedCount++
        this.setData({ matchedMap: { ...this.data.matchedMap, [card.char]: true }, selected: '' })
        playSfx('sfx-correct')
        this.showStar() // 配对成功:星星粒子正反馈
        if (this.matchedCount === this.data.charCards.length) {
          playPraise()
          this.timers.push(setTimeout(() => this.triggerEvent('complete', { mistakes: this.mistakes }), 800))
        }
      } else {
        this.mistakes++
        this.shakePair([this.data.selected, card.key])
        this.setData({ selected: '' })
        playSfx('sfx-wrong')
        playVoice('voice-try-again')
      }
    },
  },
})
