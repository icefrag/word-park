// 纯函数出题器 — 不依赖 DOM,全部可测
function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// 为 target 挑 n 个干扰字(不含 target、彼此不重复);池不足时有多少给多少
function pickDistractors(targetChar, poolChars, n) {
  return shuffle(poolChars.filter((c) => c !== targetChar)).slice(0, n)
}

// 一道选择题:正确项 + 干扰项,打乱返回
function makeOptions(targetChar, poolChars, optionCount) {
  return shuffle([targetChar, ...pickDistractors(targetChar, poolChars, optionCount - 1)])
}

// 选择题序列:targets 逐个出题,选项数按 optionCounts 循环
function buildQuestions(targetChars, poolChars, optionCounts) {
  return targetChars.map((t, i) => ({
    target: t,
    options: makeOptions(t, poolChars, optionCounts[i % optionCounts.length]),
  }))
}

// 找一找网格:size 格中含 copies 个目标字,其余为干扰字
function buildFindAllGrid(targetChar, poolChars, size = 9, copies = 3) {
  const distractors = pickDistractors(targetChar, poolChars, size - copies)
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

// 有图字(emojiCode 非空):pic2char/match/link 的目标字必须从中抽
function imageChars(chars) {
  return chars.filter((c) => c.emojiCode)
}

// 渐进提示:挑下一个待排除的干扰项(跳过目标与已排除项);无可排除时返回 null
function nextDimPick(options, target, dimMap) {
  return options.find((o) => o !== target && !dimMap[o]) || null
}

module.exports = {
  shuffle,
  pickDistractors,
  makeOptions,
  buildQuestions,
  buildFindAllGrid,
  buildMatchCards,
  buildBubbleTargets,
  imageChars,
  nextDimPick,
}
