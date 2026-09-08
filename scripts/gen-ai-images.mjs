// AI 字图生成:MiniMax image-01 文生图 -> 边缘泛洪抠白 -> 618x618 透明 PNG
// 用法: node scripts/gen-ai-images.mjs chars 爸 妈 ...   (指定字,强制重生成)
//       node scripts/gen-ai-images.mjs missing            (只补本地不存在的图)
//       node scripts/gen-ai-images.mjs all --force        (全部重生成)
// 场景提示词: scripts/ai-prompts.json(逐字人工撰写,规范见 .agents/skills/char-image/SKILL.md)
// 密钥: scripts/.env 的 MINIMAX_API_KEY(不入库);原图缓存在 scripts/ai-raw/(可离线重加工)
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIRS = [join(__dirname, 'new-assets/assets/images'), join(__dirname, '../upload-cloud/images')]
const RAW_DIR = join(__dirname, 'ai-raw')
const API_HOSTS = ['https://api.minimaxi.com', 'https://api.minimax.cn'] // 文档站域名优先,失败轮换
const DELAY_MS = 600
const MAX_RETRY = 3
const SIZE = 618

const keyMatch = readFileSync(join(__dirname, '.env'), 'utf8').match(/MINIMAX_API_KEY=(.+)/)
if (!keyMatch) throw new Error('scripts/.env 缺少 MINIMAX_API_KEY')
const KEY = keyMatch[1].trim()

const require_ = createRequire(join(__dirname, '../miniprogram/utils/__smoke__.js'))
const { CHARACTERS } = require_('./characters')
const SCENES = JSON.parse(readFileSync(join(__dirname, 'ai-prompts.json'), 'utf8'))

// 与 characters.js assetName 同规则:中文转 hex 码点(土 -> 571f)
function asciiName(name) {
  return [...name].map((ch) => (/^[\x20-\x7e]$/.test(ch) ? ch : ch.charCodeAt(0).toString(16))).join('')
}

// 风格模板:全项目图片风格唯一事实来源,与 skill 文档保持一致
const STYLE = [
  '可爱Q版卡通儿童插画', '圆润饱满的造型', '糖果色明亮配色', '色彩鲜艳层次柔和',
  '单个主体居中占满画面', '构图简洁细节少而清晰', '纯白背景',
  '画面中绝对不出现任何文字、字母、数字和汉字', '画面元素数量与描述严格一致',
].join(',')

function buildPrompt(c) {
  const scene = SCENES[c.char]
  if (!scene) throw new Error(`ai-prompts.json 缺少「${c.char}」的场景提示词`)
  return `儿童识字卡片插画,表达汉字「${c.char}」(${c.word})的含义:${scene}。${STYLE}`
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

let hostIdx = 0
async function generate(prompt) {
  for (let attempt = 1; attempt <= MAX_RETRY; attempt++) {
    try {
      const res = await fetch(`${API_HOSTS[hostIdx]}/v1/image_generation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
        body: JSON.stringify({
          model: 'image-01', prompt, aspect_ratio: '1:1',
          response_format: 'url', n: 1, prompt_optimizer: false, aigc_watermark: false,
        }),
      })
      const body = await res.json().catch(() => ({}))
      const code = body?.base_resp?.status_code ?? res.status
      if (!body?.data?.image_urls?.length) console.error('[debug]', res.status, JSON.stringify(body).slice(0, 300))
      if (code === 0 && body?.data?.image_urls?.[0]) return body.data.image_urls[0]
      if (code === 1004 || code === 2049) throw new Error(`鉴权失败(${code}),请检查 MINIMAX_API_KEY`)
      if (code === 1002 || code === 429) { await sleep(5000); continue } // 限流退避
      throw new Error(`接口异常 ${code}: ${body?.base_resp?.status_msg ?? res.statusText}`)
    } catch (e) {
      if (e.message.includes('鉴权失败')) throw e
      if (attempt === MAX_RETRY) throw e
      hostIdx = (hostIdx + 1) % API_HOSTS.length // 网络失败换域名再试
      await sleep(3000)
    }
  }
}

// 边缘泛洪抠白:只清掉与边框连通的近白像素,主体内部的白色(熊猫/云/雪)不受影响
function removeWhiteBg(data, w, h, threshold) {
  const mask = new Uint8Array(w * h) // 1 = 透明
  const queue = new Int32Array(w * h)
  let head = 0, tail = 0, removed = 0
  const push = (i) => { if (!mask[i]) { mask[i] = 1; queue[tail++] = i; removed++ } }
  const isWhite = (i) => data[i * 4] >= threshold && data[i * 4 + 1] >= threshold && data[i * 4 + 2] >= threshold
  for (let x = 0; x < w; x++) { if (isWhite(x)) push(x); if (isWhite((h - 1) * w + x)) push((h - 1) * w + x) }
  for (let y = 0; y < h; y++) { if (isWhite(y * w)) push(y * w); if (isWhite(y * w + w - 1)) push(y * w + w - 1) }
  while (head < tail) {
    const i = queue[head++], x = i % w, y = (i / w) | 0
    if (x > 0 && isWhite(i - 1)) push(i - 1)
    if (x < w - 1 && isWhite(i + 1)) push(i + 1)
    if (y > 0 && isWhite(i - w)) push(i - w)
    if (y < h - 1 && isWhite(i + w)) push(i + w)
  }
  // 边缘一圈过渡羽化:紧邻透明区的浅色像素给半透明,消白边
  for (let i = 0; i < w * h; i++) {
    if (mask[i]) data[i * 4 + 3] = 0
    else {
      const x = i % w, y = (i / w) | 0
      const near = (x > 0 && mask[i - 1]) || (x < w - 1 && mask[i + 1]) || (y > 0 && mask[i - w]) || (y < h - 1 && mask[i + w])
      if (near && data[i * 4] >= 225 && data[i * 4 + 1] >= 225 && data[i * 4 + 2] >= 225) data[i * 4 + 3] = 90
    }
  }
  return removed / (w * h)
}

async function processImage(buf, hexName) {
  const img = sharp(buf, { limitInputPixels: false }).ensureAlpha()
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true })
  let removed = removeWhiteBg(data, info.width, info.height, 241)
  if (removed > 0.55) { // 抠掉的过多:主体可能大面积白色,提高阈值保守重抠
    const retry = await sharp(buf, { limitInputPixels: false }).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    const removed2 = removeWhiteBg(retry.data, retry.width, retry.height, 250)
    if (removed2 < removed) {
      const out = await sharp(retry.data, { raw: { width: retry.width, height: retry.height, channels: 4 } }).png().toBuffer()
      return { out, removed: removed2 }
    }
  }
  const out = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer()
  return { out, removed }
}

async function renderOne(c) {
  const hex = asciiName(c.char)
  const prompt = buildPrompt(c)
  const url = await generate(prompt)
  const raw = Buffer.from(await (await fetch(url)).arrayBuffer())
  mkdirSync(RAW_DIR, { recursive: true })
  writeFileSync(join(RAW_DIR, `${hex}.png`), raw) // 留原图,重加工不必再烧 API
  const { out } = await processImage(raw, hex)
  const final = await sharp(out).resize(SIZE, SIZE).png().toBuffer()
  for (const dir of OUT_DIRS) {
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, `${hex}.png`), final)
  }
  return { hex, bytes: final.length }
}

// ---- CLI ----
const args = process.argv.slice(2)
// asset 模式:生成非字素材(logo/背景图等)。用法: asset <文件名(不含扩展名)> <宽高比> <完整提示词>
// 9:16 等非 1:1 背景不做抠白(整幅即成品);1:1 素材按 --cutwhite 参数决定
if (args[0] === 'asset') {
  const [, name, ratio, ...rest] = args
  const cut = rest.includes('--cutwhite')
  const prompt = rest.filter((a) => a !== '--cutwhite').join(' ')
  if (!name || !ratio || !prompt) throw new Error('用法: asset <name> <aspect_ratio> [--cutwhite] <完整提示词>')
  const url = await generate(prompt)
  let buf = Buffer.from(await (await fetch(url)).arrayBuffer())
  mkdirSync(RAW_DIR, { recursive: true })
  writeFileSync(join(RAW_DIR, `${name}-raw.png`), buf)
  if (cut) buf = (await processImage(buf, name)).out
  const final = await sharp(buf).png().toBuffer()
  for (const dir of OUT_DIRS) writeFileSync(join(dir, `${name}.png`), final)
  console.log(`✓ ${name}.png ${(final.length / 1024).toFixed(0)}KB (ratio ${ratio})`)
  process.exit(0)
}
let targets, force
if (args[0] === 'chars') {
  const wanted = [...new Set(args.slice(1))]
  if (!wanted.length) throw new Error('用法: chars 字1 字2 ...')
  const missing = wanted.filter((ch) => !CHARACTERS.some((c) => c.char === ch))
  if (missing.length) throw new Error(`characters.js 中找不到: ${missing.join(' ')}`)
  targets = wanted.map((ch) => CHARACTERS.find((c) => c.char === ch))
  force = true
} else if (args[0] === 'missing' || args[0] === 'all') {
  targets = CHARACTERS.filter((c) => c.emojiCode)
  force = args.includes('--force')
  if (!force) {
    targets = targets.filter((c) => !existsSync(join(OUT_DIRS[1], `${asciiName(c.char)}.png`)))
  }
} else {
  throw new Error('用法: gen-ai-images.mjs <chars 字...|missing|all [--force]>')
}
console.log(`目标 ${targets.length} 字(force=${force}),模型 image-01`)

const failed = []
let done = 0
for (const c of targets) {
  const hex = asciiName(c.char)
  if (!force && existsSync(join(OUT_DIRS[1], `${hex}.png`))) { console.log(`跳过 ${c.char}(已存在)`); continue }
  try {
    const r = await renderOne(c)
    done++
    console.log(`✓ ${c.char} ${r.hex}.png ${(r.bytes / 1024).toFixed(0)}KB (${done}/${targets.length})`)
  } catch (e) {
    failed.push(c.char)
    console.error(`✗ ${c.char}: ${e.message}`)
  }
  await sleep(DELAY_MS)
}
console.log(failed.length ? `\n完成 ${done},失败 ${failed.length}: ${failed.join(' ')}` : `\n全部完成 ${done}/${targets.length}`)
process.exit(failed.length ? 1 : 0)
