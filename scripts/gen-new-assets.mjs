// 新增字素材生成:OpenMoji SVG(jsdelivr CDN) -> 618x618 PNG + Windows Huihui TTS 两条 wav
// 用法: node scripts/gen-new-assets.mjs <1|2|3>   (阶段;只生成该阶段新增单元的字)
//       node scripts/gen-new-assets.mjs chars 字1 字2 ...  (只处理指定字,强制覆盖本地已存在文件;用于换码重生成)
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

const USAGE = '用法: node scripts/gen-new-assets.mjs <1|2|3> | chars 字1 字2 ...'
const NEW_UNIT_RANGES = { 1: [10, 27], 2: [39, 50], 3: [52, 66] }
const args = process.argv.slice(2)
let NEW_CHARS
let force = false // chars 模式:忽略"已存在跳过",本地强制覆盖
let label
if (args[0] === 'chars') {
  const wanted = [...new Set(args.slice(1))]
  if (!wanted.length) {
    console.error(USAGE)
    process.exit(1)
  }
  const missing = wanted.filter((ch) => !CHARACTERS.some((c) => c.char === ch))
  if (missing.length) {
    console.error(`characters.js 中找不到: ${missing.join(' ')}`)
    process.exit(1)
  }
  NEW_CHARS = wanted.map((ch) => CHARACTERS.find((c) => c.char === ch))
  force = true
  label = '指定字'
} else {
  const stage = Number(args[0])
  if (!NEW_UNIT_RANGES[stage]) {
    console.error(USAGE)
    process.exit(1)
  }
  const [lo, hi] = NEW_UNIT_RANGES[stage]
  NEW_CHARS = CHARACTERS.filter((c) => c.unit >= lo && c.unit <= hi)
  label = `阶段 ${stage}`
}
const IMG_CHARS = NEW_CHARS.filter((c) => c.emojiCode)
console.log(`${label}:共 ${NEW_CHARS.length} 字,其中 ${IMG_CHARS.length} 字生成图片,音频 ${NEW_CHARS.length * 2} 条`)

// '一' -> '4e00'(BMP);纯 ASCII 段原样;与 characters.js assetName 同规则
function asciiName(name) {
  return name
    .split('-')
    .map((part) =>
      /^[\x20-\x7e]*$/.test(part)
        ? part
        : [...part].map((ch) => ch.charCodeAt(0).toString(16)).join('')
    )
    .join('-')
}

// OpenMoji 文件名:多数为码点本体,部分 emoji-presentation 字符带 -FE0F 后缀;keycap 自带完整后缀
async function downloadSvg(emojiCode) {
  const code = emojiCode.toUpperCase()
  const candidates = code.includes('-') ? [code] : [code, `${code}-FE0F`]
  for (const c of candidates) {
    const res = await fetch(`${CDN}/${c}.svg`)
    if (res.ok) return Buffer.from(await res.arrayBuffer())
  }
  throw new Error(`SVG 下载失败: ${code} (尝试过 ${candidates.join(', ')})`)
}

for (const dir of ['images', 'audio']) mkdirSync(join(OUT, dir), { recursive: true })

// 1) 图片:SVG -> 618x618 PNG(与云端既有图规格一致);无码字跳过图片
for (const c of IMG_CHARS) {
  const name = asciiName(c.char)
  const dst = join(OUT, 'images', `${name}.png`)
  if (!force && existsSync(dst)) {
    console.log(`图 ${name}.png 已存在,跳过`)
    continue
  }
  const svg = await downloadSvg(c.emojiCode)
  await sharp(svg, { density: 300 }).resize(618, 618).png().toFile(dst)
  console.log(`图 ${c.char} -> ${name}.png (${c.emojiCode})`)
}

// 2) 语音:Huihui TTS。生成带 BOM 的 ps1(清单内联,PowerShell 5.1 对无 BOM 文件按 ANSI 读中文会乱码)
const ttsJobs = NEW_CHARS.flatMap((c) => {
  const name = asciiName(c.char)
  return [
    { file: join(OUT, 'audio', `${name}.wav`), text: c.char },
    { file: join(OUT, 'audio', `${name}-word.wav`), text: `${c.char},${c.word}` },
  ]
}).filter((j) => force || !existsSync(j.file))

if (ttsJobs.length) {
  const lines = ttsJobs
    .map((j) => `  @('${j.file.replace(/'/g, "''")}', '${j.text.replace(/'/g, "''")}')`)
    .join(',\n') // 逗号分隔:PowerShell @() 对换行分隔的内层数组会扁平化
  const ps = `\ufeffAdd-Type -AssemblyName System.Speech
$s = New-Object System.Speech.Synthesis.SpeechSynthesizer
$s.SelectVoice('Microsoft Huihui Desktop')
$jobs = @(
${lines}
)
foreach ($j in $jobs) {
  $s.SetOutputToWaveFile([string]$j[0])
  $s.Speak([string]$j[1])
  $s.SetOutputToNull()
  Write-Host "音 $(Split-Path -Leaf ([string]$j[0]))"
}`
  const psFile = join(OUT, 'gen-tts.ps1')
  writeFileSync(psFile, ps)
  execFileSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', psFile], { stdio: 'inherit' })
}

// 3) 校验:图非空且为 618x618 png(仅有码字),音非空且 > 10KB(过短说明 TTS 失败;全部字)
let bad = 0
for (const c of IMG_CHARS) {
  const name = asciiName(c.char)
  const meta = await sharp(join(OUT, 'images', `${name}.png`)).metadata()
  if (meta.width !== 618 || meta.format !== 'png') {
    console.error(`图异常: ${name}.png ${meta.width}x${meta.height} ${meta.format}`)
    bad++
  }
}
for (const c of NEW_CHARS) {
  const name = asciiName(c.char)
  for (const f of [`${name}.wav`, `${name}-word.wav`]) {
    const size = statSync(join(OUT, 'audio', f)).size
    if (size < 10240) {
      console.error(`音过短(疑似失败): ${f} ${size}B`)
      bad++
    }
  }
}
console.log(bad === 0 ? `\n全部 ${NEW_CHARS.length} 字素材生成完成(images ${IMG_CHARS.length} + audio ${NEW_CHARS.length * 2})` : `\n${bad} 处异常`)
process.exit(bad === 0 ? 0 : 1)
