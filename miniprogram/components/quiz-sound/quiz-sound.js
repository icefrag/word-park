const { playVoice, playChar, playSfx, playPraise } = require('../../utils/audio')

Component({
  properties: {
    questions: { type: Array, value: [] },
  },

  data: {
    qi: 0,
    wrongPick: '',
    done: false,
    starBurst: false, // 答对星星粒子开关
  },

  lifetimes: {
    attached() {
      this.mistakes = 0
      this.timers = []
      playVoice('voice-instr-sound2char')
      this.timers.push(setTimeout(() => this.playTarget(), 1800))
    },
    detached() {
      this.timers.forEach(clearTimeout)
    },
  },

  methods: {
    playTarget() {
      playChar(this.data.questions[this.data.qi].target)
    },

    // 显示星星粒子,700ms 后自动隐藏
    showStar() {
      this.setData({ starBurst: true })
      clearTimeout(this.starTimer)
      this.starTimer = setTimeout(() => this.setData({ starBurst: false }), 700)
      this.timers.push(this.starTimer)
    },

    pick(e) {
      if (this.data.done) return
      const ch = e.currentTarget.dataset.ch
      const q = this.data.questions[this.data.qi]
      if (ch === q.target) {
        playSfx('sfx-correct')
        playPraise()
        this.setData({ done: true })
        this.showStar() // 答对:星星粒子正反馈
        this.timers.push(
          setTimeout(() => {
            if (this.data.qi < this.data.questions.length - 1) {
              this.setData({ qi: this.data.qi + 1, done: false })
              this.timers.push(setTimeout(() => this.playTarget(), 600))
            } else {
              this.triggerEvent('complete', { mistakes: this.mistakes })
            }
          }, 800)
        )
      } else {
        this.mistakes++
        this.setData({ wrongPick: ch })
        playSfx('sfx-wrong')
        playVoice('voice-try-again')
        this.timers.push(setTimeout(() => this.setData({ wrongPick: '' }), 500))
      }
    },
  },
})
