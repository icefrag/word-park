const { playVoice, playBgm, pauseBgm } = require('../../utils/audio')
const { pandaImage, welcomeBgImage } = require('../../utils/characters')

Page({
  data: {
    pandaImage,
    welcomeBg: welcomeBgImage,
  },

  onLoad() {
    playVoice('voice-welcome')
  },

  onShow() {
    playBgm()
  },

  onHide() {
    pauseBgm()
  },

  // 重播本界面欢迎语音
  speak() {
    playVoice('voice-welcome')
  },

  start() {
    wx.navigateTo({ url: '/pages/map/map' })
  },
})
