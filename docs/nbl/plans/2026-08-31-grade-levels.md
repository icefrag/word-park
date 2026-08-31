# 三级分级学习体系(小班/中班/大班,600 字)实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 132 字/19 单元的平铺识字小程序改造为小班(150)/中班(300 累计)/大班(600 累计)三级分阶体系,每阶段末尾带复习单元,含地图页签 UI、阶段化玩法难度、语音提示模式与 468 个新字的素材生产。

**Architecture:** 单元号全局重编号为学习顺序(小班 1-28、中班 29-51、大班 52-67,各段末位为复习单元),解锁沿用朴素线性判断;阶段解锁为派生展示;无图字(emojiCode=null)在出题层自动换纯字玩法;找一找/气泡/打地鼠在 stage≥2 切语音提示(不显示目标字)。素材生成脚本改为读 characters.js 单一数据源。

**Tech Stack:** 微信原生小程序(WXML/WXSS/JS,基础库 2.20.1,无运行时 npm 依赖);测试为 `node scripts/smoke-test.mjs`(mock wx 直读 utils);素材为 Node 18+ 脚本(sharp + jsdelivr OpenMoji + PowerShell Huihui TTS)。

**Spec:** `docs/nbl/specs/2026-08-31-grade-levels-design.md`(本计划从 spec 出发,执行者需同时读 spec)

## Global Constraints

- 测试唯一入口:`node scripts/smoke-test.mjs`,必须全绿才算任务完成;每个任务**先加断言、跑红、再实现、跑绿、再提交**
- 存储键固定 `hanzi-paradise-v2`,结构 `{ unlockedLevel, stars }` 不变
- 单元终局编号:小班 1-27+复习 28;中班 29-50+复习 51;大班 52-66+复习 67;`TOTAL_UNITS = 67`
- `emojiCode: null` 表示无图字;**小班(stage 1)所有字必须有图**;全库非 null emojiCode 不得重复(选择题图即字面,重码=两个字同图)
- `voice: true` 只出现在 stage ≥ 2 的 findall/bubble/whack 轮次;stage 1 与 5 个手工关卡不带
- 素材命名:图 `assets/images/<hex>.png`、音 `assets/audio/<hex>.wav` 与 `<hex>-word.wav`,hex 由 `assetName` 计算,不得改动
- 每字组词音文案 = "字,组词"(如 "桃,桃子"),TTS 用 word 字段
- 提交格式 `<type>: <描述>`,一个任务一个提交
- 现有 5 个手工关卡(太阳和月亮/农场的小伙伴/我的身体/美丽花园/汉字小达人)的轮次定义随主题原样保留

## 终局单元编号表(现有 19 单元重编号映射)

| 新号 | 单元 | 旧号 | 新号 | 单元 | 旧号 |
|---|---|---|---|---|---|
| 1 | 太阳和月亮 | 1 | 31 | 动一动 | 9 |
| 2 | 农场的小伙伴 | 2 | 32 | 穿戴上 | 10 |
| 3 | 我的身体 | 3 | 33 | 出门去 | 11 |
| 4 | 美丽花园 | 4 | 34 | 颜色 | 12 |
| 5 | 汉字小达人 | 5 | 35 | 大自然 | 13 |
| 6 | 一家人 | 6 | 36 | 一天四季 | 15 |
| 7 | 动物园 | 14 | 37 | 方位 | 16 |
| 8 | 数字乐园 | 18 | 38 | 小身体与文具 | 17 |
| 9 | 象形字乐园 | 19 | | (小班新 10-27、中班新 39-50、大班 52-66 由数据任务补) | |
| 29 | 我的家 | 7 | | 28/51/67 = 三阶段复习单元 | |
| 30 | 好吃的 | 8 | | | |

---

### Task 1: 数据与关卡层重构(characters.js + levels.js)

> 必须一次提交:重编号后 characters 与 levels 互相依赖,分开提交会让中间态冒烟失败。

**Files:**
- Modify: `miniprogram/utils/characters.js`(全文件)
- Modify: `miniprogram/utils/levels.js`(全文件重写)
- Modify: `scripts/smoke-test.mjs`(characters/levels 两节)

**Interfaces:**
- Consumes: 无(起点任务)
- Produces: `characters.js` 导出 `{ CHARACTERS, TOTAL_UNITS(67), imageOf, pandaImage, byStage, byUnit, assetName }`(删除 byLevel);每字字段 `{ char, pinyin, word, emojiCode, stage, unit }`(删除 level);`levels.js` 导出 `{ LEVELS, STAGES, THEMES, unitStage }`,LEVELS 元素含 `{ id, theme, rounds, type?: 'review', stage?: 1|2|3 }`

- [ ] **Step 1: 改冒烟断言(characters/levels 节替换为下述)**

```js
// --- characters ---
const { CHARACTERS, TOTAL_UNITS, imageOf, byUnit, byStage, assetName } = require('./characters')
check('132 字', CHARACTERS.length === 132)
check('67 个单元号', TOTAL_UNITS === 67)
check('字不重复', new Set(CHARACTERS.map((c) => c.char)).size === 132)
check('无 level 遗留字段', CHARACTERS.every((c) => c.level === undefined))
check('阶段字量 55/77/0', byStage(1).length === 55 && byStage(2).length === 77 && byStage(3).length === 0)
check('图片 URL 命名正确', CHARACTERS.every((c) => /^https:\/\/.+\/assets\/images\/[0-9a-f]+\.png$/.test(imageOf(c))))
check('重编号抽查', byUnit(7).length === 7 && byUnit(7).some((c) => c.char === '狗')
  && byUnit(38).length === 7 && byUnit(37).length === 10 && byUnit(29).length === 8 && byUnit(8).some((c) => c.char === '五'))

// --- levels ---
const { LEVELS, STAGES } = require('./levels')
const stageOfLevel = (l) => (l.type === 'review' ? l.stage : STAGES.find((s) => s.units.includes(l.id)).id)
check('关卡数 22(数据补齐前框架态)', LEVELS.length === 22)
check('每关 flashcard 开头', LEVELS.every((l) => l.rounds[0].type === 'flashcard'))
check('玩法类型合法', LEVELS.every((l) =>
  l.rounds.every((r) => ['flashcard', 'pic2char', 'sound2char', 'findall', 'match', 'bubble', 'whack', 'link'].includes(r.type))
))
check('复习单元 28/51/67', LEVELS.filter((l) => l.type === 'review').map((l) => l.id).join() === '28,51,67')
check('字 stage 与 STAGES 区间一致', CHARACTERS.every((c) => STAGES[c.stage - 1].units.includes(c.unit)))
check('小班生成单元玩法温和', [6, 7, 8, 9].every((u) => {
  const lv = LEVELS.find((l) => l.id === u)
  return lv.rounds.every((r) => ['flashcard', 'pic2char', 'sound2char', 'findall'].includes(r.type))
}))
check('语音模式按阶段', LEVELS.every((l) =>
  l.rounds.every((r) => !['findall', 'bubble', 'whack'].includes(r.type) || r.voice === (stageOfLevel(l) >= 2))
))
```

同时把 progress 节里 `completeLevel(19, 0)` / `!isUnlocked(20)` 两行的 19、20 改成 67、68(临时兼容,Task 2 会重写该节)。

- [ ] **Step 2: 跑红**

Run: `node scripts/smoke-test.mjs`
Expected: FAIL(byStage 不存在、TOTAL_UNITS=19 等)

- [ ] **Step 3: 改 characters.js**

按终局编号表改每条记录:删除所有 `level` 字段;`unit` 按映射表改值;每条新增 `stage`(小班单元 1-9 → stage:1,中班单元 29-38 → stage:2);每单元的注释标题同步改新号。文件头部新增一行注释:`// 阶段:1 小班 / 2 中班 / 3 大班;unit 为全局学习顺序编号(见 levels.js STAGES)`。尾部改为:

```js
const TOTAL_UNITS = 67 // 终局单元数(小班1-28 中班29-51 大班52-67,各段末位为复习单元)
const byUnit = (unit) => CHARACTERS.filter((c) => c.unit === unit)
const byStage = (stage) => CHARACTERS.filter((c) => c.stage === stage)
module.exports = { CHARACTERS, TOTAL_UNITS, imageOf, pandaImage, byStage, byUnit, assetName }
```

(`byLevel`、旧 `TOTAL_UNITS = 19` 删除;`imageOf/pandaImage/assetName` 原样保留)

- [ ] **Step 4: 重写 levels.js(全文件)**

```js
const { byUnit } = require('./characters')

// 手工关卡(体验已验证):轮次随主题保留,编号按新学习顺序摆放为 1-5
const HANDMADE = {
  1: {
    theme: '太阳和月亮',
    rounds: [
      { type: 'flashcard' },
      { type: 'pic2char', count: 5, options: [2, 2, 3, 3, 3] },
    ],
  },
  2: {
    theme: '农场的小伙伴',
    rounds: [
      { type: 'flashcard' },
      { type: 'pic2char', count: 3, options: [3, 3, 3] },
      { type: 'sound2char', count: 3, options: [3, 3, 3] },
    ],
  },
  3: {
    theme: '我的身体',
    rounds: [
      { type: 'flashcard' },
      { type: 'sound2char', count: 3, options: [4, 4, 4] },
      { type: 'findall', count: 2 },
    ],
  },
  4: {
    theme: '美丽花园',
    rounds: [
      { type: 'flashcard' },
      { type: 'match', pairs: 4 },
    ],
  },
  5: {
    theme: '汉字小达人',
    rounds: [
      { type: 'flashcard' },
      { type: 'bubble', target: 10 },
    ],
  },
}

// 三级阶段:units 为本阶段学习顺序单元号,review 为阶段复习单元号
const STAGES = [
  {
    id: 1, name: '小班', subtitle: '启蒙乐园', age: '3-4岁',
    units: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27],
    review: 28,
  },
  {
    id: 2, name: '中班', subtitle: '成长乐园', age: '4-5岁',
    units: [29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50],
    review: 51,
  },
  {
    id: 3, name: '大班', subtitle: '衔接乐园', age: '5-6岁',
    units: [52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66],
    review: 67,
  },
]

// 生成式单元主题表:数据任务逐批补齐(10-27 小班 / 39-50 中班 / 52-66 大班)
const THEMES = {
  6: '一家人', 7: '动物园', 8: '数字乐园', 9: '象形字乐园',
  29: '我的家', 30: '好吃的', 31: '动一动', 32: '穿戴上', 33: '出门去',
  34: '颜色', 35: '大自然', 36: '一天四季', 37: '方位', 38: '小身体与文具',
}

// 阶段玩法配置:小班温和(3 选项 2 练习,无操作类),中班全池轮换(3→4 选项),大班拉满(5 选项 3 练习,偏重操作玩法)
const STAGE_PLAY = {
  1: { templates: [['pic2char', 'sound2char'], ['sound2char', 'findall'], ['pic2char', 'findall']] },
  2: {
    templates: [
      ['pic2char', 'sound2char'],
      ['sound2char', 'findall'],
      ['whack', 'link'],
      ['pic2char', 'match'],
      ['link', 'whack'],
    ],
  },
  3: {
    templates: [
      ['findall', 'whack', 'link'],
      ['link', 'findall', 'match'],
      ['pic2char', 'findall', 'whack'],
      ['match', 'sound2char', 'link'],
      ['findall', 'link', 'whack'],
    ],
  },
}
// 语音提示模式:stage ≥ 2 的这三类玩法不显示目标字,只听音(spec 第 5 节)
const VOICE_TYPES = ['findall', 'bubble', 'whack']
// 单元内有图字不足时,图玩法替换为纯字玩法(spec 第 5 节)
const PIC_FALLBACK = { pic2char: 'sound2char', match: 'findall', link: 'whack' }

function unitStage(unit) {
  return STAGES.find((s) => s.units.includes(unit) || s.review === unit).id
}

function roundParams(type, n, optCap) {
  if (type === 'findall') return { count: 2 }
  if (type === 'match' || type === 'link') return { pairs: Math.min(4, n) }
  if (type === 'whack') return { target: 8 }
  return { count: Math.min(n, 4), options: Array(3).fill(optCap) }
}

function generateUnit(unit) {
  const stage = unitStage(unit)
  const s = STAGES[stage - 1]
  const idx = s.units.indexOf(unit)
  const optCap = stage === 1 ? 3 : stage === 2 ? Math.min(4, 3 + Math.floor(idx / 4)) : 5
  const chars = byUnit(unit)
  const imgCount = chars.filter((c) => c.emojiCode).length
  const rounds = [{ type: 'flashcard' }]
  for (let t of STAGE_PLAY[stage].templates[idx % STAGE_PLAY[stage].templates.length]) {
    if (PIC_FALLBACK[t] && imgCount < (t === 'pic2char' ? 3 : 4)) t = PIC_FALLBACK[t]
    const r = { type: t, ...roundParams(t, chars.length, optCap) }
    if (VOICE_TYPES.includes(t) && stage >= 2) r.voice = true
    rounds.push(r)
  }
  return { id: unit, theme: THEMES[unit], rounds }
}

// 复习单元:玩法组合固定,出题字池运行时由 play 页从本阶段已学字抽样(spec 第 6 节)
function generateReview(stage) {
  const optCap = stage === 1 ? 3 : stage === 2 ? 4 : 5
  const defs = {
    1: [['sound2char', { count: 4 }], ['findall', { count: 2 }]],
    2: [['pic2char', { count: 4 }], ['findall', { count: 3 }]],
    3: [['findall', { count: 3 }], ['whack', { target: 10 }], ['link', { pairs: 5 }]],
  }[stage]
  const rounds = [{ type: 'flashcard' }]
  for (const [t, p] of defs) {
    const r = { type: t, ...p }
    if (t === 'pic2char' || t === 'sound2char') r.options = Array(3).fill(optCap)
    if (VOICE_TYPES.includes(t) && stage >= 2) r.voice = true
    rounds.push(r)
  }
  return { id: STAGES[stage - 1].review, theme: '复习时间', type: 'review', stage, rounds }
}

const LEVELS = [
  ...[1, 2, 3, 4, 5].map((u) => ({ id: u, theme: HANDMADE[u].theme, rounds: HANDMADE[u].rounds })),
  ...STAGES.flatMap((s) => [
    ...s.units.filter((u) => u > 5 && THEMES[u]).map((u) => generateUnit(u)),
    generateReview(s.id),
  ]),
]

module.exports = { LEVELS, STAGES, THEMES, unitStage }
```

- [ ] **Step 5: 跑绿**

Run: `node scripts/smoke-test.mjs`
Expected: 全部 PASS(engine/progress/audio 节沿用旧断言也应通过;progress 节已在 Step 1 临时改 67/68)

- [ ] **Step 6: 提交**

```bash
git add miniprogram/utils/characters.js miniprogram/utils/levels.js scripts/smoke-test.mjs
git commit -m "feat: 单元全局重编号为学习顺序+STAGES阶段框架+语音/无图轮次生成规则"
```

---

### Task 2: progress.js 升版 v2 + 阶段派生函数

**Files:**
- Modify: `miniprogram/utils/progress.js`
- Modify: `scripts/smoke-test.mjs`(progress 节重写)

**Interfaces:**
- Consumes: Task 1 的 `LEVELS`(有序数组)、`STAGES`
- Produces: `progress.js` 导出新增 `stageUnlocked(stageId) → boolean`、`stageProgress(stageId) → { done, total }`(仅已就绪单元计数);`completeLevel` 解锁目标改为"LEVELS 顺序中的下一个"

- [ ] **Step 1: 重写冒烟 progress 节**

```js
// --- progress ---
const { completeLevel, isUnlocked, learnedCharCount, resetProgress, starsForMistakes, stageUnlocked } = require('./progress')
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
check('复习单元不计入已认字数', learnedCharCount() === 55)
resetProgress()
for (let u = 1; u <= 27; u++) completeLevel(u, 0)
check('未通关复习单元不解锁中班', !stageUnlocked(2) && !isUnlocked(29))
completeLevel(28, 0)
check('复习通关后解锁中班', stageUnlocked(2))
check('通关最后一关安全', (() => { completeLevel(67, 0); return isUnlocked(67) })())
resetProgress()
check('重置回到起点', !isUnlocked(2) && !stageUnlocked(2))
```

- [ ] **Step 2: 跑红**(stageUnlocked 不存在)

Run: `node scripts/smoke-test.mjs`

- [ ] **Step 3: 改 progress.js**

```js
const { LEVELS, STAGES } = require('./levels')
const { byUnit } = require('./characters')

const KEY = 'hanzi-paradise-v2'

// read/loadProgress/saveProgress/starsForMistakes 原样保留(KEY 改为上面新值)

// 通关后解锁"关卡顺序中的下一个"(跳过数据未就绪的编号空档)
function nextUnitId(levelId) {
  const i = LEVELS.findIndex((l) => l.id === levelId)
  return LEVELS[i + 1]?.id ?? LEVELS[LEVELS.length - 1].id
}

function completeLevel(levelId, mistakes) {
  const p = loadProgress()
  const stars = starsForMistakes(mistakes)
  p.stars[levelId] = Math.max(p.stars[levelId] ?? 0, stars)
  p.unlockedLevel = Math.max(p.unlockedLevel, nextUnitId(levelId))
  saveProgress(p)
  return stars
}

// isUnlocked/totalStars/learnedCharCount/resetProgress 原样保留

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
```

- [ ] **Step 4: 跑绿** → `node scripts/smoke-test.mjs` 全 PASS

- [ ] **Step 5: 提交**

```bash
git add miniprogram/utils/progress.js scripts/smoke-test.mjs
git commit -m "feat: 进度存储升版v2+按关卡顺序解锁+阶段解锁/进度派生函数"
```

---

### Task 3: 出题层适配(engine.imageChars + play.js 复习/图字/voice)

**Files:**
- Modify: `miniprogram/utils/engine.js`(新增 1 函数)
- Modify: `miniprogram/pages/play/play.js`(全文件)
- Modify: `miniprogram/pages/play/play.wxml`(3 行加 voice 透传)
- Modify: `scripts/smoke-test.mjs`(engine 节加 1 断言)

**Interfaces:**
- Consumes: Task 1 的 `byStage`;Task 1 levels 的 review 定义 `{ type: 'review', stage }`
- Produces: `engine.js` 导出新增 `imageChars(chars) → 有图字数组`;play 页 round.props 对 findall/bubble/whack 增加 `voice: true`(仅当轮次定义带 voice)

- [ ] **Step 1: 冒烟 engine 节追加**

```js
const { imageChars } = require('./engine')
check('有图字过滤', imageChars([{ emojiCode: '1f600' }, { emojiCode: null }, {}]).length === 1)
```

- [ ] **Step 2: 跑红** → `node scripts/smoke-test.mjs`

- [ ] **Step 3: engine.js 新增并导出**

```js
// 有图字(emojiCode 非空):pic2char/match/link 的目标字必须从中抽
function imageChars(chars) {
  return chars.filter((c) => c.emojiCode)
}
```
(加入 module.exports)

- [ ] **Step 4: 重写 play.js**

```js
const { LEVELS } = require('../../utils/levels')
const { CHARACTERS, byUnit, byStage } = require('../../utils/characters')
const {
  buildQuestions, buildFindAllGrid, buildMatchCards, buildBubbleTargets, shuffle, imageChars,
} = require('../../utils/engine')
const { completeLevel } = require('../../utils/progress')

Page({
  data: {
    round: null, // {type, props}:当前轮玩法类型与该组件所需数据
  },

  onLoad(query) {
    const levelId = Number(query.levelId)
    const level = LEVELS.find((l) => l.id === levelId)
    if (!level) {
      wx.navigateBack()
      return
    }
    this.level = level
    this.roundIndex = 0
    this.mistakes = 0
    this.setData({ round: this.buildRound() })
  },

  // 干扰项只用已学过的字(unit 即学习顺序)
  poolFor(lv) {
    return CHARACTERS.filter((c) => c.unit <= lv.id).map((c) => c.char)
  },

  // 复习单元:本阶段已学字随机抽样并缓存(切轮不重抽,轮间字池稳定)
  charsFor(lv) {
    if (lv.type !== 'review') return byUnit(lv.id)
    if (!this._reviewPool) this._reviewPool = shuffle(byStage(lv.stage)).slice(0, 12)
    return this._reviewPool
  },

  buildRound() {
    const lv = this.level
    const lvChars = this.charsFor(lv)
    const pool = this.poolFor(lv)
    const r = lv.rounds[this.roundIndex]
    const withVoice = (props) => (r.voice ? { ...props, voice: true } : props)
    switch (r.type) {
      case 'flashcard':
        return { type: r.type, props: { chars: lvChars } }
      case 'pic2char': {
        const targets = shuffle(imageChars(lvChars).map((c) => c.char)).slice(0, r.count)
        return { type: r.type, props: { questions: buildQuestions(targets, pool, r.options) } }
      }
      case 'sound2char': {
        const targets = shuffle(lvChars.map((c) => c.char)).slice(0, r.count)
        return { type: r.type, props: { questions: buildQuestions(targets, pool, r.options) } }
      }
      case 'findall':
        return {
          type: r.type,
          props: withVoice({
            grids: shuffle(lvChars)
              .slice(0, r.count)
              .map((c) => ({ target: c, cells: buildFindAllGrid(c.char, pool, 9, 3) })),
          }),
        }
      case 'match':
        return { type: r.type, props: { cards: buildMatchCards(shuffle(imageChars(lvChars)).slice(0, r.pairs)) } }
      case 'bubble':
        // 气泡目标字只用已学池;组件内部再用全字表造干扰
        return { type: r.type, props: withVoice({ targets: buildBubbleTargets(pool, r.target) }) }
      case 'whack':
        return { type: r.type, props: withVoice({ targets: buildBubbleTargets(pool, r.target) }) }
      case 'link':
        return { type: r.type, props: { cards: buildMatchCards(shuffle(imageChars(lvChars)).slice(0, r.pairs)) } }
      default:
        return { type: r.type, props: {} }
    }
  },

  onRoundComplete(e) {
    this.mistakes += e.detail.mistakes ?? 0
    if (this.roundIndex < this.level.rounds.length - 1) {
      this.roundIndex++
      this.setData({ round: this.buildRound() })
    } else {
      const stars = completeLevel(this.level.id, this.mistakes)
      wx.redirectTo({ url: `/pages/reward/reward?levelId=${this.level.id}&stars=${stars}` })
    }
  },
})
```

- [ ] **Step 5: play.wxml 三行加 voice 透传**

```xml
<quiz-findall wx:elif="{{round.type === 'findall'}}" grids="{{round.props.grids}}" voice="{{round.props.voice}}" bind:complete="onRoundComplete" />
<bubble-pop wx:elif="{{round.type === 'bubble'}}" targets="{{round.props.targets}}" voice="{{round.props.voice}}" bind:complete="onRoundComplete" />
<whack-mole wx:elif="{{round.type === 'whack'}}" targets="{{round.props.targets}}" voice="{{round.props.voice}}" bind:complete="onRoundComplete" />
```
(其余行不变;组件尚未声明 voice 属性,多余属性小程序会忽略,Task 4 接住)

- [ ] **Step 6: 跑绿** → `node scripts/smoke-test.mjs`

- [ ] **Step 7: 提交**

```bash
git add miniprogram/utils/engine.js miniprogram/pages/play/play.js miniprogram/pages/play/play.wxml scripts/smoke-test.mjs
git commit -m "feat: 出题层适配-有图字过滤/复习单元阶段字池/voice标记透传"
```

---

### Task 4: 找一找/气泡/打地鼠语音提示模式

> 三个组件改法同构:声明 voice 属性 → 标题条件渲染(不显示目标字)→ 答错播完"再试一次"后 1.2s 重播目标字音。换目标时的自动播报(newTarget/repeat)链路已存在,不动。

**Files:**
- Modify: `miniprogram/components/quiz-findall/quiz-findall.js` + `.wxml`
- Modify: `miniprogram/components/bubble-pop/bubble-pop.js` + `.wxml`
- Modify: `miniprogram/components/whack-mole/whack-mole.js` + `.wxml`

**Interfaces:**
- Consumes: Task 3 play 页透传的 `voice` 属性
- Produces: 三组件新增 property `voice: Boolean`;行为:voice 模式下标题不渲染 `target` 字符串

- [ ] **Step 1: quiz-findall.js — properties 加一行,答错分支加重播**

```js
  properties: {
    grids: { type: Array, value: [] }, // [{target(字对象), cells: [char,...]}]
    voice: { type: Boolean, value: false }, // 语音提示模式:不显示目标字,只听音
  },
```
clickCell 的 else 分支(现有 4 行后)追加:

```js
        if (this.data.voice) this.timers.push(setTimeout(() => this.repeat(), 1200))
```

- [ ] **Step 2: quiz-findall.wxml 标题条件渲染**

```xml
  <view class="quiz-title" bindtap="repeat" hover-class="press">
    <block wx:if="{{voice}}">🔊 听一听,找出所有的字</block>
    <block wx:else>找出所有的 <text class="target-char">{{grids[gi].target.char}}</text></block>
  </view>
```

- [ ] **Step 3: bubble-pop.js 同构**

properties 加 `voice: { type: Boolean, value: false },`;pop() 的 else 分支(现有 3 行后)追加:

```js
        if (this.data.voice) this.timers.push(setTimeout(() => this.speakTarget(), 1200))
```

- [ ] **Step 4: bubble-pop.wxml 标题条件渲染**

```xml
  <view class="quiz-title prompt" bindtap="speakTarget" hover-class="press">
    <block wx:if="{{voice}}">🔊 听一听,戳那个字的泡泡</block>
    <block wx:else>点<text class="target-char">{{target || '?'}}</text>泡泡<text class="hint-icon">🔊</text></block>
    <text class="score-text">{{score}} / {{targets.length}}</text>
  </view>
```

- [ ] **Step 5: whack-mole.js 同构**

properties 加 `voice: { type: Boolean, value: false },`;whack() 的 else 分支(现有 4 行后)追加:

```js
        if (this.data.voice) this.timers.push(setTimeout(() => this.speakTarget(), 1200))
```

- [ ] **Step 6: whack-mole.wxml 标题条件渲染**

```xml
  <view class="quiz-title prompt" bindtap="speakTarget" hover-class="press">
    <block wx:if="{{voice}}">🔊 听一听,敲那个字</block>
    <block wx:else>敲<text class="target-char">{{target || '?'}}</text>地鼠<text class="hint-icon">🔊</text></block>
    <text class="score-text">{{score}} / {{targets.length}}</text>
  </view>
```

- [ ] **Step 7: 冒烟全绿 + 开发者工具手验**

`node scripts/smoke-test.mjs` 全 PASS;微信开发者工具打开项目:
- Storage 面板新建 `hanzi-paradise-v2` = `{"unlockedLevel":29,"stars":{}}`,进中班任意含 findall/bubble/whack 的单元(如 29-38 中模板命中的),确认标题为 🔊 文案、点标题重播、网格切换自动播、答错 1.2s 后重播
- 进小班单元 3(我的身体,findall)确认标题仍显示目标字

- [ ] **Step 8: 提交**

```bash
git add miniprogram/components/quiz-findall miniprogram/components/bubble-pop miniprogram/components/whack-mole
git commit -m "feat: 找一找/气泡/打地鼠语音提示模式(中大班不显示目标字)"
```

---

### Task 5: 地图页页签式三阶段 UI

**Files:**
- Modify: `miniprogram/pages/map/map.js`(全文件)
- Modify: `miniprogram/pages/map/map.wxml`(全文件)
- Modify: `miniprogram/pages/map/map.wxss`(追加)

**Interfaces:**
- Consumes: Task 1 `STAGES`;Task 2 `stageUnlocked/stageProgress`
- Produces: 地图页数据 `stages`(含 units 视图模型)、`activeStage`;行为:点锁定页签 toast 提示

- [ ] **Step 1: 重写 map.js**

```js
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
```

- [ ] **Step 2: 重写 map.wxml**

```xml
<view class="center full-fixed">
  <view class="map-title" bindtap="speak" hover-class="press">选一关开始吧</view>
  <!-- 已认字进度条:learned 为已通关单元的字数和 -->
  <view class="learned-bar">
    <view>已认字 {{learned}}/{{total}}</view>
    <view class="track">
      <view class="fill" style="width: {{learnedPct}}%"></view>
    </view>
  </view>
  <!-- 阶段页签:锁定的灰显带锁 -->
  <view class="stage-tabs">
    <view
      wx:for="{{stages}}"
      wx:key="id"
      class="stage-tab {{item.id === activeStage ? 'active' : ''}} {{item.unlocked ? '' : 'locked'}}"
      data-id="{{item.id}}"
      bindtap="switchStage"
      hover-class="press"
    >
      {{item.name}}{{item.unlocked ? '' : ' 🔒'}}
    </view>
  </view>
  <!-- 当前阶段:标题 + 阶段进度 + 单元卡片网格 -->
  <scroll-view class="unit-scroll" scroll-y>
    <block wx:for="{{stages}}" wx:key="id" wx:for-item="stage">
      <view wx:if="{{stage.id === activeStage}}">
        <view class="stage-head">
          <text class="stage-name">{{stage.name}} · {{stage.subtitle}}</text>
          <text class="stage-age">{{stage.age}}</text>
        </view>
        <view class="stage-bar">
          <view>{{stage.done}}/{{stage.total}}</view>
          <view class="track">
            <view class="fill" style="width: {{stage.pct}}%"></view>
          </view>
        </view>
        <view class="unit-grid">
          <button
            wx:for="{{stage.units}}"
            wx:key="id"
            class="big-btn unit-btn {{item.green ? 'green' : ''}} {{item.review ? 'review-btn' : ''}}"
            disabled="{{item.locked}}"
            data-id="{{item.id}}"
            bindtap="play"
          >
            <view style="font-size: 40rpx">{{item.review ? '🔁 ' : ''}}{{item.theme}}</view>
            <view>
              <text wx:for="{{[1, 2, 3]}}" wx:for-item="s" wx:key="*this" class="star {{s > item.stars ? 'empty' : ''}}">★</text>
            </view>
            <view wx:if="{{item.locked}}" style="font-size: 64rpx">🔒</view>
          </button>
        </view>
      </view>
    </block>
  </scroll-view>
  <button class="big-btn map-reset-btn" bindtap="onReset">
    重新开始(家长按钮)
  </button>
</view>
```

- [ ] **Step 3: map.wxss 追加**

```css
/* 阶段页签 */
.stage-tabs {
  display: flex;
  gap: 16rpx;
  padding: 0 24rpx;
}
.stage-tab {
  flex: 1;
  text-align: center;
  padding: 18rpx 0;
  font-size: 36rpx;
  border-radius: 32rpx;
  background: #e8f0e2;
  color: #2c6e49;
  border: 4rpx solid transparent;
}
.stage-tab.active {
  background: #2c6e49;
  color: #fff;
}
.stage-tab.locked {
  background: #eee;
  color: #aaa;
}
/* 阶段标题与阶段进度条 */
.stage-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 16rpx 32rpx 0;
}
.stage-name {
  font-size: 44rpx;
  color: #2c6e49;
  font-weight: bold;
}
.stage-age {
  font-size: 28rpx;
  color: #888;
}
.stage-bar {
  font-size: 30rpx;
  color: #555;
  padding: 8rpx 32rpx 12rpx;
}
.stage-bar .track {
  height: 22rpx;
  margin-top: 6rpx;
}
/* 复习单元卡片 */
.review-btn {
  box-shadow: 0 10rpx 0 #7c5cbf;
}
```

- [ ] **Step 4: 冒烟全绿 + 开发者工具手验**

`node scripts/smoke-test.mjs` 全 PASS;开发者工具:
- 新进度:只显示小班页签可点,中/大班点按出 toast;单元卡片无"第N单元"编号字样,末位为"🔁 复习时间"卡片
- Storage 里 `hanzi-paradise-v2` 改 `{"unlockedLevel":29,"stars":{}}`:刷新后默认停中班页签,中班 29 解锁、30 锁定
- 家长重置按钮回到小班

- [ ] **Step 5: 提交**

```bash
git add miniprogram/pages/map
git commit -m "feat: 地图页页签式三阶段UI(阶段进度/锁定页签/复习卡片)"
```

---

### Task 6: 小班新增 95 字(单元 10-27,18 个新单元)

**Files:**
- Modify: `miniprogram/utils/characters.js`(追加 95 条)
- Modify: `miniprogram/utils/levels.js`(THEMES 补 10-27)
- Modify: `scripts/smoke-test.mjs`(更新字量断言)

**Interfaces:**
- Consumes: Task 1 的数据格式 `{ char, pinyin, word, emojiCode, stage, unit }`
- Produces: 小班阶段池满 150 字;LEVELS 增至 40 关

- [ ] **Step 1: 冒烟断言更新**

characters 节:`check('132 字', ...)` 改为 `check('227 字', CHARACTERS.length === 227)`;`check('字不重复', ...)` 的 132 改 227;`check('阶段字量 55/77/0', ...)` 改 `check('阶段字量 150/77/0', byStage(1).length === 150 && byStage(2).length === 77 && byStage(3).length === 0)`。
levels 节:`check('关卡数 22...', ...)` 改 `check('关卡数 40', LEVELS.length === 40)`。
characters 节末尾追加:

```js
check('小班新增字全部有图', byStage(1).filter((c) => c.unit >= 10).every((c) => c.emojiCode))
check('emojiCode 全库唯一', new Set(CHARACTERS.filter((c) => c.emojiCode).map((c) => c.emojiCode)).size
  === CHARACTERS.filter((c) => c.emojiCode).length)
```

- [ ] **Step 2: 跑红** → `node scripts/smoke-test.mjs`

- [ ] **Step 3: characters.js 追加小班新字(95 条,追加在现有数据末尾)**

```js
  // ===== 小班新增(单元 10-27)=====
  { char: '桃', pinyin: 'táo', word: '桃子', emojiCode: '1f351', stage: 1, unit: 10 },
  { char: '萄', pinyin: 'táo', word: '葡萄', emojiCode: '1f347', stage: 1, unit: 10 },
  { char: '瓜', pinyin: 'guā', word: '西瓜', emojiCode: '1f349', stage: 1, unit: 10 },
  { char: '蕉', pinyin: 'jiāo', word: '香蕉', emojiCode: '1f34c', stage: 1, unit: 10 },
  { char: '橙', pinyin: 'chéng', word: '橙子', emojiCode: '1f34a', stage: 1, unit: 10 },
  { char: '梨', pinyin: 'lí', word: '梨子', emojiCode: '1f350', stage: 1, unit: 10 },
  { char: '莓', pinyin: 'méi', word: '草莓', emojiCode: '1f353', stage: 1, unit: 10 },
  { char: '饭', pinyin: 'fàn', word: '米饭', emojiCode: '1f35a', stage: 1, unit: 11 },
  { char: '汤', pinyin: 'tāng', word: '热汤', emojiCode: '2615', stage: 1, unit: 11 },
  { char: '肉', pinyin: 'ròu', word: '牛肉', emojiCode: '1f969', stage: 1, unit: 11 },
  { char: '奶', pinyin: 'nǎi', word: '牛奶', emojiCode: '1f95b', stage: 1, unit: 11 },
  { char: '饼', pinyin: 'bǐng', word: '饼干', emojiCode: '1f36a', stage: 1, unit: 11 },
  { char: '蒜', pinyin: 'suàn', word: '大蒜', emojiCode: '1f9c4', stage: 1, unit: 11 },
  { char: '椒', pinyin: 'jiāo', word: '辣椒', emojiCode: '1f336', stage: 1, unit: 11 },
  { char: '碗', pinyin: 'wǎn', word: '饭碗', emojiCode: '1f963', stage: 1, unit: 12 },
  { char: '筷', pinyin: 'kuài', word: '筷子', emojiCode: '1fa62', stage: 1, unit: 12 },
  { char: '勺', pinyin: 'sháo', word: '勺子', emojiCode: '1f944', stage: 1, unit: 12 },
  { char: '杯', pinyin: 'bēi', word: '杯子', emojiCode: '1f943', stage: 1, unit: 12 },
  { char: '叉', pinyin: 'chā', word: '叉子', emojiCode: '1f374', stage: 1, unit: 12 },
  { char: '锅', pinyin: 'guō', word: '炒菜', emojiCode: '1f373', stage: 1, unit: 12 },
  { char: '眼', pinyin: 'yǎn', word: '眼睛', emojiCode: '1f441', stage: 1, unit: 13 },
  { char: '舌', pinyin: 'shé', word: '舌头', emojiCode: '1f445', stage: 1, unit: 13 },
  { char: '齿', pinyin: 'chǐ', word: '牙齿', emojiCode: '1f9b7', stage: 1, unit: 13 },
  { char: '指', pinyin: 'zhǐ', word: '手指', emojiCode: '1f446', stage: 1, unit: 13 },
  { char: '掌', pinyin: 'zhǎng', word: '手掌', emojiCode: '1f91a', stage: 1, unit: 13 },
  { char: '脚', pinyin: 'jiǎo', word: '脚丫', emojiCode: '1f9b6', stage: 1, unit: 13 },
  { char: '心', pinyin: 'xīn', word: '爱心', emojiCode: '2764', stage: 1, unit: 13 },
  { char: '龟', pinyin: 'guī', word: '乌龟', emojiCode: '1f422', stage: 1, unit: 14 },
  { char: '蛙', pinyin: 'wā', word: '青蛙', emojiCode: '1f438', stage: 1, unit: 14 },
  { char: '虾', pinyin: 'xiā', word: '小虾', emojiCode: '1f990', stage: 1, unit: 14 },
  { char: '蟹', pinyin: 'xiè', word: '螃蟹', emojiCode: '1f980', stage: 1, unit: 14 },
  { char: '蛇', pinyin: 'shé', word: '小蛇', emojiCode: '1f40d', stage: 1, unit: 14 },
  { char: '鹅', pinyin: 'é', word: '大白鹅', emojiCode: '1f9a2', stage: 1, unit: 14 },
  { char: '贝', pinyin: 'bèi', word: '贝壳', emojiCode: '1f41a', stage: 1, unit: 14 },
  { char: '蝶', pinyin: 'dié', word: '蝴蝶', emojiCode: '1f98b', stage: 1, unit: 15 },
  { char: '蜂', pinyin: 'fēng', word: '蜜蜂', emojiCode: '1f41d', stage: 1, unit: 15 },
  { char: '蚊', pinyin: 'wén', word: '蚊子', emojiCode: '1f99f', stage: 1, unit: 15 },
  { char: '蜜', pinyin: 'mì', word: '蜂蜜', emojiCode: '1f36f', stage: 1, unit: 15 },
  { char: '蜗', pinyin: 'wō', word: '蜗牛', emojiCode: '1f40c', stage: 1, unit: 15 },
  { char: '狮', pinyin: 'shī', word: '狮子', emojiCode: '1f981', stage: 1, unit: 16 },
  { char: '虎', pinyin: 'hǔ', word: '老虎', emojiCode: '1f42f', stage: 1, unit: 16 },
  { char: '鹿', pinyin: 'lù', word: '小鹿', emojiCode: '1f98c', stage: 1, unit: 16 },
  { char: '驼', pinyin: 'tuó', word: '骆驼', emojiCode: '1f42a', stage: 1, unit: 16 },
  { char: '狼', pinyin: 'láng', word: '大灰狼', emojiCode: '1f43a', stage: 1, unit: 16 },
  { char: '鹰', pinyin: 'yīng', word: '老鹰', emojiCode: '1f985', stage: 1, unit: 17 },
  { char: '鸽', pinyin: 'gē', word: '鸽子', emojiCode: '1f54a', stage: 1, unit: 17 },
  { char: '雀', pinyin: 'què', word: '孔雀', emojiCode: '1f998', stage: 1, unit: 17 },
  { char: '箭', pinyin: 'jiàn', word: '火箭', emojiCode: '1f680', stage: 1, unit: 17 },
  { char: '海', pinyin: 'hǎi', word: '大海', emojiCode: '1f30a', stage: 1, unit: 18 },
  { char: '鲸', pinyin: 'jīng', word: '鲸鱼', emojiCode: '1f40b', stage: 1, unit: 18 },
  { char: '鲨', pinyin: 'shā', word: '鲨鱼', emojiCode: '1f988', stage: 1, unit: 18 },
  { char: '章', pinyin: 'zhāng', word: '章鱼', emojiCode: '1f419', stage: 1, unit: 18 },
  { char: '站', pinyin: 'zhàn', word: '站立', emojiCode: '1f9cd', stage: 1, unit: 19 },
  { char: '坐', pinyin: 'zuò', word: '坐下', emojiCode: '1f4ba', stage: 1, unit: 19 },
  { char: '爬', pinyin: 'pá', word: '爬山', emojiCode: '1f9d7', stage: 1, unit: 19 },
  { char: '游', pinyin: 'yóu', word: '游泳', emojiCode: '1f3ca', stage: 1, unit: 19 },
  { char: '举', pinyin: 'jǔ', word: '举手', emojiCode: '1f64b', stage: 1, unit: 19 },
  { char: '拍', pinyin: 'pāi', word: '拍手', emojiCode: '1f44f', stage: 1, unit: 19 },
  { char: '抱', pinyin: 'bào', word: '拥抱', emojiCode: '1f91d', stage: 1, unit: 19 },
  { char: '洗', pinyin: 'xǐ', word: '洗手', emojiCode: '1f9fc', stage: 1, unit: 20 },
  { char: '刷', pinyin: 'shuā', word: '刷牙', emojiCode: '1faa5', stage: 1, unit: 20 },
  { char: '澡', pinyin: 'zǎo', word: '洗澡', emojiCode: '1f6c1', stage: 1, unit: 20 },
  { char: '扫', pinyin: 'sǎo', word: '扫地', emojiCode: '1f9f9', stage: 1, unit: 20 },
  { char: '净', pinyin: 'jìng', word: '干净', emojiCode: '2728', stage: 1, unit: 20 },
  { char: '阴', pinyin: 'yīn', word: '阴天', emojiCode: '1f325', stage: 1, unit: 21 },
  { char: '虹', pinyin: 'hóng', word: '彩虹', emojiCode: '1f308', stage: 1, unit: 21 },
  { char: '沙', pinyin: 'shā', word: '沙滩', emojiCode: '1f3d6', stage: 1, unit: 21 },
  { char: '岛', pinyin: 'dǎo', word: '小岛', emojiCode: '1f3dd', stage: 1, unit: 21 },
  { char: '朵', pinyin: 'duǒ', word: '花朵', emojiCode: '1f337', stage: 1, unit: 22 },
  { char: '玫', pinyin: 'méi', word: '玫瑰', emojiCode: '1f339', stage: 1, unit: 22 },
  { char: '菊', pinyin: 'jú', word: '菊花', emojiCode: '1f33c', stage: 1, unit: 22 },
  { char: '荷', pinyin: 'hé', word: '荷花', emojiCode: '1f33a', stage: 1, unit: 22 },
  { char: '树', pinyin: 'shù', word: '大树', emojiCode: '1f333', stage: 1, unit: 23 },
  { char: '林', pinyin: 'lín', word: '树林', emojiCode: '1f332', stage: 1, unit: 23 },
  { char: '枫', pinyin: 'fēng', word: '枫叶', emojiCode: '1f342', stage: 1, unit: 23 },
  { char: '松', pinyin: 'sōng', word: '松果', emojiCode: '1f330', stage: 1, unit: 23 },
  { char: '岩', pinyin: 'yán', word: '岩石', emojiCode: '1faa8', stage: 1, unit: 23 },
  { char: '球', pinyin: 'qiú', word: '皮球', emojiCode: '26bd', stage: 1, unit: 24 },
  { char: '筝', pinyin: 'zhēng', word: '风筝', emojiCode: '1fa81', stage: 1, unit: 24 },
  { char: '铃', pinyin: 'líng', word: '铃铛', emojiCode: '1f514', stage: 1, unit: 24 },
  { char: '鼓', pinyin: 'gǔ', word: '打鼓', emojiCode: '1f941', stage: 1, unit: 24 },
  { char: '琴', pinyin: 'qín', word: '钢琴', emojiCode: '1f3b9', stage: 1, unit: 24 },
  { char: '棋', pinyin: 'qí', word: '下棋', emojiCode: '265f', stage: 1, unit: 24 },
  { char: '歌', pinyin: 'gē', word: '唱歌', emojiCode: '1f3a4', stage: 1, unit: 24 },
  { char: '舞', pinyin: 'wǔ', word: '跳舞', emojiCode: '1f483', stage: 1, unit: 24 },
  { char: '巾', pinyin: 'jīn', word: '围巾', emojiCode: '1f9e3', stage: 1, unit: 25 },
  { char: '裙', pinyin: 'qún', word: '裙子', emojiCode: '1f457', stage: 1, unit: 25 },
  { char: '镜', pinyin: 'jìng', word: '镜子', emojiCode: '1fa92', stage: 1, unit: 25 },
  { char: '梦', pinyin: 'mèng', word: '做梦', emojiCode: '1f634', stage: 1, unit: 26 },
  { char: '闹', pinyin: 'nào', word: '闹钟', emojiCode: '23f0', stage: 1, unit: 26 },
  { char: '钟', pinyin: 'zhōng', word: '时钟', emojiCode: '1f570', stage: 1, unit: 26 },
  { char: '表', pinyin: 'biǎo', word: '手表', emojiCode: '231a', stage: 1, unit: 26 },
  { char: '机', pinyin: 'jī', word: '飞机', emojiCode: '2708', stage: 1, unit: 27 },
  { char: '帆', pinyin: 'fān', word: '帆船', emojiCode: '26f5', stage: 1, unit: 27 },
  { char: '铁', pinyin: 'tiě', word: '火车', emojiCode: '1f686', stage: 1, unit: 27 },
```

- [ ] **Step 4: levels.js THEMES 补条目**

```js
  10: '好吃的水果', 11: '香喷喷的饭', 12: '厨房里', 13: '身体真奇妙', 14: '池塘边',
  15: '虫虫飞', 16: '动物大王', 17: '天上飞', 18: '大海里', 19: '动起来',
  20: '讲卫生', 21: '天气好吗', 22: '花儿朵朵', 23: '大森林', 24: '玩一玩',
  25: '漂亮穿戴', 26: '时间滴答', 27: '出门坐车',
```
(加进 THEMES 对象;若 emojiCode 唯一性断言失败——与既有 132 字撞码——在 OpenMoji 找近似图换码后重跑,禁止删断言)

- [ ] **Step 5: 跑绿 + 提交**

`node scripts/smoke-test.mjs` 全 PASS(关卡数 40 = 28 小班 + 11 中班框架 + 1 大班复习)

```bash
git add miniprogram/utils/characters.js miniprogram/utils/levels.js scripts/smoke-test.mjs
git commit -m "feat: 小班新增95字/18单元(水果食物厨具身体动物动作卫生自然玩具穿戴时间交通)"
```

---

### Task 7: 中班新增 73 字(单元 39-50,12 个新单元,引入无图字)

**Files:**
- Modify: `miniprogram/utils/characters.js`(追加 73 条)
- Modify: `miniprogram/utils/levels.js`(THEMES 补 39-50)
- Modify: `scripts/smoke-test.mjs`(更新字量/无图断言)

**Interfaces:**
- Consumes: Task 1 的数据格式与 `PIC_FALLBACK` 轮次替换规则
- Produces: 中班阶段池满 150 字(累计 300);LEVELS 增至 51 关;全库首批 `emojiCode: null` 字

- [ ] **Step 1: 冒烟断言更新**

characters 节:227→300(`check('300 字', CHARACTERS.length === 300)`,字不重复同步 300);阶段字量改 `150/150/0`。
levels 节:关卡数 40→51。
levels 节追加(无图字单元必须自动换成纯字玩法):

```js
check('无图字单元自动换纯字玩法', [41, 42, 43].every((u) => {
  const lv = LEVELS.find((l) => l.id === u)
  return lv.rounds.every((r) => !['pic2char', 'match', 'link'].includes(r.type))
}))
```

- [ ] **Step 2: 跑红** → `node scripts/smoke-test.mjs`

- [ ] **Step 3: characters.js 追加中班新字(73 条)**

```js
  // ===== 中班新增(单元 39-50)===== emojiCode null = 无图字,出题走纯字玩法
  { char: '学', pinyin: 'xué', word: '上学', emojiCode: null, stage: 2, unit: 39 },
  { char: '校', pinyin: 'xiào', word: '学校', emojiCode: '1f3eb', stage: 2, unit: 39 },
  { char: '园', pinyin: 'yuán', word: '公园', emojiCode: '1f3de', stage: 2, unit: 39 },
  { char: '师', pinyin: 'shī', word: '老师', emojiCode: '1f393', stage: 2, unit: 39 },
  { char: '生', pinyin: 'shēng', word: '学生', emojiCode: null, stage: 2, unit: 39 },
  { char: '课', pinyin: 'kè', word: '上课', emojiCode: null, stage: 2, unit: 39 },
  { char: '本', pinyin: 'běn', word: '本子', emojiCode: '1f4d3', stage: 2, unit: 39 },
  { char: '喜', pinyin: 'xǐ', word: '喜欢', emojiCode: '1f60d', stage: 2, unit: 40 },
  { char: '气', pinyin: 'qì', word: '生气', emojiCode: '1f621', stage: 2, unit: 40 },
  { char: '怕', pinyin: 'pà', word: '害怕', emojiCode: '1f628', stage: 2, unit: 40 },
  { char: '难', pinyin: 'nán', word: '难过', emojiCode: '1f622', stage: 2, unit: 40 },
  { char: '乐', pinyin: 'lè', word: '快乐', emojiCode: '1f642', stage: 2, unit: 40 },
  { char: '兴', pinyin: 'xìng', word: '高兴', emojiCode: '1f603', stage: 2, unit: 40 },
  { char: '高', pinyin: 'gāo', word: '高山', emojiCode: '1f3d4', stage: 2, unit: 41 },
  { char: '矮', pinyin: 'ǎi', word: '矮', emojiCode: null, stage: 2, unit: 41 },
  { char: '胖', pinyin: 'pàng', word: '胖', emojiCode: null, stage: 2, unit: 41 },
  { char: '瘦', pinyin: 'shòu', word: '瘦', emojiCode: null, stage: 2, unit: 41 },
  { char: '轻', pinyin: 'qīng', word: '轻', emojiCode: null, stage: 2, unit: 41 },
  { char: '重', pinyin: 'zhòng', word: '重', emojiCode: null, stage: 2, unit: 41 },
  { char: '远', pinyin: 'yuǎn', word: '远', emojiCode: null, stage: 2, unit: 41 },
  { char: '近', pinyin: 'jìn', word: '近', emojiCode: null, stage: 2, unit: 41 },
  { char: '来', pinyin: 'lái', word: '来', emojiCode: null, stage: 2, unit: 42 },
  { char: '去', pinyin: 'qù', word: '去', emojiCode: null, stage: 2, unit: 42 },
  { char: '进', pinyin: 'jìn', word: '进门', emojiCode: null, stage: 2, unit: 42 },
  { char: '出', pinyin: 'chū', word: '出门', emojiCode: null, stage: 2, unit: 42 },
  { char: '开', pinyin: 'kāi', word: '开门', emojiCode: null, stage: 2, unit: 42 },
  { char: '关', pinyin: 'guān', word: '关门', emojiCode: null, stage: 2, unit: 42 },
  { char: '回', pinyin: 'huí', word: '回家', emojiCode: null, stage: 2, unit: 42 },
  { char: '到', pinyin: 'dào', word: '到了', emojiCode: null, stage: 2, unit: 42 },
  { char: '的', pinyin: 'de', word: '的', emojiCode: null, stage: 2, unit: 43 },
  { char: '是', pinyin: 'shì', word: '是', emojiCode: null, stage: 2, unit: 43 },
  { char: '有', pinyin: 'yǒu', word: '有', emojiCode: null, stage: 2, unit: 43 },
  { char: '在', pinyin: 'zài', word: '在', emojiCode: null, stage: 2, unit: 43 },
  { char: '了', pinyin: 'le', word: '了', emojiCode: null, stage: 2, unit: 43 },
  { char: '不', pinyin: 'bù', word: '不', emojiCode: null, stage: 2, unit: 43 },
  { char: '我', pinyin: 'wǒ', word: '我们', emojiCode: '1f933', stage: 2, unit: 43 },
  { char: '你', pinyin: 'nǐ', word: '你好', emojiCode: null, stage: 2, unit: 43 },
  { char: '他', pinyin: 'tā', word: '他们', emojiCode: null, stage: 2, unit: 43 },
  { char: '们', pinyin: 'men', word: '我们', emojiCode: null, stage: 2, unit: 43 },
  { char: '街', pinyin: 'jiē', word: '大街', emojiCode: '1f306', stage: 2, unit: 44 },
  { char: '店', pinyin: 'diàn', word: '商店', emojiCode: '1f3ea', stage: 2, unit: 44 },
  { char: '买', pinyin: 'mǎi', word: '买东西', emojiCode: '1f6d2', stage: 2, unit: 44 },
  { char: '卖', pinyin: 'mài', word: '卖', emojiCode: null, stage: 2, unit: 44 },
  { char: '钱', pinyin: 'qián', word: '零钱', emojiCode: '1f4b0', stage: 2, unit: 44 },
  { char: '警', pinyin: 'jǐng', word: '警察', emojiCode: '1f46e', stage: 2, unit: 44 },
  { char: '医', pinyin: 'yī', word: '医院', emojiCode: '1f3e5', stage: 2, unit: 44 },
  { char: '节', pinyin: 'jié', word: '节日', emojiCode: '1f38a', stage: 2, unit: 45 },
  { char: '礼', pinyin: 'lǐ', word: '礼物', emojiCode: '1f381', stage: 2, unit: 45 },
  { char: '糕', pinyin: 'gāo', word: '蛋糕', emojiCode: '1f382', stage: 2, unit: 45 },
  { char: '烛', pinyin: 'zhú', word: '蜡烛', emojiCode: '1f56f', stage: 2, unit: 45 },
  { char: '蜡', pinyin: 'là', word: '蜡笔', emojiCode: '1f58d', stage: 2, unit: 45 },
  { char: '甜', pinyin: 'tián', word: '甜的', emojiCode: '1f36c', stage: 2, unit: 45 },
  { char: '狐', pinyin: 'hú', word: '狐狸', emojiCode: '1f98a', stage: 2, unit: 46 },
  { char: '狸', pinyin: 'lí', word: '狐狸', emojiCode: null, stage: 2, unit: 46 },
  { char: '猩', pinyin: 'xīng', word: '猩猩', emojiCode: '1f98d', stage: 2, unit: 46 },
  { char: '豹', pinyin: 'bào', word: '豹子', emojiCode: '1f406', stage: 2, unit: 46 },
  { char: '热', pinyin: 'rè', word: '热', emojiCode: '1f975', stage: 2, unit: 47 },
  { char: '冷', pinyin: 'lěng', word: '冷', emojiCode: '1f976', stage: 2, unit: 47 },
  { char: '凉', pinyin: 'liáng', word: '凉快', emojiCode: null, stage: 2, unit: 47 },
  { char: '暖', pinyin: 'nuǎn', word: '暖和', emojiCode: null, stage: 2, unit: 47 },
  { char: '卡', pinyin: 'kǎ', word: '卡车', emojiCode: '1f69b', stage: 2, unit: 48 },
  { char: '摩', pinyin: 'mó', word: '摩托车', emojiCode: '1f3cd', stage: 2, unit: 48 },
  { char: '拖', pinyin: 'tuō', word: '拖拉机', emojiCode: '1f69c', stage: 2, unit: 48 },
  { char: '请', pinyin: 'qǐng', word: '请', emojiCode: null, stage: 2, unit: 49 },
  { char: '谢', pinyin: 'xiè', word: '谢谢', emojiCode: '1f64f', stage: 2, unit: 49 },
  { char: '对', pinyin: 'duì', word: '答对', emojiCode: '2705', stage: 2, unit: 49 },
  { char: '错', pinyin: 'cuò', word: '答错', emojiCode: '274c', stage: 2, unit: 49 },
  { char: '没', pinyin: 'méi', word: '没有', emojiCode: null, stage: 2, unit: 49 },
  { char: '帮', pinyin: 'bāng', word: '帮忙', emojiCode: null, stage: 2, unit: 49 },
  { char: '百', pinyin: 'bǎi', word: '一百', emojiCode: '1f4af', stage: 2, unit: 50 },
  { char: '零', pinyin: 'líng', word: '零', emojiCode: null, stage: 2, unit: 50 },
  { char: '双', pinyin: 'shuāng', word: '一双', emojiCode: '1f46b', stage: 2, unit: 50 },
  { char: '万', pinyin: 'wàn', word: '一万', emojiCode: null, stage: 2, unit: 50 },
```

- [ ] **Step 4: levels.js THEMES 补条目**

```js
  39: '幼儿园里', 40: '心情脸', 41: '反义词', 42: '来来回回', 43: '我和你',
  44: '城市生活', 45: '过节啦', 46: '动物园2', 47: '冷和热', 48: '车子多多',
  49: '有礼貌', 50: '数一数',
```

- [ ] **Step 5: 跑绿 + 提交**

`node scripts/smoke-test.mjs` 全 PASS(关卡数 51 = 28 小班 + 22 中班 + 1 大班复习;单元 41/42/43 有图字不足 3,轮次已自动换纯字玩法)

```bash
git add miniprogram/utils/characters.js miniprogram/utils/levels.js scripts/smoke-test.mjs
git commit -m "feat: 中班新增73字/12单元(幼儿园心情反义虚词城市节日动物冷热车辆礼貌数字)"
```

---

### Task 8: 大班新增 300 字(单元 52-66,15 个新单元)

> 字表编制口径(spec 3.2):以部编版一年级上册识字表内容为主题重组(开学/升国旗/江南/比尾巴/雪地里的小画家/乌鸦喝水/小蜗牛/项链等课文语汇),去掉与已学 300 字重复的部分,补充一年级下册常见字与现代高频字(电视/网络/环保/能源等)。与既有 300 字零重复由冒烟"字不重复"断言强制。

**Files:**
- Modify: `miniprogram/utils/characters.js`(追加 300 条)
- Modify: `miniprogram/utils/levels.js`(THEMES 补 52-66)
- Modify: `scripts/smoke-test.mjs`(终态字量断言)

**Interfaces:**
- Consumes: Task 1 的数据格式与 STAGE_PLAY 大班配置(optCap 5、3 练习)
- Produces: 全库终态 600 字 / 67 关;大班阶段池 300 字

- [ ] **Step 1: 冒烟断言更新(终态)**

characters 节:300→600(`check('600 字', CHARACTERS.length === 600)`,字不重复同步 600);阶段字量改 `150/150/300`。
levels 节:关卡数 51→67。levels 节追加:

```js
check('大班单元 3 练习 5 选项', STAGES[2].units.every((u) => {
  const lv = LEVELS.find((l) => l.id === u)
  return lv.rounds.length === 4 && lv.rounds.every((r) => r.type !== 'pic2char' && r.type !== 'sound2char'
    || r.options.every((o) => o === 5))
}))
```

- [ ] **Step 2: 跑红** → `node scripts/smoke-test.mjs`

- [ ] **Step 3: characters.js 追加大班新字(300 条,单元 52-66,每单元 20 字)**

```js
  // ===== 大班新增(单元 52-66)===== 以部编一年级上册语汇为主体重组+现代高频补充
  { char: '天', pinyin: 'tiān', word: '白天', emojiCode: null, stage: 3, unit: 52 },
  { char: '目', pinyin: 'mù', word: '目光', emojiCode: null, stage: 3, unit: 52 },
  { char: '片', pinyin: 'piàn', word: '一片', emojiCode: null, stage: 3, unit: 52 },
  { char: '会', pinyin: 'huì', word: '开会', emojiCode: null, stage: 3, unit: 52 },
  { char: '个', pinyin: 'gè', word: '一个', emojiCode: null, stage: 3, unit: 52 },
  { char: '词', pinyin: 'cí', word: '词语', emojiCode: null, stage: 3, unit: 52 },
  { char: '语', pinyin: 'yǔ', word: '语文', emojiCode: null, stage: 3, unit: 52 },
  { char: '句', pinyin: 'jù', word: '句子', emojiCode: null, stage: 3, unit: 52 },
  { char: '子', pinyin: 'zǐ', word: '孩子', emojiCode: null, stage: 3, unit: 52 },
  { char: '字', pinyin: 'zì', word: '写字', emojiCode: null, stage: 3, unit: 52 },
  { char: '刀', pinyin: 'dāo', word: '小刀', emojiCode: '1f52a', stage: 3, unit: 52 },
  { char: '尺', pinyin: 'chǐ', word: '尺子', emojiCode: '1f4cf', stage: 3, unit: 52 },
  { char: '写', pinyin: 'xiě', word: '写字', emojiCode: '270d', stage: 3, unit: 52 },
  { char: '读', pinyin: 'dú', word: '读书', emojiCode: null, stage: 3, unit: 52 },
  { char: '算', pinyin: 'suàn', word: '算数', emojiCode: null, stage: 3, unit: 52 },
  { char: '名', pinyin: 'míng', word: '名字', emojiCode: null, stage: 3, unit: 52 },
  { char: '班', pinyin: 'bān', word: '班级', emojiCode: null, stage: 3, unit: 52 },
  { char: '级', pinyin: 'jí', word: '年级', emojiCode: null, stage: 3, unit: 52 },
  { char: '组', pinyin: 'zǔ', word: '小组', emojiCode: null, stage: 3, unit: 52 },
  { char: '页', pinyin: 'yè', word: '书页', emojiCode: '1f4d4', stage: 3, unit: 52 },
  { char: '升', pinyin: 'shēng', word: '升旗', emojiCode: null, stage: 3, unit: 53 },
  { char: '国', pinyin: 'guó', word: '国旗', emojiCode: null, stage: 3, unit: 53 },
  { char: '旗', pinyin: 'qí', word: '红旗', emojiCode: '1f6a9', stage: 3, unit: 53 },
  { char: '起', pinyin: 'qǐ', word: '起床', emojiCode: null, stage: 3, unit: 53 },
  { char: '么', pinyin: 'me', word: '什么', emojiCode: null, stage: 3, unit: 53 },
  { char: '美', pinyin: 'měi', word: '美丽', emojiCode: null, stage: 3, unit: 53 },
  { char: '丽', pinyin: 'lì', word: '美丽', emojiCode: null, stage: 3, unit: 53 },
  { char: '影', pinyin: 'yǐng', word: '影子', emojiCode: null, stage: 3, unit: 53 },
  { char: '它', pinyin: 'tā', word: '它们', emojiCode: null, stage: 3, unit: 53 },
  { char: '好', pinyin: 'hǎo', word: '好人', emojiCode: '1f44d', stage: 3, unit: 53 },
  { char: '朋', pinyin: 'péng', word: '朋友', emojiCode: null, stage: 3, unit: 53 },
  { char: '友', pinyin: 'yǒu', word: '好友', emojiCode: null, stage: 3, unit: 53 },
  { char: '伙', pinyin: 'huǒ', word: '伙伴', emojiCode: null, stage: 3, unit: 53 },
  { char: '伴', pinyin: 'bàn', word: '伙伴', emojiCode: null, stage: 3, unit: 53 },
  { char: '姓', pinyin: 'xìng', word: '姓名', emojiCode: null, stage: 3, unit: 53 },
  { char: '氏', pinyin: 'shì', word: '姓氏', emojiCode: null, stage: 3, unit: 53 },
  { char: '李', pinyin: 'lǐ', word: '李子', emojiCode: null, stage: 3, unit: 53 },
  { char: '张', pinyin: 'zhāng', word: '张开', emojiCode: '1f3f9', stage: 3, unit: 53 },
  { char: '景', pinyin: 'jǐng', word: '风景', emojiCode: null, stage: 3, unit: 53 },
  { char: '世', pinyin: 'shì', word: '世界', emojiCode: '1f30d', stage: 3, unit: 53 },
  { char: '江', pinyin: 'jiāng', word: '江河', emojiCode: null, stage: 3, unit: 54 },
  { char: '南', pinyin: 'nán', word: '南方', emojiCode: null, stage: 3, unit: 54 },
  { char: '可', pinyin: 'kě', word: '可以', emojiCode: null, stage: 3, unit: 54 },
  { char: '采', pinyin: 'cǎi', word: '采花', emojiCode: null, stage: 3, unit: 54 },
  { char: '莲', pinyin: 'lián', word: '莲花', emojiCode: null, stage: 3, unit: 54 },
  { char: '东', pinyin: 'dōng', word: '东方', emojiCode: null, stage: 3, unit: 54 },
  { char: '西', pinyin: 'xī', word: '西方', emojiCode: null, stage: 3, unit: 54 },
  { char: '尖', pinyin: 'jiān', word: '尖尖的', emojiCode: null, stage: 3, unit: 54 },
  { char: '青', pinyin: 'qīng', word: '青山', emojiCode: null, stage: 3, unit: 54 },
  { char: '夏', pinyin: 'xià', word: '夏天', emojiCode: null, stage: 3, unit: 54 },
  { char: '弯', pinyin: 'wān', word: '弯弯的', emojiCode: null, stage: 3, unit: 54 },
  { char: '就', pinyin: 'jiù', word: '就是', emojiCode: null, stage: 3, unit: 54 },
  { char: '湖', pinyin: 'hú', word: '湖泊', emojiCode: null, stage: 3, unit: 54 },
  { char: '泊', pinyin: 'pō', word: '湖泊', emojiCode: null, stage: 3, unit: 54 },
  { char: '溪', pinyin: 'xī', word: '小溪', emojiCode: null, stage: 3, unit: 54 },
  { char: '池', pinyin: 'chí', word: '池塘', emojiCode: null, stage: 3, unit: 54 },
  { char: '塘', pinyin: 'táng', word: '池塘', emojiCode: null, stage: 3, unit: 54 },
  { char: '阵', pinyin: 'zhèn', word: '一阵雨', emojiCode: null, stage: 3, unit: 54 },
  { char: '冻', pinyin: 'dòng', word: '冰冻', emojiCode: null, stage: 3, unit: 54 },
  { char: '露', pinyin: 'lù', word: '露水', emojiCode: null, stage: 3, unit: 54 },
  { char: '比', pinyin: 'bǐ', word: '比一比', emojiCode: null, stage: 3, unit: 55 },
  { char: '尾', pinyin: 'wěi', word: '尾巴', emojiCode: null, stage: 3, unit: 55 },
  { char: '巴', pinyin: 'bā', word: '尾巴', emojiCode: null, stage: 3, unit: 55 },
  { char: '谁', pinyin: 'shuí', word: '是谁', emojiCode: null, stage: 3, unit: 55 },
  { char: '长', pinyin: 'cháng', word: '长短', emojiCode: null, stage: 3, unit: 55 },
  { char: '短', pinyin: 'duǎn', word: '短', emojiCode: null, stage: 3, unit: 55 },
  { char: '把', pinyin: 'bǎ', word: '把手', emojiCode: null, stage: 3, unit: 55 },
  { char: '伞', pinyin: 'sǎn', word: '雨伞', emojiCode: '2614', stage: 3, unit: 55 },
  { char: '公', pinyin: 'gōng', word: '公园', emojiCode: null, stage: 3, unit: 55 },
  { char: '力', pinyin: 'lì', word: '力气', emojiCode: null, stage: 3, unit: 55 },
  { char: '尘', pinyin: 'chén', word: '尘土', emojiCode: null, stage: 3, unit: 55 },
  { char: '从', pinyin: 'cóng', word: '从来', emojiCode: null, stage: 3, unit: 55 },
  { char: '众', pinyin: 'zhòng', word: '群众', emojiCode: null, stage: 3, unit: 55 },
  { char: '森', pinyin: 'sēn', word: '森林', emojiCode: null, stage: 3, unit: 55 },
  { char: '条', pinyin: 'tiáo', word: '一条', emojiCode: null, stage: 3, unit: 55 },
  { char: '男', pinyin: 'nán', word: '男孩', emojiCode: '1f468', stage: 3, unit: 55 },
  { char: '女', pinyin: 'nǚ', word: '女孩', emojiCode: '1f469', stage: 3, unit: 55 },
  { char: '正', pinyin: 'zhèng', word: '正好', emojiCode: null, stage: 3, unit: 55 },
  { char: '反', pinyin: 'fǎn', word: '相反', emojiCode: null, stage: 3, unit: 55 },
  { char: '声', pinyin: 'shēng', word: '声音', emojiCode: null, stage: 3, unit: 55 },
  { char: '船', pinyin: 'chuán', word: '小船', emojiCode: '26f4', stage: 3, unit: 56 },
  { char: '两', pinyin: 'liǎng', word: '两个', emojiCode: null, stage: 3, unit: 56 },
  { char: '头', pinyin: 'tóu', word: '里头', emojiCode: null, stage: 3, unit: 56 },
  { char: '见', pinyin: 'jiàn', word: '看见', emojiCode: null, stage: 3, unit: 56 },
  { char: '闪', pinyin: 'shǎn', word: '闪光', emojiCode: null, stage: 3, unit: 56 },
  { char: '那', pinyin: 'nà', word: '那里', emojiCode: null, stage: 3, unit: 56 },
  { char: '真', pinyin: 'zhēn', word: '真假', emojiCode: null, stage: 3, unit: 56 },
  { char: '老', pinyin: 'lǎo', word: '老人', emojiCode: '1f9d3', stage: 3, unit: 56 },
  { char: '吗', pinyin: 'ma', word: '好吗', emojiCode: null, stage: 3, unit: 56 },
  { char: '同', pinyin: 'tóng', word: '同学', emojiCode: null, stage: 3, unit: 56 },
  { char: '什', pinyin: 'shén', word: '什么', emojiCode: null, stage: 3, unit: 56 },
  { char: '才', pinyin: 'cái', word: '刚才', emojiCode: null, stage: 3, unit: 56 },
  { char: '亮', pinyin: 'liàng', word: '明亮', emojiCode: null, stage: 3, unit: 56 },
  { char: '时', pinyin: 'shí', word: '时间', emojiCode: null, stage: 3, unit: 56 },
  { char: '候', pinyin: 'hòu', word: '时候', emojiCode: null, stage: 3, unit: 56 },
  { char: '觉', pinyin: 'jiào', word: '睡觉', emojiCode: null, stage: 3, unit: 56 },
  { char: '得', pinyin: 'de', word: '觉得', emojiCode: null, stage: 3, unit: 56 },
  { char: '自', pinyin: 'zì', word: '自己', emojiCode: null, stage: 3, unit: 56 },
  { char: '很', pinyin: 'hěn', word: '很多', emojiCode: null, stage: 3, unit: 56 },
  { char: '数', pinyin: 'shǔ', word: '数星星', emojiCode: null, stage: 3, unit: 56 },
  { char: '穿', pinyin: 'chuān', word: '穿衣', emojiCode: null, stage: 3, unit: 57 },
  { char: '服', pinyin: 'fú', word: '衣服', emojiCode: null, stage: 3, unit: 57 },
  { char: '快', pinyin: 'kuài', word: '快乐', emojiCode: null, stage: 3, unit: 57 },
  { char: '皮', pinyin: 'pí', word: '皮球', emojiCode: null, stage: 3, unit: 57 },
  { char: '台', pinyin: 'tái', word: '台风', emojiCode: null, stage: 3, unit: 57 },
  { char: '儿', pinyin: 'ér', word: '儿子', emojiCode: null, stage: 3, unit: 57 },
  { char: '光', pinyin: 'guāng', word: '月光', emojiCode: null, stage: 3, unit: 57 },
  { char: '疑', pinyin: 'yí', word: '怀疑', emojiCode: null, stage: 3, unit: 57 },
  { char: '望', pinyin: 'wàng', word: '望着', emojiCode: null, stage: 3, unit: 57 },
  { char: '低', pinyin: 'dī', word: '低头', emojiCode: null, stage: 3, unit: 57 },
  { char: '故', pinyin: 'gù', word: '故事', emojiCode: null, stage: 3, unit: 57 },
  { char: '分', pinyin: 'fēn', word: '分开', emojiCode: null, stage: 3, unit: 57 },
  { char: '带', pinyin: 'dài', word: '带子', emojiCode: null, stage: 3, unit: 57 },
  { char: '念', pinyin: 'niàn', word: '想念', emojiCode: null, stage: 3, unit: 57 },
  { char: '彩', pinyin: 'cǎi', word: '彩色', emojiCode: null, stage: 3, unit: 57 },
  { char: '半', pinyin: 'bàn', word: '一半', emojiCode: null, stage: 3, unit: 57 },
  { char: '空', pinyin: 'kōng', word: '天空', emojiCode: null, stage: 3, unit: 57 },
  { char: '问', pinyin: 'wèn', word: '问题', emojiCode: null, stage: 3, unit: 57 },
  { char: '方', pinyin: 'fāng', word: '方向', emojiCode: null, stage: 3, unit: 57 },
  { char: '串', pinyin: 'chuàn', word: '一串', emojiCode: '1f517', stage: 3, unit: 57 },
  { char: '群', pinyin: 'qún', word: '一群', emojiCode: null, stage: 3, unit: 58 },
  { char: '用', pinyin: 'yòng', word: '有用', emojiCode: null, stage: 3, unit: 58 },
  { char: '几', pinyin: 'jǐ', word: '几个', emojiCode: null, stage: 3, unit: 58 },
  { char: '步', pinyin: 'bù', word: '脚步', emojiCode: null, stage: 3, unit: 58 },
  { char: '为', pinyin: 'wèi', word: '因为', emojiCode: null, stage: 3, unit: 58 },
  { char: '参', pinyin: 'cān', word: '参加', emojiCode: null, stage: 3, unit: 58 },
  { char: '加', pinyin: 'jiā', word: '加油', emojiCode: null, stage: 3, unit: 58 },
  { char: '洞', pinyin: 'dòng', word: '山洞', emojiCode: null, stage: 3, unit: 58 },
  { char: '乌', pinyin: 'wū', word: '乌云', emojiCode: null, stage: 3, unit: 58 },
  { char: '鸦', pinyin: 'yā', word: '乌鸦', emojiCode: null, stage: 3, unit: 58 },
  { char: '处', pinyin: 'chù', word: '到处', emojiCode: null, stage: 3, unit: 58 },
  { char: '找', pinyin: 'zhǎo', word: '找到', emojiCode: null, stage: 3, unit: 58 },
  { char: '办', pinyin: 'bàn', word: '办法', emojiCode: null, stage: 3, unit: 58 },
  { char: '旁', pinyin: 'páng', word: '旁边', emojiCode: null, stage: 3, unit: 58 },
  { char: '许', pinyin: 'xǔ', word: '许多', emojiCode: null, stage: 3, unit: 58 },
  { char: '法', pinyin: 'fǎ', word: '方法', emojiCode: null, stage: 3, unit: 58 },
  { char: '放', pinyin: 'fàng', word: '放心', emojiCode: null, stage: 3, unit: 58 },
  { char: '住', pinyin: 'zhù', word: '居住', emojiCode: null, stage: 3, unit: 58 },
  { char: '孩', pinyin: 'hái', word: '小孩', emojiCode: null, stage: 3, unit: 58 },
  { char: '吧', pinyin: 'ba', word: '去吧', emojiCode: null, stage: 3, unit: 58 },
  { char: '发', pinyin: 'fā', word: '发现', emojiCode: null, stage: 3, unit: 59 },
  { char: '芽', pinyin: 'yá', word: '发芽', emojiCode: null, stage: 3, unit: 59 },
  { char: '呀', pinyin: 'ya', word: '好呀', emojiCode: null, stage: 3, unit: 59 },
  { char: '久', pinyin: 'jiǔ', word: '好久', emojiCode: null, stage: 3, unit: 59 },
  { char: '答', pinyin: 'dá', word: '回答', emojiCode: null, stage: 3, unit: 59 },
  { char: '全', pinyin: 'quán', word: '全部', emojiCode: null, stage: 3, unit: 59 },
  { char: '变', pinyin: 'biàn', word: '变化', emojiCode: null, stage: 3, unit: 59 },
  { char: '蜻', pinyin: 'qīng', word: '蜻蜓', emojiCode: null, stage: 3, unit: 59 },
  { char: '蜓', pinyin: 'tíng', word: '蜻蜓', emojiCode: null, stage: 3, unit: 59 },
  { char: '蚯', pinyin: 'qiū', word: '蚯蚓', emojiCode: null, stage: 3, unit: 59 },
  { char: '蚓', pinyin: 'yǐn', word: '蚯蚓', emojiCode: null, stage: 3, unit: 59 },
  { char: '蝌', pinyin: 'kē', word: '蝌蚪', emojiCode: null, stage: 3, unit: 59 },
  { char: '蚪', pinyin: 'dǒu', word: '蝌蚪', emojiCode: null, stage: 3, unit: 59 },
  { char: '蜘', pinyin: 'zhī', word: '蜘蛛', emojiCode: '1f577', stage: 3, unit: 59 },
  { char: '蛛', pinyin: 'zhū', word: '蜘蛛', emojiCode: null, stage: 3, unit: 59 },
  { char: '网', pinyin: 'wǎng', word: '上网', emojiCode: null, stage: 3, unit: 59 },
  { char: '骏', pinyin: 'jùn', word: '骏马', emojiCode: null, stage: 3, unit: 59 },
  { char: '驴', pinyin: 'lǘ', word: '小驴', emojiCode: null, stage: 3, unit: 59 },
  { char: '犀', pinyin: 'xī', word: '犀牛', emojiCode: '1f98f', stage: 3, unit: 59 },
  { char: '猬', pinyin: 'wèi', word: '刺猬', emojiCode: '1f994', stage: 3, unit: 59 },
```
```js
  { char: '又', pinyin: 'yòu', word: '又是', emojiCode: null, stage: 3, unit: 60 },
  { char: '着', pinyin: 'zhe', word: '看着', emojiCode: null, stage: 3, unit: 60 },
  { char: '向', pinyin: 'xiàng', word: '方向', emojiCode: null, stage: 3, unit: 60 },
  { char: '和', pinyin: 'hé', word: '和平', emojiCode: null, stage: 3, unit: 60 },
  { char: '娃', pinyin: 'wá', word: '娃娃', emojiCode: null, stage: 3, unit: 60 },
  { char: '挂', pinyin: 'guà', word: '挂起', emojiCode: null, stage: 3, unit: 60 },
  { char: '活', pinyin: 'huó', word: '生活', emojiCode: null, stage: 3, unit: 60 },
  { char: '金', pinyin: 'jīn', word: '金子', emojiCode: null, stage: 3, unit: 60 },
  { char: '座', pinyin: 'zuò', word: '一座桥', emojiCode: null, stage: 3, unit: 60 },
  { char: '浇', pinyin: 'jiāo', word: '浇水', emojiCode: null, stage: 3, unit: 60 },
  { char: '提', pinyin: 'tí', word: '提水', emojiCode: null, stage: 3, unit: 60 },
  { char: '洒', pinyin: 'sǎ', word: '洒水', emojiCode: null, stage: 3, unit: 60 },
  { char: '挑', pinyin: 'tiāo', word: '挑水', emojiCode: null, stage: 3, unit: 60 },
  { char: '楼', pinyin: 'lóu', word: '大楼', emojiCode: '1f3e2', stage: 3, unit: 60 },
  { char: '市', pinyin: 'shì', word: '城市', emojiCode: null, stage: 3, unit: 60 },
  { char: '道', pinyin: 'dào', word: '道路', emojiCode: null, stage: 3, unit: 60 },
  { char: '汽', pinyin: 'qì', word: '汽车', emojiCode: null, stage: 3, unit: 60 },
  { char: '轮', pinyin: 'lún', word: '轮子', emojiCode: '1f6a4', stage: 3, unit: 60 },
  { char: '舰', pinyin: 'jiàn', word: '军舰', emojiCode: null, stage: 3, unit: 60 },
  { char: '别', pinyin: 'bié', word: '别人', emojiCode: null, stage: 3, unit: 60 },
  { char: '拔', pinyin: 'bá', word: '拔河', emojiCode: null, stage: 3, unit: 61 },
  { char: '踢', pinyin: 'tī', word: '踢球', emojiCode: null, stage: 3, unit: 61 },
  { char: '铜', pinyin: 'tóng', word: '铜牌', emojiCode: null, stage: 3, unit: 61 },
  { char: '锻', pinyin: 'duàn', word: '锻炼', emojiCode: null, stage: 3, unit: 61 },
  { char: '炼', pinyin: 'liàn', word: '锻炼', emojiCode: null, stage: 3, unit: 61 },
  { char: '体', pinyin: 'tǐ', word: '身体', emojiCode: null, stage: 3, unit: 61 },
  { char: '操', pinyin: 'cāo', word: '早操', emojiCode: null, stage: 3, unit: 61 },
  { char: '场', pinyin: 'chǎng', word: '操场', emojiCode: '1f3df', stage: 3, unit: 61 },
  { char: '推', pinyin: 'tuī', word: '推车', emojiCode: null, stage: 3, unit: 61 },
  { char: '拉', pinyin: 'lā', word: '拉手', emojiCode: null, stage: 3, unit: 61 },
  { char: '接', pinyin: 'jiē', word: '接球', emojiCode: null, stage: 3, unit: 61 },
  { char: '摘', pinyin: 'zhāi', word: '摘果', emojiCode: null, stage: 3, unit: 61 },
  { char: '抬', pinyin: 'tái', word: '抬头', emojiCode: null, stage: 3, unit: 61 },
  { char: '扔', pinyin: 'rēng', word: '扔掉', emojiCode: null, stage: 3, unit: 61 },
  { char: '捡', pinyin: 'jiǎn', word: '捡起', emojiCode: null, stage: 3, unit: 61 },
  { char: '拿', pinyin: 'ná', word: '拿走', emojiCode: null, stage: 3, unit: 61 },
  { char: '打', pinyin: 'dǎ', word: '打球', emojiCode: '1f44a', stage: 3, unit: 61 },
  { char: '排', pinyin: 'pái', word: '排队', emojiCode: null, stage: 3, unit: 61 },
  { char: '队', pinyin: 'duì', word: '队伍', emojiCode: null, stage: 3, unit: 61 },
  { char: '踩', pinyin: 'cǎi', word: '踩水', emojiCode: null, stage: 3, unit: 61 },
  { char: '午', pinyin: 'wǔ', word: '中午', emojiCode: null, stage: 3, unit: 62 },
  { char: '昨', pinyin: 'zuó', word: '昨天', emojiCode: null, stage: 3, unit: 62 },
  { char: '晚', pinyin: 'wǎn', word: '晚上', emojiCode: null, stage: 3, unit: 62 },
  { char: '今', pinyin: 'jīn', word: '今天', emojiCode: null, stage: 3, unit: 62 },
  { char: '年', pinyin: 'nián', word: '新年', emojiCode: null, stage: 3, unit: 62 },
  { char: '季', pinyin: 'jì', word: '季节', emojiCode: null, stage: 3, unit: 62 },
  { char: '暑', pinyin: 'shǔ', word: '暑假', emojiCode: null, stage: 3, unit: 62 },
  { char: '寒', pinyin: 'hán', word: '寒冷', emojiCode: null, stage: 3, unit: 62 },
  { char: '假', pinyin: 'jià', word: '放假', emojiCode: null, stage: 3, unit: 62 },
  { char: '悲', pinyin: 'bēi', word: '悲伤', emojiCode: null, stage: 3, unit: 62 },
  { char: '伤', pinyin: 'shāng', word: '伤心', emojiCode: null, stage: 3, unit: 62 },
  { char: '亲', pinyin: 'qīn', word: '亲人', emojiCode: null, stage: 3, unit: 62 },
  { char: '爱', pinyin: 'ài', word: '爱心', emojiCode: null, stage: 3, unit: 62 },
  { char: '想', pinyin: 'xiǎng', word: '想念', emojiCode: null, stage: 3, unit: 62 },
  { char: '念', pinyin: 'niàn', word: '念书', emojiCode: null, stage: 3, unit: 62 },
  { char: '急', pinyin: 'jí', word: '着急', emojiCode: null, stage: 3, unit: 62 },
  { char: '慌', pinyin: 'huāng', word: '慌张', emojiCode: null, stage: 3, unit: 62 },
  { char: '静', pinyin: 'jìng', word: '安静', emojiCode: null, stage: 3, unit: 62 },
  { char: '吵', pinyin: 'chǎo', word: '吵闹', emojiCode: null, stage: 3, unit: 62 },
  { char: '曲', pinyin: 'qǔ', word: '歌曲', emojiCode: '1f3b5', stage: 3, unit: 62 },
  { char: '城', pinyin: 'chéng', word: '城市', emojiCode: null, stage: 3, unit: 63 },
  { char: '乡', pinyin: 'xiāng', word: '乡下', emojiCode: null, stage: 3, unit: 63 },
  { char: '村', pinyin: 'cūn', word: '村庄', emojiCode: null, stage: 3, unit: 63 },
  { char: '危', pinyin: 'wēi', word: '危险', emojiCode: null, stage: 3, unit: 63 },
  { char: '险', pinyin: 'xiǎn', word: '危险', emojiCode: '26a0', stage: 3, unit: 63 },
  { char: '救', pinyin: 'jiù', word: '救命', emojiCode: '1f692', stage: 3, unit: 63 },
  { char: '迎', pinyin: 'yíng', word: '欢迎', emojiCode: null, stage: 3, unit: 63 },
  { char: '歉', pinyin: 'qiàn', word: '道歉', emojiCode: null, stage: 3, unit: 63 },
  { char: '意', pinyin: 'yì', word: '意思', emojiCode: null, stage: 3, unit: 63 },
  { char: '思', pinyin: 'sī', word: '思考', emojiCode: null, stage: 3, unit: 63 },
  { char: '知', pinyin: 'zhī', word: '知道', emojiCode: null, stage: 3, unit: 63 },
  { char: '道', pinyin: 'dào', word: '知道', emojiCode: null, stage: 3, unit: 63 },
  { char: '懂', pinyin: 'dǒng', word: '懂事', emojiCode: null, stage: 3, unit: 63 },
  { char: '事', pinyin: 'shì', word: '事情', emojiCode: null, stage: 3, unit: 63 },
  { char: '让', pinyin: 'ràng', word: '让开', emojiCode: null, stage: 3, unit: 63 },
  { char: '额', pinyin: 'é', word: '额头', emojiCode: null, stage: 3, unit: 63 },
  { char: '膀', pinyin: 'bǎng', word: '肩膀', emojiCode: null, stage: 3, unit: 63 },
  { char: '腰', pinyin: 'yāo', word: '弯腰', emojiCode: null, stage: 3, unit: 63 },
  { char: '肚', pinyin: 'dù', word: '肚子', emojiCode: null, stage: 3, unit: 63 },
  { char: '脑', pinyin: 'nǎo', word: '电脑', emojiCode: null, stage: 3, unit: 63 },
  { char: '视', pinyin: 'shì', word: '电视', emojiCode: '1f4fa', stage: 3, unit: 64 },
  { char: '联', pinyin: 'lián', word: '联结', emojiCode: null, stage: 3, unit: 64 },
  { char: '络', pinyin: 'luò', word: '网络', emojiCode: null, stage: 3, unit: 64 },
  { char: '环', pinyin: 'huán', word: '环保', emojiCode: '267b', stage: 3, unit: 64 },
  { char: '保', pinyin: 'bǎo', word: '保护', emojiCode: null, stage: 3, unit: 64 },
  { char: '能', pinyin: 'néng', word: '能力', emojiCode: null, stage: 3, unit: 64 },
  { char: '源', pinyin: 'yuán', word: '水源', emojiCode: null, stage: 3, unit: 64 },
  { char: '照', pinyin: 'zhào', word: '拍照', emojiCode: '1f4f7', stage: 3, unit: 64 },
  { char: '明', pinyin: 'míng', word: '明天', emojiCode: null, stage: 3, unit: 64 },
  { char: '话', pinyin: 'huà', word: '电话', emojiCode: '1f4de', stage: 3, unit: 64 },
  { char: '题', pinyin: 'tí', word: '题目', emojiCode: null, stage: 3, unit: 64 },
  { char: '次', pinyin: 'cì', word: '第一次', emojiCode: null, stage: 3, unit: 64 },
  { char: '第', pinyin: 'dì', word: '第一', emojiCode: null, stage: 3, unit: 64 },
  { char: '音', pinyin: 'yīn', word: '音乐', emojiCode: null, stage: 3, unit: 64 },
  { char: '样', pinyin: 'yàng', word: '样子', emojiCode: null, stage: 3, unit: 64 },
  { char: '脏', pinyin: 'zāng', word: '脏了', emojiCode: null, stage: 3, unit: 64 },
  { char: '疼', pinyin: 'téng', word: '疼爱', emojiCode: null, stage: 3, unit: 64 },
  { char: '痒', pinyin: 'yǎng', word: '痒痒', emojiCode: null, stage: 3, unit: 64 },
  { char: '干', pinyin: 'gān', word: '干净', emojiCode: null, stage: 3, unit: 64 },
  { char: '文', pinyin: 'wén', word: '语文', emojiCode: null, stage: 3, unit: 64 },
  { char: '叔', pinyin: 'shū', word: '叔叔', emojiCode: null, stage: 3, unit: 65 },
  { char: '阿', pinyin: 'ā', word: '阿姨', emojiCode: null, stage: 3, unit: 65 },
  { char: '姨', pinyin: 'yí', word: '阿姨', emojiCode: null, stage: 3, unit: 65 },
  { char: '伯', pinyin: 'bó', word: '伯伯', emojiCode: null, stage: 3, unit: 65 },
  { char: '婶', pinyin: 'shěn', word: '婶婶', emojiCode: null, stage: 3, unit: 65 },
  { char: '馒', pinyin: 'mán', word: '馒头', emojiCode: null, stage: 3, unit: 65 },
  { char: '粥', pinyin: 'zhōu', word: '白粥', emojiCode: null, stage: 3, unit: 65 },
  { char: '浆', pinyin: 'jiāng', word: '豆浆', emojiCode: null, stage: 3, unit: 65 },
  { char: '盐', pinyin: 'yán', word: '食盐', emojiCode: '1f9c2', stage: 3, unit: 65 },
  { char: '醋', pinyin: 'cù', word: '吃醋', emojiCode: null, stage: 3, unit: 65 },
  { char: '领', pinyin: 'lǐng', word: '领子', emojiCode: null, stage: 3, unit: 65 },
  { char: '袖', pinyin: 'xiù', word: '袖子', emojiCode: null, stage: 3, unit: 65 },
  { char: '衬', pinyin: 'chèn', word: '衬衣', emojiCode: null, stage: 3, unit: 65 },
  { char: '灰', pinyin: 'huī', word: '灰色', emojiCode: null, stage: 3, unit: 65 },
  { char: '紫', pinyin: 'zǐ', word: '紫色', emojiCode: null, stage: 3, unit: 65 },
  { char: '棕', pinyin: 'zōng', word: '棕色', emojiCode: null, stage: 3, unit: 65 },
  { char: '粉', pinyin: 'fěn', word: '粉色', emojiCode: null, stage: 3, unit: 65 },
  { char: '房', pinyin: 'fáng', word: '房子', emojiCode: null, stage: 3, unit: 65 },
  { char: '屋', pinyin: 'wū', word: '房屋', emojiCode: null, stage: 3, unit: 65 },
  { char: '顶', pinyin: 'dǐng', word: '屋顶', emojiCode: null, stage: 3, unit: 65 },
  { char: '诗', pinyin: 'shī', word: '诗歌', emojiCode: null, stage: 3, unit: 66 },
  { char: '要', pinyin: 'yào', word: '不要', emojiCode: null, stage: 3, unit: 66 },
  { char: '点', pinyin: 'diǎn', word: '点头', emojiCode: null, stage: 3, unit: 66 },
  { char: '过', pinyin: 'guò', word: '过来', emojiCode: null, stage: 3, unit: 66 },
  { char: '给', pinyin: 'gěi', word: '送给', emojiCode: null, stage: 3, unit: 66 },
  { char: '当', pinyin: 'dāng', word: '当时', emojiCode: null, stage: 3, unit: 66 },
  { char: '以', pinyin: 'yǐ', word: '可以', emojiCode: null, stage: 3, unit: 66 },
  { char: '种', pinyin: 'zhǒng', word: '种子', emojiCode: null, stage: 3, unit: 66 },
  { char: '植', pinyin: 'zhí', word: '植物', emojiCode: '1f331', stage: 3, unit: 66 },
  { char: '根', pinyin: 'gēn', word: '树根', emojiCode: null, stage: 3, unit: 66 },
  { char: '单', pinyin: 'dān', word: '单独', emojiCode: null, stage: 3, unit: 66 },
  { char: '脸', pinyin: 'liǎn', word: '笑脸', emojiCode: null, stage: 3, unit: 66 },
  { char: '加', pinyin: 'jiā', word: '加法', emojiCode: '2795', stage: 3, unit: 66 },
  { char: '减', pinyin: 'jiǎn', word: '减法', emojiCode: '2796', stage: 3, unit: 66 },
  { char: '乘', pinyin: 'chéng', word: '乘法', emojiCode: '2716', stage: 3, unit: 66 },
  { char: '除', pinyin: 'chú', word: '除法', emojiCode: '2797', stage: 3, unit: 66 },
  { char: '等', pinyin: 'děng', word: '等于', emojiCode: null, stage: 3, unit: 66 },
  { char: '于', pinyin: 'yú', word: '等于', emojiCode: null, stage: 3, unit: 66 },
  { char: '号', pinyin: 'hào', word: '号码', emojiCode: null, stage: 3, unit: 66 },
  { char: '元', pinyin: 'yuán', word: '一元钱', emojiCode: '1f4b5', stage: 3, unit: 66 },
```

- [ ] **Step 4: levels.js THEMES 补条目**

```js
  52: '开学第一天', 53: '我是中国娃', 54: '江南水乡', 55: '比一比', 56: '船和星星',
  57: '衣食住行', 58: '雪地小画家', 59: '虫虫总动员', 60: '童话小镇', 61: '运动健将',
  62: '四季心情', 63: '城乡生活', 64: '现代生活', 65: '大家庭', 66: '有用的字',
```

- [ ] **Step 5: 跑绿 + 提交**

`node scripts/smoke-test.mjs` 全 PASS(600 字、67 关、大班 3 练习 5 选项、emoji 唯一)

```bash
git add miniprogram/utils/characters.js miniprogram/utils/levels.js scripts/smoke-test.mjs
git commit -m "feat: 大班新增300字/15单元(部编一上语汇重组+现代高频,幼小衔接)"
```

---

### Task 9: 素材脚本改单一数据源 + 按阶段分批

**Files:**
- Modify: `scripts/gen-new-assets.mjs`(顶部数据源重写)

**Interfaces:**
- Consumes: `miniprogram/utils/characters.js` 的 `CHARACTERS`(经 createRequire;该文件纯数据无 wx 依赖,可直接 require)
- Produces: CLI `node scripts/gen-new-assets.mjs <1|2|3>`,只生成对应阶段新增单元(小班 10-27 / 中班 39-50 / 大班 52-66)的素材;emojiCode null 的字跳过图片只出音频

- [ ] **Step 1: 重写脚本头部(删除内嵌 NEW_CHARS 数组及其后对它的三处引用改为 NEW_CHARS 变量名不变)**

```js
// 新增字素材生成:OpenMoji SVG(jsdelivr CDN) -> 618x618 PNG + Windows Huihui TTS 两条 wav
// 用法: node scripts/gen-new-assets.mjs <1|2|3>  (阶段;只生成该阶段新增单元的字)
// 产物: scripts/new-assets/assets/{images,audio}/,上传云存储后即可删除
// 数据源 = miniprogram/utils/characters.js 单一事实来源;emojiCode null 的字跳过图片只生成音频
import { mkdirSync, writeFileSync, existsSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import sharp from 'sharp' // 需先在 scripts 下 npm install(见 package.json)

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, 'new-assets/assets')
const CDN = 'https://cdn.jsdelivr.net/npm/openmoji@15.0.0/color/svg'

const require_ = createRequire(join(__dirname, '../miniprogram/utils/__smoke__.js'))
const { CHARACTERS } = require_('./characters')

const NEW_UNIT_RANGES = { 1: [10, 27], 2: [39, 50], 3: [52, 66] }
const stage = Number(process.argv[2])
if (!NEW_UNIT_RANGES[stage]) {
  console.error('用法: node scripts/gen-new-assets.mjs <1|2|3>')
  process.exit(1)
}
const [lo, hi] = NEW_UNIT_RANGES[stage]
const NEW_CHARS = CHARACTERS.filter((c) => c.unit >= lo && c.unit <= hi)
const IMG_CHARS = NEW_CHARS.filter((c) => c.emojiCode)
console.log(`阶段 ${stage}:共 ${NEW_CHARS.length} 字,其中 ${IMG_CHARS.length} 字生成图片,音频 ${NEW_CHARS.length * 2} 条`)
```

图片生成循环的 `for (const c of NEW_CHARS)` 改为 `for (const c of IMG_CHARS)`;TTS 与校验循环保持 `NEW_CHARS`,但校验中图片检查同样只遍历 `IMG_CHARS`(音频两条仍校验全部字)。

- [ ] **Step 2: 干跑验证(不产素材,仅验证数据源接线)**

Run: `node scripts/gen-new-assets.mjs`
Expected: 打印用法后 exit 1(参数缺失,证明接线正常)
Run: `node scripts/gen-new-assets.mjs 1`
Expected: 打印 "阶段 1:共 95 字,其中 95 字生成图片,音频 190 条",然后开始下载图片(jsdelivr 可达时)。若某字 SVG 下载失败:回 characters.js 修正该字 emojiCode(换近似码)后重跑(脚本对已存在文件自动跳过)。

- [ ] **Step 3: 提交**

```bash
git add scripts/gen-new-assets.mjs
git commit -m "refactor: 素材脚本改读characters.js单一数据源+按阶段分批+无图字跳图"
```

---

### Task 10: 三批素材生成与上云

**Files:**
- 产物: `scripts/new-assets/assets/`(不提交 git,上云后可删)
- 参考: `scripts/upload-assets.md`(执行者先读,沿用既有上传流程)

**Interfaces:**
- Consumes: Task 9 的分批脚本;云存储 ASSET_BASE(见 `miniprogram/config.js`)
- Produces: 云端 `assets/images/<hex>.png` 与 `assets/audio/<hex>.wav`、`<hex>-word.wav` 补齐 468 字素材

- [ ] **Step 1: 小班批**

Run: `node scripts/gen-new-assets.mjs 1`
Expected: 全部 95 图 + 190 音生成,末尾打印"全部 95 字素材生成完成(images 95 + audio 190)",无"图异常/音过短"
(失败处理:图下载失败→换 emojiCode 重跑;音过短→删除该 wav 重跑)

- [ ] **Step 2: 中班批**

Run: `node scripts/gen-new-assets.mjs 2`
Expected: 打印 "共 73 字,其中 37 字生成图片,音频 146 条",图片只生成有码字,校验全绿

- [ ] **Step 3: 大班批**

Run: `node scripts/gen-new-assets.mjs 3`
Expected: 打印 "共 300 字,其中 N 字生成图片,音频 600 条"(N≈40),校验全绿

- [ ] **Step 4: 上云**

按 `scripts/upload-assets.md` 既有流程,把 `scripts/new-assets/assets/images/` 与 `audio/` 上传至云存储 `assets/` 对应目录(所有用户可读)。

- [ ] **Step 5: 云端抽查**

任取 3 个新字(如 桃/请/加)与 1 条组词音,拼 `ASSET_BASE` URL 用 curl 验证 HTTP 200:
`https://<ASSET_BASE>/images/6843.png`(桃)、`/audio/8bf7.wav`(请)、`/audio/52a0.wav`(加)、`/audio/6843-word.wav`(桃,组词音)

- [ ] **Step 6: 提交(无代码变更则跳过)**

---

### Task 11: 全量验收

**Files:**
- 无新文件;最终校验

- [ ] **Step 1: 冒烟全绿**

Run: `node scripts/smoke-test.mjs`
Expected: 全部 PASS,含终态断言:600 字、67 关、阶段 150/150/300、emoji 唯一、语音按阶段、无图单元换玩法、解锁派生

- [ ] **Step 2: 开发者工具/真机走查清单**

- 地图页:三页签(小班/中班/大班)、锁定页签 toast、默认停当前阶段、总进度 X/600
- 小班任一单元:标题显示目标字(找一找)
- 中班任一含找一找/气泡/打地鼠单元:🔊 语音提示模式,答错 1.2s 重播
- 中班"反义词/来来回回/我和你"单元:全部纯字玩法(无看图选字/翻牌/连连看)
- Storage 置 `{"unlockedLevel":28,"stars":{"1":3}}` 进小班复习:识字卡为阶段抽样字、练习混排
- 大班任一生成单元:3 个练习、选择题 5 个选项
- 新字图片/音频正常加载(任选小班新单元完整通关一次)

- [ ] **Step 3: 收尾提交**

```bash
git add -A
git commit -m "chore: 三级分级体系全量验收通过(600字/67关)"
```
