const { LEVELS, STAGES } = require('../../utils/levels')
const { CHARACTERS } = require('../../utils/characters')
const {
  loadProgress, resetProgress, learnedCharCount, isUnlocked, stageUnlocked, stageProgress,
} = require('../../utils/progress')
const { playVoice, playBgm, pauseBgm, VOICES, currentVoice, setVoice } = require('../../utils/audio')

Page({
  data: {
    stages: [],
    activeStage: 1,
    total: CHARACTERS.length,
    learned: 0,
    learnedPct: 0,
    shakeId: 0, // 锁定单元摇头反馈:正在抖动的单元 id
    shakeStage: 0, // 锁定页签摇头反馈:正在抖动的阶段 id
    resetArming: false, // 重置按钮长按充能中(填充动画开关)
    voices: VOICES,
    voiceKey: '',
    settingsOpen: false,
  },

  onLoad() {
    this.setData({ voiceKey: currentVoice() })
    playVoice('voice-lets-learn')
  },

  // 音色设置:点选即切换,并立即用新音色试听本页问候语
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
    playVoice('voice-lets-learn')
  },

  // 从 reward 返回时刷新星级/进度(map 页面常驻栈中,onLoad 不会再触发)
  onShow() {
    playBgm()
    this.refresh()
  },

  onHide() {
    pauseBgm()
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
      this.setData({ shakeStage: id })
      clearTimeout(this.shakeStageTimer)
      this.shakeStageTimer = setTimeout(() => this.setData({ shakeStage: 0 }), 500)
      return
    }
    this.setData({ activeStage: id })
  },

  play(e) {
    const { id, locked } = e.currentTarget.dataset
    if (locked) {
      // 锁定单元不再静默:摇头 + toast(儿童向语音提示属后续素材)
      wx.showToast({ title: '先通过前面的关卡哦', icon: 'none' })
      this.setData({ shakeId: id })
      clearTimeout(this.shakeTimer)
      this.shakeTimer = setTimeout(() => this.setData({ shakeId: 0 }), 500)
      return
    }
    wx.navigateTo({ url: `/pages/play/play?levelId=${id}` })
  },

  // 重置防误触:点按只提示长按手势,按住 2 秒填充动画走完才真正清档
  onResetTap() {
    if (this._resetDone) {
      this._resetDone = false // 长按完成后的松手触发 tap,不再弹提示
      return
    }
    wx.showToast({ title: '长按2秒重置全部进度', icon: 'none' })
  },
  onResetStart() {
    this.setData({ resetArming: true })
    this._resetTimer = setTimeout(() => this.doReset(), 2000)
  },
  onResetEnd() {
    clearTimeout(this._resetTimer)
    this.setData({ resetArming: false })
  },
  doReset() {
    this._resetDone = true
    this.setData({ resetArming: false })
    resetProgress()
    this.refresh()
    wx.showToast({ title: '进度已重置', icon: 'none' })
  },
})
