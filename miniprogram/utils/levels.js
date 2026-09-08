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
      { type: 'findall', count: 2 },
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
  10: '好吃的水果', 11: '香喷喷的饭', 12: '厨房里', 13: '身体真奇妙', 14: '池塘边',
  15: '虫虫飞', 16: '动物大王', 17: '天上飞', 18: '大海里', 19: '动起来',
  20: '讲卫生', 21: '天气好吗', 22: '花儿朵朵', 23: '大森林', 24: '玩一玩',
  25: '漂亮穿戴', 26: '时间滴答', 27: '出门坐车',
  29: '我的家', 30: '好吃的', 31: '动一动', 32: '穿戴上', 33: '出门去',
  34: '颜色', 35: '大自然', 36: '一天四季', 37: '方位', 38: '小身体与文具',
  39: '幼儿园里', 40: '心情脸', 41: '反义词', 42: '来来回回', 43: '我和你',
  44: '城市生活', 45: '过节啦', 46: '动物园2', 47: '冷和热', 48: '车子多多',
  49: '有礼貌', 50: '数一数',
  52: '开学第一天', 53: '我是中国娃', 54: '江南水乡', 55: '比一比', 56: '船和星星',
  57: '衣食住行', 58: '雪地小画家', 59: '虫虫总动员', 60: '童话小镇', 61: '运动健将',
  62: '四季心情', 63: '城乡生活', 64: '现代生活', 65: '大家庭', 66: '有用的字',
}

// 阶段玩法配置:小班温和(3 选项 2 练习,无操作类),中班全池轮换(3→4 选项),大班拉满(5 选项 3 练习,偏重操作玩法)
const STAGE_PLAY = {
  1: { templates: [['pic2char', 'sound2char'], ['sound2char', 'findall'], ['pic2char', 'match'], ['sound2char', 'match']] },
  2: {
    templates: [
      ['pic2char', 'sound2char'],
      ['sound2char', 'findall'],
      ['whack', 'link'],
      ['pic2char', 'match'],
      ['link', 'whack'],
      ['bubble', 'sound2char'],
    ],
  },
  3: {
    templates: [
      ['findall', 'whack', 'link'],
      ['link', 'findall', 'match'],
      ['pic2char', 'findall', 'whack'],
      ['match', 'sound2char', 'link'],
      ['findall', 'link', 'whack'],
      ['bubble', 'findall', 'whack'],
    ],
  },
}
// 操作类玩法节奏按阶段分档:中班反应窗口放宽,大班收紧(未配置的小班不出现这两类玩法)
const STAGE_RHYTHM = {
  2: { moleLifetime: 2000, moleSpawn: 1100, bubbleSpawn: 1600 },
  3: { moleLifetime: 1700, moleSpawn: 1000, bubbleSpawn: 1300 },
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
  if (type === 'bubble') return { target: 10 }
  return { count: Math.min(n, 4), options: Array(3).fill(optCap) }
}

// 单个练习轮:图玩法降级按本段字判定,语音提示按阶段(spec P0-4 起段与全单元共用)
function practiceRound(seg, i, tpls, optCap, stage) {
  let t = tpls[i % tpls.length]
  const imgCount = seg.filter((c) => c.emojiCode).length
  if (PIC_FALLBACK[t] && imgCount < (t === 'pic2char' ? 3 : 4)) t = PIC_FALLBACK[t]
  const r = { type: t, ...roundParams(t, seg.length, optCap) }
  if (VOICE_TYPES.includes(t) && stage >= 2) r.voice = true
  return r
}

// 大班 20 字一关过重,拆段 5 字/段:每段=识字卡+1练习,段间休息过场(spec P0-4)
const SEGMENT = 5

function generateUnit(unit) {
  const stage = unitStage(unit)
  const s = STAGES[stage - 1]
  const idx = s.units.indexOf(unit)
  const optCap = stage === 1 ? 3 : stage === 2 ? Math.min(4, 3 + Math.floor(idx / 4)) : 5
  const chars = byUnit(unit)
  const tpls = STAGE_PLAY[stage].templates[idx % STAGE_PLAY[stage].templates.length]
  if (stage === 3) {
    const segs = Array.from({ length: Math.ceil(chars.length / SEGMENT) }, (_, i) =>
      chars.slice(i * SEGMENT, (i + 1) * SEGMENT))
    const rounds = []
    segs.forEach((seg, i) => {
      rounds.push({ type: 'flashcard', band: i })
      const practice = practiceRound(seg, i, tpls, optCap, stage)
      practice.band = i
      rounds.push(practice)
      if (i < segs.length - 1) rounds.push({ type: 'break' })
    })
    return { id: unit, theme: THEMES[unit], rounds }
  }
  const rounds = [{ type: 'flashcard' }]
  tpls.forEach((_, i) => rounds.push(practiceRound(chars, i, tpls, optCap, stage)))
  return { id: unit, theme: THEMES[unit], rounds }
}

// 复习单元:玩法组合固定,出题字池运行时由 play 页从本阶段已学字抽样(spec 第 6 节)
function generateReview(stage) {
  const optCap = stage === 1 ? 3 : stage === 2 ? 4 : 5
  const defs = {
    1: [['sound2char', { count: 4 }], ['findall', { count: 2 }]],
    2: [['pic2char', { count: 4 }], ['findall', { count: 3 }]],
    3: [['findall', { count: 3 }], ['whack', { target: 10 }], ['sound2char', { count: 5 }]],
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

module.exports = { LEVELS, STAGES, THEMES, SEGMENT, STAGE_RHYTHM, unitStage }
