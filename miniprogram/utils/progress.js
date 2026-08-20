const { LEVELS } = require('./levels')
const { byUnit } = require('./characters')

const KEY = 'hanzi-paradise-v1'

function read() {
  try {
    // wx.getStorageSync 对不存在的 key 返回 '',等价 web 的 null
    const p = wx.getStorageSync(KEY)
    if (!p) return null
    if (typeof p.unlockedLevel !== 'number' || typeof p.stars !== 'object') return null
    return p
  } catch (e) {
    return null
  }
}

function loadProgress() {
  return read() ?? { unlockedLevel: 1, stars: {} }
}

function saveProgress(p) {
  wx.setStorageSync(KEY, p)
}

function starsForMistakes(mistakes) {
  return mistakes <= 1 ? 3 : mistakes <= 4 ? 2 : 1
}

function completeLevel(levelId, mistakes) {
  const p = loadProgress()
  const stars = starsForMistakes(mistakes)
  p.stars[levelId] = Math.max(p.stars[levelId] ?? 0, stars)
  // 解锁上限动态等于 LEVELS 数量,不再硬编码 5
  p.unlockedLevel = Math.max(p.unlockedLevel, Math.min(levelId + 1, LEVELS.length))
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
  saveProgress({ unlockedLevel: 1, stars: {} })
}

module.exports = {
  loadProgress,
  saveProgress,
  starsForMistakes,
  completeLevel,
  isUnlocked,
  totalStars,
  learnedCharCount,
  resetProgress,
}
