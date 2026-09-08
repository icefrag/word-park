const { playVoice, playBgm, pauseBgm, VOICES, currentVoice, setVoice } = require('../../utils/audio')
const { pandaImage, welcomeBgImage } = require('../../utils/characters')

Page({
  data: {
    pandaImage,
    welcomeBg: welcomeBgImage,
    voices: VOICES,
    voiceKey: '',
    settingsOpen: false,
  },

  onLoad() {
    this.setData({ voiceKey: currentVoice() })
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

  // 音色设置:点选即切换,并立即用新音色试听欢迎语
  openSettings() {
    this.setData({ settingsOpen: true })
  },

  closeSettings() {
    this.setData({ settingsOpen: false })
  },

  noop() {},

  pickVoice(e) {
    const key = e.currentTarget.dataset.key
    if (key === this.data.voiceKey) return
    setVoice(key)
    this.setData({ voiceKey: key })
    playVoice('voice-welcome')
  },
})
