const { LEVELS, STAGES } = require('./levels')
const { byUnit } = require('./characters')

const KEY = 'hanzi-paradise-v2'

function read() {
  try {
    // wx.getStorageSync 对不存在的 key 返回 '',等价 web 的 null
    const p = wx.getStorageSync(KEY)
    if (!p) {
      // v2 键不存在时顺手清理 v1 孤儿旧键
      try { wx.removeStorageSync('hanzi-paradise-v1') } catch (e) { /* 忽略:清理失败不影响功能 */ }
      return null
    }
    if (typeof p.unlockedLevel !== 'number' || typeof p.stars !== 'object') return null
    return p
  } catch (e) {
    return null
  }
}

function loadProgress() {
  const p = read() ?? { unlockedLevel: 1, stars: {} }
  // charStats 为学习效果版新增字段,旧档读取时补默认( spec 2026-09-08 P0-1)
  if (!p.charStats || typeof p.charStats !== 'object') p.charStats = {}
  return p
}

function saveProgress(p) {
  wx.setStorageSync(KEY, p)
}

function starsForMistakes(mistakes) {
  return mistakes <= 1 ? 3 : mistakes <= 4 ? 2 : 1
}

// 通关后解锁"关卡顺序中的下一个"(跳过数据未就绪的编号空档)
function nextUnitId(levelId) {
  const i = LEVELS.findIndex((l) => l.id === levelId)
  return LEVELS[i + 1]?.id ?? LEVELS[LEVELS.length - 1].id
}

// 通关:记星/解锁,并刷新 charStats(本单元字 + 错字的 lastUnit,错字 wrong+1)
function completeLevel(levelId, mistakes, wrongChars = []) {
  const p = loadProgress()
  const stars = starsForMistakes(mistakes)
  p.stars[levelId] = Math.max(p.stars[levelId] ?? 0, stars)
  p.unlockedLevel = Math.max(p.unlockedLevel, nextUnitId(levelId))
  for (const ch of new Set([...byUnit(levelId).map((c) => c.char), ...wrongChars])) {
    const s = p.charStats[ch] || { lastUnit: levelId, wrong: 0 }
    s.lastUnit = levelId
    if (wrongChars.includes(ch)) s.wrong += 1
    p.charStats[ch] = s
  }
  saveProgress(p)
  return stars
}

function isUnlocked(levelId) {
  return levelId <= loadProgress().unlockedLevel
}

function totalStars() {
  return Object.values(loadProgress().stars).reduce((a, b) => a + b, 0)
}

// 已认字数:已通关单元(stars 里的键)的字数之和,进度条展示用
function learnedCharCount() {
  const { stars } = loadProgress()
  return Object.keys(stars).reduce((sum, id) => sum + byUnit(Number(id)).length, 0)
}

function resetProgress() {
  saveProgress({ unlockedLevel: 1, stars: {}, charStats: {} })
}

// 阶段解锁 = 线性解锁推进到本阶段首单元(展示层派生,不落盘)
function stageUnlocked(stageId) {
  return loadProgress().unlockedLevel >= STAGES[stageId - 1].units[0]
}

// 阶段进度:只统计数据已就绪(存在于 LEVELS)的单元
function stageProgress(stageId) {
  const s = STAGES[stageId - 1]
  const ids = [...s.units, s.review].filter((u) => LEVELS.some((l) => l.id === u))
  const { stars } = loadProgress()
  return { done: ids.filter((u) => stars[u]).length, total: ids.length }
}

module.exports = {
  loadProgress, saveProgress, starsForMistakes, completeLevel, isUnlocked,
  totalStars, learnedCharCount, resetProgress, stageUnlocked, stageProgress,
}
