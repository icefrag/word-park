const { playVoice, playBgm, pauseBgm } = require('../../utils/audio')
const { pandaImage, welcomeBgImage } = require('../../utils/characters')

Page({
  data: {
    pandaImage: pandaImage(),
    welcomeBg: welcomeBgImage(),
  },

  onLoad() {
    playVoice('voice-welcome')
  },

  onShow() {
    // 素材版本可能已被云端更新,重新取一次 URL(见 utils/asset-version.js)
    this.setData({ pandaImage: pandaImage(), welcomeBg: welcomeBgImage() })
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
