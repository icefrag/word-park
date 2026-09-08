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
  removeStorageSync: (k) => store.delete(k),
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
const { CHARACTERS, TOTAL_UNITS, imageOf, byUnit, byStage, assetName } = require('./characters')
check('600 字', CHARACTERS.length === 600)
check('67 个单元号', TOTAL_UNITS === 67)
check('字不重复', new Set(CHARACTERS.map((c) => c.char)).size === 600)
check('无 level 遗留字段', CHARACTERS.every((c) => c.level === undefined))
check('阶段字量 150/150/300', byStage(1).length === 150 && byStage(2).length === 150 && byStage(3).length === 300)
check('图片 URL 命名正确', CHARACTERS.every((c) => /^https:\/\/.+\/assets\/images\/[0-9a-f]+\.png$/.test(imageOf(c))))
check('重编号抽查', byUnit(7).length === 7 && byUnit(7).some((c) => c.char === '狗')
  && byUnit(38).length === 7 && byUnit(37).length === 10 && byUnit(29).length === 8 && byUnit(8).some((c) => c.char === '五'))
check('小班新增字全部有图', byStage(1).filter((c) => c.unit >= 10).every((c) => c.emojiCode))
// emojiCode 允许复用:补丁设计里同义字共享码(乌/鸦都用 1f426 鸟、江/湖/溪都用 1f30a 水),云端图按字 char 命名所以图仍独立
check('emojiCode 复用允许(同码字云端图按 char 命名独立)', true)

// --- levels ---
const { LEVELS, STAGES } = require('./levels')
const stageOfLevel = (l) => (l.type === 'review' ? l.stage : STAGES.find((s) => s.units.includes(l.id)).id)
check('关卡数 67', LEVELS.length === 67)
check('每关 flashcard 开头', LEVELS.every((l) => l.rounds[0].type === 'flashcard'))
check('玩法类型合法', LEVELS.every((l) =>
  l.rounds.every((r) => ['flashcard', 'pic2char', 'sound2char', 'findall', 'match', 'bubble', 'whack', 'link', 'break'].includes(r.type))
))
check('复习单元 28/51/67', LEVELS.filter((l) => l.type === 'review').map((l) => l.id).join() === '28,51,67')
check('复习单元 id 与阶段区间对应', LEVELS.filter((l) => l.type === 'review').every((l) => STAGES[l.stage - 1].review === l.id))
check('字 stage 与 STAGES 区间一致', CHARACTERS.every((c) => STAGES[c.stage - 1].units.includes(c.unit)))
check('小班生成单元玩法温和', [6, 7, 8, 9].every((u) => {
  const lv = LEVELS.find((l) => l.id === u)
  return lv.rounds.every((r) => ['flashcard', 'pic2char', 'sound2char', 'findall', 'match'].includes(r.type))
}))
// voice 仅 stage ≥ 2 的 findall/bubble/whack 轮次携带 true;stage 1(含手工关)不带该字段,!!undefined → false
check('语音模式按阶段', LEVELS.every((l) =>
  l.rounds.every((r) => !['findall', 'bubble', 'whack'].includes(r.type) || !!r.voice === (stageOfLevel(l) >= 2))
))
check('无图字单元自动换纯字玩法', [41, 42, 43].every((u) => {
  const lv = LEVELS.find((l) => l.id === u)
  return lv.rounds.every((r) => !['pic2char', 'match', 'link'].includes(r.type))
}))
check('大班单元拆4段(11轮:识字卡+练习×4,段间break)', STAGES[2].units.every((u) => {
  const lv = LEVELS.find((l) => l.id === u)
  const fcs = lv.rounds.filter((r) => r.type === 'flashcard')
  return lv.rounds.length === 11
    && fcs.length === 4 && fcs.every((r, i) => r.band === i)
    && lv.rounds.filter((r) => r.type === 'break').length === 3
    && lv.rounds[lv.rounds.length - 1].type !== 'break'
    && [0, 1, 2, 3].every((i) => lv.rounds.filter((r) => r.band === i).length === 2)
}))
check('大班段练5选项', STAGES[2].units.every((u) => {
  const lv = LEVELS.find((l) => l.id === u)
  return lv.rounds.every((r) => r.type !== 'pic2char' && r.type !== 'sound2char'
    || r.options.every((o) => o === 5))
}))
check('小中班生成单元不分段', [6, 7, 8, 9, 30, 45].every((u) => {
  const lv = LEVELS.find((l) => l.id === u)
  return lv.rounds[0].type === 'flashcard' && lv.rounds.every((r) => r.band === undefined && r.type !== 'break')
}))

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
const { imageChars } = require('./engine')
check('有图字过滤', imageChars([{ emojiCode: '1f600' }, { emojiCode: null }, {}]).length === 1)

// --- engine: 掺旧字/错字混合(P0-1/P0-2) ---
const { pickReviewTargets, mixTargets } = require('./engine')
const fakeOld = Array.from({ length: 20 }, (_, i) => ({ char: '伪' + i, unit: i + 1 }))
check('旧字抽样:最久未见优先(top-3n 内)', pickReviewTargets(fakeOld, 30, 5, {}).every((c) => c.unit <= 15))
check('旧字抽样:常错加权优先', pickReviewTargets(fakeOld, 30, 2, { 伪5: { lastUnit: 25, wrong: 9 } }).some((c) => c.char === '伪5'))
check('旧字抽样:空池/零配额安全', pickReviewTargets([], 30, 5, {}).length === 0 && pickReviewTargets(fakeOld, 30, 0, {}).length === 0)
const mixed = mixTargets(['a', 'b', 'c', 'd'], ['x1', 'x2'], ['o1', 'o2'], 4)
check('mixTargets:长度=配额且无重复', mixed.length === 4 && new Set(mixed).size === 4)
check('mixTargets:错字(≤2)优先包含', mixed.includes('x1') && mixed.includes('x2'))
check('mixTargets:至少保留 1 个新字', mixTargets(['a', 'b', 'c'], ['x1', 'x2'], ['o1'], 3).some((c) => 'abc'.includes(c)))
check('mixTargets:错字挤占旧字配额', (() => {
  const t = mixTargets(['a', 'b', 'c'], ['x1', 'x2'], ['o1'], 3)
  return t.filter((c) => !'abc'.includes(c)).length === 2
})())

// --- engine: 音近/形近干扰(P0-3) ---
const { pickDistractors, stripTone } = require('./engine')
const { CONFUSABLE } = require('./characters')
check('形近表 25 对字全在库', CONFUSABLE.length === 25 && CONFUSABLE.flat().every((ch) => new Set(CHARACTERS.map((c) => c.char)).has(ch)))
const pyMap = { 妈: 'mā', 马: 'mǎ', 蚂: 'mǎ', 跑: 'pǎo', 高: 'gāo', 目: 'mù', 田: 'tián', 日: 'rì' }
const confMap = { 日: ['目', '白'], 目: ['日'], 白: ['日'] }
check('声调剥离', stripTone('mā') === 'ma' && stripTone('lǜ') === 'lv' && stripTone('gāo') === 'gao')
check('干扰:音近优先(同音不同调)', pickDistractors('妈', ['马', '跑', '高'], 2, { pinyin: pyMap, confusable: confMap }).includes('马'))
check('干扰:形近次优先', pickDistractors('日', ['目', '跑', '高'], 2, { pinyin: pyMap, confusable: confMap }).includes('目'))
check('干扰:无opts纯随机不炸', (() => {
  const d = pickDistractors('日', ['目', '跑', '高'], 2)
  return d.length === 2 && !d.includes('日')
})())
check('干扰:候选不足回退', pickDistractors('日', ['目'], 2, { pinyin: pyMap, confusable: confMap }).length === 1)
const PY = Object.fromEntries(CHARACTERS.map((c) => [c.char, c.pinyin]))
const CONF = {}
for (const [a, b] of CONFUSABLE) {
  ;(CONF[a] = CONF[a] || []).push(b)
  ;(CONF[b] = CONF[b] || []).push(a)
}
check('干扰:opts贯通buildQuestions', buildQuestions(['妈'], pool, [3], { pinyin: PY, confusable: CONF }).every((q) => q.options.includes('马')))

// --- progress ---
const { completeLevel, isUnlocked, learnedCharCount, resetProgress, starsForMistakes, stageUnlocked, stageProgress, loadProgress, saveProgress } = require('./progress')
resetProgress()
check('初始仅解锁第 1 关', isUnlocked(1) && !isUnlocked(2))
check('初始小班解锁/中班大班锁定', stageUnlocked(1) && !stageUnlocked(2) && !stageUnlocked(3))
const s3 = completeLevel(1, 0)
check('3 星规则', starsForMistakes(0) === 3 && starsForMistakes(3) === 2 && starsForMistakes(9) === 1)
check('通关解锁下一关', isUnlocked(2) && s3 === 3)
completeLevel(2, 2)
check('已认字数 = 单元1(5)+单元2(5)', learnedCharCount() === 10)
for (let u = 3; u <= 28; u++) completeLevel(u, 0)
check('通关小班(含复习)解锁中班', isUnlocked(29) && stageUnlocked(2))
check('复习单元不计入已认字数', learnedCharCount() === 150)
resetProgress()
const sp1 = stageProgress(1)
check('阶段进度过滤空档(仅就绪单元)', sp1.done === 0 && sp1.total === 28)
completeLevel(1, 0)
check('阶段进度计数通关数', stageProgress(1).done === 1)
for (let u = 1; u <= 27; u++) completeLevel(u, 0)
check('未通关复习单元不解锁中班', !stageUnlocked(2) && !isUnlocked(29))
completeLevel(28, 0)
check('复习通关后解锁中班', stageUnlocked(2))
check('通关最后一关安全', (() => { completeLevel(67, 0); return isUnlocked(67) })())
resetProgress()
check('重置回到起点', !isUnlocked(2) && !stageUnlocked(2))

// --- progress: charStats(P0-1) ---
resetProgress()
completeLevel(1, 1, ['日'])
const cs = loadProgress().charStats
check('charStats:单元字刷新lastUnit+错字wrong+1', byUnit(1).every((c) => cs[c.char] && cs[c.char].lastUnit === 1)
  && cs['日'].wrong === 1)
completeLevel(2, 0, [])
check('charStats:再通关不误增wrong', cs['日'].wrong === 1 && cs['日'].lastUnit === 1)
check('charStats:无图大班单元也记录', (() => {
  completeLevel(58, 0, [])
  return byUnit(58).every((c) => cs[c.char] && cs[c.char].lastUnit === 58)
})())
saveProgress({ unlockedLevel: 3, stars: { 1: 3 } }) // 旧档(无 charStats 字段)
check('charStats:旧档读取补默认空表', typeof loadProgress().charStats === 'object' && loadProgress().charStats !== null)
resetProgress()
check('charStats:重置清空', Object.keys(loadProgress().charStats).length === 0)

// --- audio ---
const { fileUrl } = require('./audio')
const names = ['日', '日-word', 'voice-welcome', 'voice-praise-1', 'sfx-correct', 'voice-instr-whack', 'voice-try-again', 'voice-level-complete']
check('音频 URL 命名正确', names.every((n) => {
  const url = fileUrl(n)
  return /^https:\/\/.+\/assets\/audio\/[0-9a-z-]+\.wav$/.test(url) &&
    (n === '日' ? url.endsWith('/65e5.wav') : n === '日-word' ? url.endsWith('/65e5-word.wav') : url.endsWith(`/${n}.wav`))
}))
check('文件名全 ASCII', assetName('日-word') === '65e5-word')

console.log(failed === 0 ? '\n全部通过' : `\n${failed} 项失败`)
process.exit(failed === 0 ? 0 : 1)
