// 新增字素材生成:OpenMoji SVG(jsdelivr CDN) -> 618x618 PNG + Windows Huihui TTS 两条 wav
// 用法: node scripts/gen-new-assets.mjs
// 产物: scripts/new-assets/assets/{images,audio}/,上传云存储后即可删除
// 字音 = 单字;组词音({char}-word) = "字,组词"(与云端既有素材模式一致)
import { mkdirSync, writeFileSync, existsSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import sharp from 'sharp' // 需先在 scripts 下 npm install(见 package.json)

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, 'new-assets/assets')
const CDN = 'https://cdn.jsdelivr.net/npm/openmoji@15.0.0/color/svg'

// 与 characters.js 新增段完全一致(char/pinyin/word/emojiCode)
const NEW_CHARS = [
  // 单元 18:数字乐园(keycap 数字 emoji)
  { char: '一', pinyin: 'yī', word: '一个', emojiCode: '0031-fe0f-20e3' },
  { char: '二', pinyin: 'èr', word: '二十', emojiCode: '0032-fe0f-20e3' },
  { char: '三', pinyin: 'sān', word: '三个', emojiCode: '0033-fe0f-20e3' },
  { char: '四', pinyin: 'sì', word: '四个', emojiCode: '0034-fe0f-20e3' },
  { char: '五', pinyin: 'wǔ', word: '五个', emojiCode: '0035-fe0f-20e3' },
  { char: '六', pinyin: 'liù', word: '六个', emojiCode: '0036-fe0f-20e3' },
  { char: '七', pinyin: 'qī', word: '七个', emojiCode: '0037-fe0f-20e3' },
  { char: '八', pinyin: 'bā', word: '八个', emojiCode: '0038-fe0f-20e3' },
  { char: '九', pinyin: 'jiǔ', word: '九个', emojiCode: '0039-fe0f-20e3' },
  { char: '十', pinyin: 'shí', word: '十个', emojiCode: '1f51f' },
  // 单元 19:象形字乐园
  { char: '鱼', pinyin: 'yú', word: '小鱼', emojiCode: '1f41f' },
  { char: '鸟', pinyin: 'niǎo', word: '小鸟', emojiCode: '1f426' },
  { char: '竹', pinyin: 'zhú', word: '竹子', emojiCode: '1f38b' },
  { char: '叶', pinyin: 'yè', word: '叶子', emojiCode: '1f343' },
  { char: '土', pinyin: 'tǔ', word: '泥土', emojiCode: '1f9f1' },
  { char: '田', pinyin: 'tián', word: '田野', emojiCode: '1f33e' },
  // 补齐既有单元
  { char: '弟', pinyin: 'dì', word: '弟弟', emojiCode: '1f9d2', unit: 6 },
  { char: '妹', pinyin: 'mèi', word: '妹妹', emojiCode: '1f476', unit: 6 },
  { char: '爷', pinyin: 'yé', word: '爷爷', emojiCode: '1f474', unit: 6 },
  { char: '桌', pinyin: 'zhuō', word: '饭桌', emojiCode: '1f37d', unit: 7 },
  { char: '被', pinyin: 'bèi', word: '被子', emojiCode: '1f6cc', unit: 7 },
  { char: '吃', pinyin: 'chī', word: '吃饭', emojiCode: '1f372', unit: 9 },
  { char: '喝', pinyin: 'hē', word: '喝水', emojiCode: '1f964', unit: 9 },
  { char: '玩', pinyin: 'wán', word: '玩具', emojiCode: '1f9f8', unit: 9 },
  { char: '听', pinyin: 'tīng', word: '听话', emojiCode: '1f442', unit: 9 },
  { char: '雷', pinyin: 'léi', word: '打雷', emojiCode: '1f329', unit: 13 },
  { char: '电', pinyin: 'diàn', word: '闪电', emojiCode: '26a1', unit: 13 },
  { char: '雾', pinyin: 'wù', word: '大雾', emojiCode: '1f32b', unit: 13 },
  { char: '晴', pinyin: 'qíng', word: '晴天', emojiCode: '1f324', unit: 13 },
  { char: '里', pinyin: 'lǐ', word: '里面', emojiCode: '1f4e6', unit: 16 },
  { char: '外', pinyin: 'wài', word: '外面', emojiCode: '1f9f2', unit: 16 },
  { char: '大', pinyin: 'dà', word: '大树', emojiCode: '1f334', unit: 16 },
  { char: '小', pinyin: 'xiǎo', word: '小蚂蚁', emojiCode: '1f41c', unit: 16 },
]

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

// 1) 图片:SVG -> 618x618 PNG(与云端既有图规格一致)
for (const c of NEW_CHARS) {
  const name = asciiName(c.char)
  const dst = join(OUT, 'images', `${name}.png`)
  if (existsSync(dst)) {
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
}).filter((j) => !existsSync(j.file))

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

// 3) 校验:图非空且为 618x618 png,音非空且 > 10KB(过短说明 TTS 失败)
let bad = 0
for (const c of NEW_CHARS) {
  const name = asciiName(c.char)
  const img = join(OUT, 'images', `${name}.png`)
  const meta = await sharp(img).metadata()
  if (meta.width !== 618 || meta.format !== 'png') {
    console.error(`图异常: ${name}.png ${meta.width}x${meta.height} ${meta.format}`)
    bad++
  }
  for (const f of [`${name}.wav`, `${name}-word.wav`]) {
    const size = statSync(join(OUT, 'audio', f)).size
    if (size < 10240) {
      console.error(`音过短(疑似失败): ${f} ${size}B`)
      bad++
    }
  }
}
console.log(bad === 0 ? `\n全部 ${NEW_CHARS.length} 字素材生成完成(images ${NEW_CHARS.length} + audio ${NEW_CHARS.length * 2})` : `\n${bad} 处异常`)
process.exit(bad === 0 ? 0 : 1)
