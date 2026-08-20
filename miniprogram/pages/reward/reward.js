const { LEVELS } = require('../../utils/levels')
const { playVoice, playSfx } = require('../../utils/audio')
const { pandaImage } = require('../../utils/characters')

const CONFETTI_COLORS = ['#ff6b81', '#ffd54f', '#7ed957', '#4dabf7', '#b197fc']

Page({
  data: {
    stars: 0,
    theme: '',
    pandaImage,
    confetti: [],
  },

  onLoad(query) {
    const level = LEVELS.find((l) => l.id === Number(query.levelId))
    const confetti = Array.from({ length: 40 }, (_, i) => ({
      left: Math.random() * 100,
      delay: Math.random() * 1.5,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    }))
    this.setData({ stars: Number(query.stars) || 1, theme: level?.theme ?? '', confetti })

    playSfx('sfx-win')
    playVoice('voice-level-complete')
  },

  // 重播本界面过关语音
  speak() {
    playVoice('voice-level-complete')
  },

  back() {
    wx.navigateBack()
  },
})
