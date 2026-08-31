const { LEVELS, STAGES } = require('../../utils/levels')
const { CHARACTERS } = require('../../utils/characters')
const {
  loadProgress, resetProgress, learnedCharCount, isUnlocked, stageUnlocked, stageProgress,
} = require('../../utils/progress')
const { playVoice } = require('../../utils/audio')

Page({
  data: {
    stages: [],
    activeStage: 1,
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
    const levelIds = new Set(LEVELS.map((l) => l.id))
    const stages = STAGES.map((s) => {
      const units = [...s.units, s.review]
        .filter((id) => levelIds.has(id))
        .map((id) => {
          const lv = LEVELS.find((l) => l.id === id)
          return {
            id,
            theme: lv.theme,
            review: lv.type === 'review',
            stars: progress.stars[id] ?? 0,
            locked: !isUnlocked(id),
            green: id % 2 === 0,
          }
        })
      const prog = stageProgress(s.id)
      return {
        id: s.id, name: s.name, subtitle: s.subtitle, age: s.age,
        unlocked: stageUnlocked(s.id), done: prog.done, total: prog.total,
        pct: prog.total ? (prog.done / prog.total) * 100 : 0,
        units,
      }
    })
    // 默认停在"第一个未通关单元"所在阶段
    const active = (LEVELS.find((l) => !progress.stars[l.id]) ?? LEVELS[LEVELS.length - 1]).id
    const activeStage = STAGES.find((s) => s.units.includes(active) || s.review === active).id
    const learned = learnedCharCount()
    this.setData({ stages, activeStage, learned, learnedPct: (learned / CHARACTERS.length) * 100 })
  },

  // 重播本界面指令语音
  speak() {
    playVoice('voice-lets-learn')
  },

  switchStage(e) {
    const id = Number(e.currentTarget.dataset.id)
    if (!stageUnlocked(id)) {
      wx.showToast({ title: '通关上一阶段后解锁', icon: 'none' })
      return
    }
    this.setData({ activeStage: id })
  },

  play(e) {
    wx.navigateTo({ url: `/pages/play/play?levelId=${e.currentTarget.dataset.id}` })
  },

  onReset() {
    resetProgress()
    this.refresh()
  },
})
