const { playVoice, playSfx, playPraise } = require('../../utils/audio')
const { imageOf } = require('../../utils/characters')

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
  },

  lifetimes: {
    attached() {
      this.mistakes = 0
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
        playPraise()
        this.setData({ done: true })
        this.showStar() // 答对:星星粒子正反馈
        this.timers.push(
          setTimeout(() => {
            if (this.data.qi < this.data.questions.length - 1) {
              this.setData({ qi: this.data.qi + 1, done: false })
            } else {
              this.triggerEvent('complete', { mistakes: this.mistakes })
            }
          }, 600)
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
