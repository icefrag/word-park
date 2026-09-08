// 纯函数出题器 — 不依赖 DOM,全部可测
function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// 拼音声调剥离(音近判定用):āáǎà→a、ǖǘǚǜ/ü→v
const TONE_MAP = {
  ā: 'a', á: 'a', ǎ: 'a', à: 'a', ē: 'e', é: 'e', ě: 'e', è: 'e',
  ī: 'i', í: 'i', ǐ: 'i', ì: 'i', ō: 'o', ó: 'o', ǒ: 'o', ò: 'o',
  ū: 'u', ú: 'u', ǔ: 'u', ù: 'u', ǖ: 'v', ǘ: 'v', ǚ: 'v', ǜ: 'v', ü: 'v',
}
const stripTone = (py) => [...py].map((ch) => TONE_MAP[ch] ?? ch).join('')

// 为 target 挑 n 个干扰字(不含 target、彼此不重复);池不足时有多少给多少
// opts = { pinyin: {char→拼音}, confusable: {char→[形近字]} }:音近(去调同音)与形近轮转混排再随机补足;缺省纯随机(小班)
function pickDistractors(targetChar, poolChars, n, opts) {
  const cands = poolChars.filter((c) => c !== targetChar)
  if (!opts) return shuffle(cands).slice(0, n)
  const base = opts.pinyin[targetChar] ? stripTone(opts.pinyin[targetChar]) : null
  const conf = opts.confusable[targetChar] || []
  const near = cands.filter((c) => base && opts.pinyin[c] && stripTone(opts.pinyin[c]) === base)
  const look = cands.filter((c) => conf.includes(c) && !near.includes(c))
  const rest = cands.filter((c) => !near.includes(c) && !look.includes(c))
  // 轮转取 near/look(防同音饱和,3选项≈1音近+1形近),不足再随机
  const mixed = []
  const queues = [shuffle(near), shuffle(look)]
  for (let qi = 0; mixed.length < n && queues.some((q) => q.length); qi++) {
    const q = queues[qi % queues.length]
    if (q.length) mixed.push(q.pop())
  }
  return [...mixed, ...shuffle(rest)].slice(0, n)
}

// 一道选择题:正确项 + 干扰项,打乱返回
function makeOptions(targetChar, poolChars, optionCount, opts) {
  return shuffle([targetChar, ...pickDistractors(targetChar, poolChars, optionCount - 1, opts)])
}

// 选择题序列:targets 逐个出题,选项数按 optionCounts 循环
function buildQuestions(targetChars, poolChars, optionCounts, opts) {
  return targetChars.map((t, i) => ({
    target: t,
    options: makeOptions(t, poolChars, optionCounts[i % optionCounts.length], opts),
  }))
}

// 找一找网格:size 格中含 copies 个目标字,其余为干扰字
function buildFindAllGrid(targetChar, poolChars, size = 9, copies = 3, opts) {
  const distractors = pickDistractors(targetChar, poolChars, size - copies, opts)
  const cells = []
  for (let i = 0; i < copies; i++) cells.push(targetChar)
  for (let i = 0; i < size - copies; i++) cells.push(distractors[i % distractors.length] ?? targetChar)
  return shuffle(cells)
}

// 翻牌配对/连连看共用:字对象数组每字两张(字牌+图牌),打乱
function buildMatchCards(chars) {
  const cards = []
  for (const c of chars) {
    cards.push({ key: `${c.char}-char`, data: c, kind: 'char' })
    cards.push({ key: `${c.char}-img`, data: c, kind: 'image' })
  }
  return shuffle(cards)
}

// 气泡/打地鼠目标序列:从池随机采样 total 个(允许重复)
function buildBubbleTargets(poolChars, total) {
  return Array.from({ length: total }, () => poolChars[Math.floor(Math.random() * poolChars.length)])
}

// 旧字抽样(间隔效应):常错字必进样本(错字回流兜底);其余按"距上次出现的单元数"取 top-3n 随机抽(保多样性)
function pickReviewTargets(oldChars, currentUnit, n, stats = {}) {
  if (n <= 0 || oldChars.length === 0) return []
  const score = (c) => {
    const s = stats[c.char] || {}
    return currentUnit - (s.lastUnit ?? c.unit) + (s.wrong ?? 0) * 10
  }
  const sorted = [...oldChars].sort((a, b) => score(b) - score(a))
  const wrongs = sorted.filter((c) => (stats[c.char] || {}).wrong > 0).slice(0, n)
  const rest = shuffle(sorted.filter((c) => !wrongs.includes(c)).slice(0, n * 3)).slice(0, n - wrongs.length)
  return shuffle([...wrongs, ...rest])
}

// 练习目标混合:错字(≤2,打乱轮换)→ 旧字(count≥5 配 2 否则 1)→ 单元新字补足;至少保留 1 个新字
function mixTargets(unitChars, wrongChars, oldChars, count) {
  const wrong = shuffle([...new Set(wrongChars)]).slice(0, Math.min(2, count - 1))
  const old = [...new Set(oldChars)]
    .filter((c) => !wrong.includes(c) && !unitChars.includes(c))
    .slice(0, Math.max(0, Math.min(count >= 5 ? 2 : 1, count - 1 - wrong.length)))
  const fresh = shuffle(unitChars.filter((c) => !wrong.includes(c) && !old.includes(c)))
  return shuffle([...wrong, ...old, ...fresh.slice(0, count - wrong.length - old.length)])
}

// 有图字(emojiCode 非空):pic2char/match/link 的目标字必须从中抽
function imageChars(chars) {
  return chars.filter((c) => c.emojiCode)
}

module.exports = {
  shuffle,
  pickDistractors,
  stripTone,
  makeOptions,
  buildQuestions,
  buildFindAllGrid,
  buildMatchCards,
  buildBubbleTargets,
  pickReviewTargets,
  mixTargets,
  imageChars,
}
