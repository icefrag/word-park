const { playVoice } = require('../../utils/audio')
const { imageOf } = require('../../utils/characters')

Component({
  properties: {
    chars: { type: Array, value: [] }, // 本单元字对象数组
  },

  data: {
    idx: 0,
    showCard: true, // 切字时先隐藏再显示,重新触发 pop 动画
    image: '',
  },

  lifetimes: {
    attached() {
      this.updateImage()
      playVoice(`${this.data.chars[0].char}-word`)
    },
  },

  observers: {
    idx() {
      this.updateImage()
    },
  },

  methods: {
    updateImage() {
      const c = this.data.chars[this.data.idx]
      this.setData({ image: c ? imageOf(c) : '' })
    },

    current() {
      return this.data.chars[this.data.idx]
    },

    speak() {
      playVoice(`${this.current().char}-word`)
    },

    next() {
      if (this.data.idx < this.data.chars.length - 1) {
        // 先隐藏卡片,下一帧换字再显示,重新触发 pop 入场动画
        this.setData({ showCard: false })
        setTimeout(() => {
          this.setData({ idx: this.data.idx + 1, showCard: true })
          this.speak()
        }, 30)
      } else {
        this.triggerEvent('complete', { mistakes: 0 })
      }
    },
  },
})
