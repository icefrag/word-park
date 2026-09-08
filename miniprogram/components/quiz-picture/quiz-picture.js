const { playVoice, playChar, playSfx, playPraise } = require('../../utils/audio')
const { imageOf } = require('../../utils/characters')
const { nextDimPick } = require('../../utils/engine')

Component({
  properties: {
    questions: { type: Array, value: [] }, // [{target, options: [char,...]}]
  },

  data: {
    qi: 0,
    wrongPick: '',
    done: false,
    starBurst: false, // 答对星星粒子开关
    image: '',
    dimMap: {}, // 已排除的干扰项 char → true(错3次起)
    glowPick: '', // 高亮引导的正确项 char(错4次起)
  },

  lifetimes: {
    attached() {
      this.mistakes = 0
      this.wrongCount = 0
      this.timers = []
      this.updateImage()
      playVoice('voice-instr-pic2char')
    },
    detached() {
      this.timers.forEach(clearTimeout)
    },
  },

  observers: {
    qi() {
      this.updateImage()
    },
  },

  methods: {
    updateImage() {
      const q = this.data.questions[this.data.qi]
      this.setData({ image: q ? imageOf({ char: q.target }) : '' })
    },

    // 显示星星粒子,700ms 后自动隐藏
    showStar() {
      this.setData({ starBurst: true })
      clearTimeout(this.starTimer)
      this.starTimer = setTimeout(() => this.setData({ starBurst: false }), 700)
      this.timers.push(this.starTimer)
    },

    repeat() {
      if (!this.data.done) playVoice('voice-instr-pic2char')
    },

    pick(e) {
      if (this.data.done) return
      const ch = e.currentTarget.dataset.ch
      const q = this.data.questions[this.data.qi]
      if (ch === q.target) {
        playSfx('sfx-correct')
        const last = this.data.qi >= this.data.questions.length - 1
        if (last) playPraise() // 夸奖语音只在整轮完成时播(与其余玩法一致,防夸奖通胀)
        this.setData({ done: true })
        this.showStar() // 答对:星星粒子正反馈
        this.timers.push(
          setTimeout(() => {
            if (!last) {
              this.wrongCount = 0
              this.setData({ qi: this.data.qi + 1, done: false, dimMap: {}, glowPick: '' })
            } else {
              this.triggerEvent('complete', { mistakes: this.mistakes })
            }
          }, 700)
        )
      } else {
        this.mistakes++
        this.wrongCount++
        this.setData({ wrongPick: ch })
        playSfx('sfx-wrong')
        playVoice('voice-try-again')
        this.timers.push(setTimeout(() => this.setData({ wrongPick: '' }), 500))
        this.applyHint()
      }
    },

    // 渐进提示阶梯:错2次自动重听目标音,错3次排除一个干扰项,错4次起高亮正确项
    applyHint() {
      const q = this.data.questions[this.data.qi]
      if (this.wrongCount === 2) {
        // 1400ms 等「再试一次」语音播完再重听,避免叠音
        this.timers.push(setTimeout(() => playChar(q.target), 1400))
      } else if (this.wrongCount === 3) {
        const dim = nextDimPick(q.options, q.target, this.data.dimMap)
        if (dim) this.setData({ dimMap: { ...this.data.dimMap, [dim]: true } })
      } else if (this.wrongCount >= 4) {
        this.setData({ glowPick: q.target })
      }
    },
  },
})
