const { playVoice, playChar, playSfx, playPraise } = require('../../utils/audio')
const { shuffle } = require('../../utils/engine')
const { CHARACTERS } = require('../../utils/characters')

const HOLE_COUNT = 9 // 3x3 九宫格地洞
const MOLE_LIFETIME = 1300 // 地鼠冒头停留时长(ms)
const SPAWN_INTERVAL = 1000 // 地鼠出洞间隔(ms)

Component({
  properties: {
    targets: { type: Array, value: [] }, // 目标字序列(字符串数组)
  },

  data: {
    moles: Array(HOLE_COUNT).fill(null), // 每洞地鼠 {char} 或 null
    score: 0,
    wrongIndex: -1, // 敲错的洞索引(晃动反馈)
    hammerIndex: -1, // 锤子敲击的洞索引
    starBurst: false, // 答对星星粒子开关
  },

  lifetimes: {
    attached() {
      this.ALL = CHARACTERS.map((c) => c.char)
      this.mistakes = 0
      this.currentTarget = ''
      this.finished = false
      this.timers = []
      this.intervals = []
      this.moleTimers = Array(HOLE_COUNT).fill(null)
      playVoice('voice-instr-whack')
      this.timers.push(
        setTimeout(() => {
          this.newTarget()
          this.intervals.push(setInterval(() => this.spawn(), SPAWN_INTERVAL))
          this.spawn()
        }, 2200)
      )
    },
    detached() {
      this.timers.forEach(clearTimeout)
      this.intervals.forEach(clearInterval)
      this.moleTimers.forEach(clearTimeout)
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

    // 在被敲的洞口播放锤子敲击动画,600ms 后消失
    showHammer(i) {
      this.setData({ hammerIndex: i })
      clearTimeout(this.hammerTimer)
      this.hammerTimer = setTimeout(() => this.setData({ hammerIndex: -1 }), 600)
      this.timers.push(this.hammerTimer)
    },

    newTarget() {
      this.currentTarget = this.data.targets[Math.min(this.data.score, this.data.targets.length - 1)]
      this.speakTarget()
    },

    spawn() {
      const empty = []
      this.data.moles.forEach((m, i) => {
        if (!m) empty.push(i)
      })
      if (empty.length === 0) return
      const i = empty[Math.floor(Math.random() * empty.length)] // 随机选一个空洞
      const char =
        Math.random() < 0.45
          ? this.currentTarget
          : shuffle(this.ALL.filter((c) => c !== this.currentTarget))[0] // 45% 目标字,其余干扰字
      const moles = [...this.data.moles]
      moles[i] = { char }
      this.setData({ moles })
      // 地鼠 1.3s 后自动缩回
      clearTimeout(this.moleTimers[i])
      this.moleTimers[i] = setTimeout(() => {
        const next = [...this.data.moles]
        next[i] = null
        this.setData({ moles: next })
      }, MOLE_LIFETIME)
    },

    whack(e) {
      if (this.finished) return
      const i = e.currentTarget.dataset.i
      const m = this.data.moles[i]
      if (!m) return
      if (m.char === this.currentTarget) {
        playSfx('sfx-correct')
        clearTimeout(this.moleTimers[i])
        const moles = [...this.data.moles]
        moles[i] = null // 敲中立即缩回
        this.setData({ moles, score: this.data.score + 1 })
        this.showHammer(i) // 锤子敲击动画
        this.showStar() // 敲中目标:星星粒子正反馈
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
        this.setData({ wrongIndex: i })
        playSfx('sfx-wrong')
        playVoice('voice-try-again') // 敲错鼓励语音,零惩罚
        clearTimeout(this.wrongTimer)
        this.wrongTimer = setTimeout(() => this.setData({ wrongIndex: -1 }), 500)
        this.timers.push(this.wrongTimer)
      }
    },
  },
})
