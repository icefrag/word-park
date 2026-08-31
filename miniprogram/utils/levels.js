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
  10: '好吃的水果', 11: '香喷喷的饭', 12: '厨房里', 13: '身体真奇妙', 14: '池塘边',
  15: '虫虫飞', 16: '动物大王', 17: '天上飞', 18: '大海里', 19: '动起来',
  20: '讲卫生', 21: '天气好吗', 22: '花儿朵朵', 23: '大森林', 24: '玩一玩',
  25: '漂亮穿戴', 26: '时间滴答', 27: '出门坐车',
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

module.exports = { LEVELS, STAGES, THEMES, unitStage }
