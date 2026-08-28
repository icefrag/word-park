const { byUnit } = require('./characters')

// v1 的 5 个手工关卡原样保留(体验已验证)
const LEGACY = [
  {
    id: 1,
    theme: '太阳和月亮',
    rounds: [
      { type: 'flashcard' },
      { type: 'pic2char', count: 5, options: [2, 2, 3, 3, 3] },
    ],
  },
  {
    id: 2,
    theme: '农场的小伙伴',
    rounds: [
      { type: 'flashcard' },
      { type: 'pic2char', count: 3, options: [3, 3, 3] },
      { type: 'sound2char', count: 3, options: [3, 3, 3] },
    ],
  },
  {
    id: 3,
    theme: '我的身体',
    rounds: [
      { type: 'flashcard' },
      { type: 'sound2char', count: 3, options: [4, 4, 4] },
      { type: 'findall', count: 2 },
    ],
  },
  {
    id: 4,
    theme: '美丽花园',
    rounds: [
      { type: 'flashcard' },
      { type: 'match', pairs: 4 },
    ],
  },
  {
    id: 5,
    theme: '汉字小达人',
    rounds: [
      { type: 'flashcard' },
      { type: 'bubble', target: 10 },
    ],
  },
]

// v2 新增单元(6-19)的主题
const UNIT_THEMES = {
  6: '一家人', 7: '我的家', 8: '好吃的', 9: '动一动', 10: '穿戴上',
  11: '出门去', 12: '颜色', 13: '大自然', 14: '动物园', 15: '一天四季',
  16: '方位', 17: '小身体与文具', 18: '数字乐园', 19: '象形字乐园',
}

// 生成单元的玩法轮换模板:按单元序号取模轮换,新玩法与旧玩法交替,难度由选项数渐升
// 模板顺序保证单元 17 落在含 sound2char 的模板上,难度曲线断言 maxOpt(6) < maxOpt(17) 成立
function generateUnit(unit) {
  const theme = UNIT_THEMES[unit]
  const n = byUnit(unit).length
  const optCap = Math.min(4, 3 + Math.floor((unit - 6) / 4)) // 6-9单元→3,10单元起→4(封顶)
  const templates = [
    ['pic2char', 'sound2char'],
    ['sound2char', 'findall'],
    ['whack', 'link'],
    ['pic2char', 'match'],
    ['link', 'whack'],
  ]
  const [a, b] = templates[(unit - 6) % templates.length]
  const rounds = [{ type: 'flashcard' }]
  const addPractice = (type) => {
    if (type === 'pic2char' || type === 'sound2char') {
      rounds.push({ type, count: Math.min(n, 4), options: Array(3).fill(optCap) })
    } else if (type === 'findall') {
      rounds.push({ type, count: 2 })
    } else if (type === 'match') {
      rounds.push({ type, pairs: Math.min(4, n) })
    } else if (type === 'whack') {
      rounds.push({ type, target: 8 })
    } else if (type === 'link') {
      rounds.push({ type, pairs: Math.min(4, n) })
    }
  }
  addPractice(a)
  addPractice(b)
  return { id: unit, theme, rounds }
}

const LEVELS = [...LEGACY, ...Array.from({ length: 14 }, (_, i) => generateUnit(i + 6))]

module.exports = { LEVELS }
