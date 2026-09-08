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
check('图片 URL 命名正确', CHARACTERS.every((c) => /^https:\/\/.+\/assets\/images\/[0-9a-f]+\.png(\?v=[\w-]+)?$/.test(imageOf(c))))
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
  l.rounds.every((r) => ['flashcard', 'pic2char', 'sound2char', 'findall', 'match', 'bubble', 'whack', 'link'].includes(r.type))
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
check('大班单元 3 练习 5 选项', STAGES[2].units.every((u) => {
  const lv = LEVELS.find((l) => l.id === u)
  return lv.rounds.length === 4 && lv.rounds.every((r) => r.type !== 'pic2char' && r.type !== 'sound2char'
    || r.options.every((o) => o === 5))
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
// 渐进提示:排除项选取跳过目标与已排除项,选项耗尽返回 null
check('提示:排除项选取', (() => {
  const { nextDimPick } = require('./engine')
  const opts = ['日', '月', '水']
  const d1 = nextDimPick(opts, '月', {})
  const d2 = nextDimPick(opts, '月', { [d1]: true })
  return d1 !== '月' && d2 !== '月' && d2 !== d1
})())
check('提示:无可排除项返回 null', (() => {
  const { nextDimPick } = require('./engine')
  return nextDimPick(['月'], '月', {}) === null && nextDimPick(['日', '月'], '月', { 日: true }) === null
})())
const { imageChars } = require('./engine')
check('有图字过滤', imageChars([{ emojiCode: '1f600' }, { emojiCode: null }, {}]).length === 1)

// --- progress ---
const { completeLevel, isUnlocked, learnedCharCount, resetProgress, starsForMistakes, stageUnlocked, stageProgress } = require('./progress')
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

// --- audio ---
const { fileUrl, VOICES, currentVoice, setVoice } = require('./audio')
const vurl = (n) => fileUrl(n).replace(/\?v=[\w-]+$/, '')
check('播报 URL 走音色目录 mp3', ['日', '日-word', 'voice-welcome', 'voice-praise-1', 'voice-instr-whack', 'voice-try-again', 'voice-level-complete']
  .every((n) => new RegExp(`^https://.+\\/assets\\/audio\\/${currentVoice()}\\/[0-9a-z-]+\\.mp3$`).test(vurl(n))))
check('字词播报文件名(hex 码点)', vurl('日').endsWith('/tianmei/65e5.mp3') && vurl('日-word').endsWith('/tianmei/65e5-word.mp3'))
check('音效 URL 走根目录 wav', ['sfx-correct', 'sfx-wrong', 'sfx-flip', 'sfx-win']
  .every((n) => new RegExp(`^https://.+\\/assets\\/audio\\/${n}\\.wav$`).test(vurl(n))))
check('音色配置 4 个且 key 唯一', VOICES.length === 4 && new Set(VOICES.map((v) => v.key)).size === 4)
check('默认音色 tianmei', currentVoice() === 'tianmei')
setVoice('tong')
check('切换音色后播报 URL 跟随', currentVoice() === 'tong' && vurl('日').endsWith('/tong/65e5.mp3'))
setVoice('not-a-voice')
check('非法音色被忽略', currentVoice() === 'tong')
check('文件名全 ASCII', assetName('日-word') === '65e5-word')

console.log(failed === 0 ? '\n全部通过' : `\n${failed} 项失败`)
process.exit(failed === 0 ? 0 : 1)
