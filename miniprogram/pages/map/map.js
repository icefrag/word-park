const { LEVELS } = require('../../utils/levels')
const { CHARACTERS } = require('../../utils/characters')
const { loadProgress, resetProgress, learnedCharCount, isUnlocked } = require('../../utils/progress')
const { playVoice } = require('../../utils/audio')

Page({
  data: {
    units: [],
    total: CHARACTERS.length,
    learned: 0,
    learnedPct: 0,
  },

  onLoad() {
    playVoice('voice-lets-learn')
  },

  // 从 reward 返回时刷新星级/进度(map 页面常驻栈中,onLoad 不会再触发)
  onShow() {
    this.refresh()
  },

  refresh() {
    const progress = loadProgress()
    const units = LEVELS.map((lv) => ({
      id: lv.id,
      theme: lv.theme,
      stars: progress.stars[lv.id] ?? 0,
      locked: !isUnlocked(lv.id),
      green: lv.id % 2 === 0,
    }))
    const learned = learnedCharCount()
    this.setData({ units, learned, learnedPct: (learned / CHARACTERS.length) * 100 })
  },

  // 重播本界面指令语音
  speak() {
    playVoice('voice-lets-learn')
  },

  play(e) {
    wx.navigateTo({ url: `/pages/play/play?levelId=${e.currentTarget.dataset.id}` })
  },

  onReset() {
    resetProgress()
    this.refresh()
  },
})
