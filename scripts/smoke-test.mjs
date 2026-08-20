// 逻辑层冒烟测试:mock wx 后直接 require 小程序 utils,验证数据/出题/进度/音频 URL 全链
// 用法: node scripts/smoke-test.mjs
import { createRequire } from 'node:module'
import { existsSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const require = createRequire(join(__dirname, '../miniprogram/utils/__smoke__.js'))

// --- mock wx ---
const store = new Map()
globalThis.wx = {
  getStorageSync: (k) => (store.has(k) ? store.get(k) : ''),
  setStorageSync: (k, v) => store.set(k, v),
  _audioCount: 0,
  createInnerAudioContext: () => {
    globalThis.wx._audioCount++
    return { stop() {}, play() {}, set src(v) {}, obeyMuteSwitch: true }
  },
}

let failed = 0
const check = (name, cond) => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`)
  if (!cond) failed++
}

// --- characters ---
const { CHARACTERS, TOTAL_UNITS, imageOf, byUnit, assetName } = require('./characters')
check('100 字', CHARACTERS.length === 100)
check('17 个单元', TOTAL_UNITS === 17 && byUnit(17).length === 7)
check('字不重复', new Set(CHARACTERS.map((c) => c.char)).size === 100)
check('每字都有图', CHARACTERS.every((c) => existsSync(join(__dirname, '../miniprogram', imageOf(c)))))

// --- levels ---
const { LEVELS } = require('./levels')
check('17 个关卡', LEVELS.length === 17)
check('每关 flashcard 开头', LEVELS.every((l) => l.rounds[0].type === 'flashcard'))
check('玩法类型合法', LEVELS.every((l) =>
  l.rounds.every((r) => ['flashcard', 'pic2char', 'sound2char', 'findall', 'match', 'bubble', 'whack', 'link'].includes(r.type))
))

// --- engine ---
const { buildQuestions, buildFindAllGrid, buildMatchCards, buildBubbleTargets, makeOptions } = require('./engine')
const pool = CHARACTERS.map((c) => c.char)
const qs = buildQuestions(['日', '月'], pool, [2, 3])
check('出题:题数', qs.length === 2)
check('出题:选项数按序列', qs[0].options.length === 2 && qs[1].options.length === 3)
check('出题:目标在选项中', qs.every((q) => q.options.includes(q.target)))
const grid = buildFindAllGrid('火', pool, 9, 3)
check('找一找:9 格含 3 个目标', grid.length === 9 && grid.filter((c) => c === '火').length === 3)
const cards = buildMatchCards(byUnit(4).slice(0, 4))
check('配对:8 张含字牌图牌', cards.length === 8 &&
  cards.filter((c) => c.kind === 'char').length === 4)
const targets = buildBubbleTargets(pool, 8)
check('目标序列长度', targets.length === 8)

// --- progress ---
const { completeLevel, isUnlocked, learnedCharCount, resetProgress, starsForMistakes } = require('./progress')
resetProgress()
check('初始仅解锁第 1 关', isUnlocked(1) && !isUnlocked(2))
const s3 = completeLevel(1, 0)
check('3 星规则', starsForMistakes(0) === 3 && starsForMistakes(3) === 2 && starsForMistakes(9) === 1)
check('通关解锁下一关', isUnlocked(2) && s3 === 3)
completeLevel(2, 2)
check('已认字数 = 单元1(5)+单元2(5)', learnedCharCount() === 10)
completeLevel(17, 0)
check('最后一关不解锁第 18 关', !isUnlocked(18))
resetProgress()
check('重置回到起点', !isUnlocked(2))

// --- audio ---
const { fileUrl } = require('./audio')
const audioDir = join(__dirname, '../miniprogram/assets/audio')
const audioFiles = new Set(readdirSync(audioDir))
const names = ['日', '日-word', 'voice-welcome', 'voice-praise-1', 'sfx-correct', 'voice-instr-whack', 'voice-try-again', 'voice-level-complete']
check('音频 URL 与实际文件对应', names.every((n) => audioFiles.has(fileUrl(n).split('/').pop())))
check('文件名全 ASCII', [...audioFiles].every((f) => /^[\x20-\x7e]+$/.test(f)) && assetName('日-word') === '65e5-word')

console.log(failed === 0 ? '\n全部通过' : `\n${failed} 项失败`)
process.exit(failed === 0 ? 0 : 1)
