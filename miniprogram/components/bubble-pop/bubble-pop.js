const { playVoice, playChar, playSfx, playPraise } = require('../../utils/audio')
const { shuffle } = require('../../utils/engine')
const { CHARACTERS } = require('../../utils/characters')

Component({
  properties: {
    targets: { type: Array, value: [] }, // 目标字序列(字符串数组)
    voice: { type: Boolean, value: false }, // 语音提示模式:不显示目标字,只听音
    bubbleSpawn: { type: Number, value: 1300 }, // 出泡间隔(ms),按阶段分档传入
  },

  data: {
    bubbles: [], // [{id, char, left, dur}]
    score: 0,
    target: '', // 当前目标字(提示栏展示,可点读)
    wrongId: -1,
    starBurst: false, // 答对星星粒子开关
  },

  lifetimes: {
    attached() {
      this.ALL = CHARACTERS.map((c) => c.char)
      this.uid = 0
      this.mistakes = 0
      this.currentTarget = ''
      this.finished = false // 完成后再点中目标不再触发(防双 complete,同 whack-mole)
      this.timers = []
      this.intervals = []
      playVoice('voice-instr-bubble')
      this.timers.push(
        setTimeout(() => {
          this.newTarget()
          this.intervals.push(setInterval(() => this.spawn(), this.data.bubbleSpawn))
          this.spawn()
        }, 2200)
      )
    },
    detached() {
      this.timers.forEach(clearTimeout)
      this.intervals.forEach(clearInterval)
    },
  },

  methods: {
    speakTarget() {
      playChar(this.currentTarget)
    },

    // 显示星星粒子,700ms 后自动隐藏
    showStar() {
      this.setData({ starBurst: true })
      clearTimeout(this.starTimer)
      this.starTimer = setTimeout(() => this.setData({ starBurst: false }), 700)
      this.timers.push(this.starTimer)
    },

    newTarget() {
      this.currentTarget = this.data.targets[Math.min(this.data.score, this.data.targets.length - 1)]
      this.setData({ target: this.currentTarget })
      this.speakTarget()
    },

    spawn() {
      if (this.data.bubbles.length >= 6) return
      const char =
        Math.random() < 0.45
          ? this.currentTarget
          : shuffle(this.ALL.filter((c) => c !== this.currentTarget))[0]
      // left 范围 8%~65%:气泡宽约 35% 屏宽,再大会溢出右边缘
      const b = { id: this.uid++, char, left: 8 + Math.random() * 57, dur: 5.5 + Math.random() * 3 }
      this.setData({ bubbles: [...this.data.bubbles, b] })
      this.timers.push(
        setTimeout(() => {
          this.setData({ bubbles: this.data.bubbles.filter((x) => x.id !== b.id) })
        }, b.dur * 1000)
      )
    },

    pop(e) {
      if (this.finished) return
      const id = e.currentTarget.dataset.id
      const b = this.data.bubbles.find((x) => x.id === id)
      if (!b) return
      if (b.char === this.currentTarget) {
        playSfx('sfx-correct')
        this.setData({
          bubbles: this.data.bubbles.filter((x) => x.id !== id),
          score: this.data.score + 1,
        })
        this.showStar() // 点中目标气泡:星星粒子正反馈
        if (this.data.score >= this.data.targets.length) {
          this.finished = true
          playPraise()
          this.intervals.forEach(clearInterval)
          this.timers.push(setTimeout(() => this.triggerEvent('complete', { mistakes: this.mistakes }), 700))
        } else {
          this.newTarget()
        }
      } else {
        this.mistakes++
        this.setData({ wrongId: id })
        playSfx('sfx-wrong')
        playVoice('voice-try-again') // 答错语音提示
        this.timers.push(setTimeout(() => this.setData({ wrongId: -1 }), 500))
        if (this.data.voice) this.timers.push(setTimeout(() => this.speakTarget(), 1200))
      }
    },
  },
})
