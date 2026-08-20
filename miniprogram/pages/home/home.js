const { playVoice } = require('../../utils/audio')
const { pandaImage } = require('../../utils/characters')

Page({
  data: {
    pandaImage,
  },

  onLoad() {
    playVoice('voice-welcome')
  },

  // 重播本界面欢迎语音
  speak() {
    playVoice('voice-welcome')
  },

  start() {
    wx.navigateTo({ url: '/pages/map/map' })
  },
})
