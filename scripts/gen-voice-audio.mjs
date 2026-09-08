// AI 语音生成:MiniMax t2a_v2 文本转语音 -> mp3
// 用法: node scripts/gen-voice-audio.mjs samples            (4音色小样到 scripts/audio-samples/)
//       node scripts/gen-voice-audio.mjs smoke              (小批量验证:3字+1词+2文案 x 4音色)
//       node scripts/gen-voice-audio.mjs batch [voiceKey]   (全量 4868 条;已存在跳过,断点续跑)
// 密钥: scripts/.env 的 MINIMAX_API_KEY(不入库)
// 文案/音色单一事实来源: docs/nbl/specs/audio-upgrade-p0.md 第4/5节
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SAMPLE_DIR = join(__dirname, 'audio-samples')
const OUT_DIRS = [join(__dirname, 'new-assets/assets/audio'), join(__dirname, '../upload-cloud/audio')]
const API_HOSTS = ['https://api.minimaxi.com', 'https://api.minimax.cn'] // 与 gen-ai-images 一致:失败轮换
const DELAY_MS = 800
const MAX_RETRY = 3
const CONCURRENCY = 2
const MODEL = 'speech-2.8-hd'

const keyMatch = readFileSync(join(__dirname, '.env'), 'utf8').match(/MINIMAX_API_KEY=(.+)/)
if (!keyMatch) throw new Error('scripts/.env 缺少 MINIMAX_API_KEY')
const KEY = keyMatch[1].trim()

const require_ = createRequire(join(__dirname, '../miniprogram/utils/__smoke__.js'))
const { CHARACTERS, assetName } = require_('./characters')

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

let hostIdx = 0
async function synth(text, voiceSetting, dict) {
  for (let attempt = 1; attempt <= MAX_RETRY; attempt++) {
    try {
      const res = await fetch(`${API_HOSTS[hostIdx]}/v1/t2a_v2`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
        body: JSON.stringify({
          model: MODEL, text, stream: false,
          voice_setting: { speed: 0.9, vol: 1, pitch: 0, ...voiceSetting },
          ...(dict ? { pronunciation_dict: { tone: dict } } : {}),
          audio_setting: { sample_rate: 32000, bitrate: 128000, format: 'mp3', channel: 1 },
        }),
      })
      const body = await res.json().catch(() => ({}))
      const code = body?.base_resp?.status_code ?? res.status
      if (code === 0 && body?.data?.audio) return Buffer.from(body.data.audio, 'hex')
      if (code === 1004 || code === 2049) throw new Error(`鉴权失败(${code}),请检查 MINIMAX_API_KEY`)
      if (code === 1002 || code === 429) { await sleep(8000); continue } // 限流重退避
      throw new Error(`接口异常 ${code}: ${body?.base_resp?.status_msg ?? res.statusText}`)
    } catch (e) {
      if (e.message.includes('鉴权失败')) throw e
      if (attempt === MAX_RETRY) throw e
      hostIdx = (hostIdx + 1) % API_HOSTS.length // 网络失败换域名再试
      await sleep(3000)
    }
  }
  throw new Error('重试耗尽(连续限流或网络失败)')
}

// ---- 音色(4个全量,用户设置可选) ----
const VOICES = [
  { key: 'tianmei', id: 'female-tianmei-jingpin', label: '1-精品甜美女声' },
  { key: 'xiaoling', id: 'tianxin_xiaoling', label: '2-甜心小玲' },
  { key: 'warm', id: 'Chinese (Mandarin)_Warm_Girl', label: '3-温暖少女' },
  { key: 'tong', id: 'lovely_girl', label: '4-萌萌女童' },
]

// ---- 固定文案(大王 2026-09-08 过目通过) ----
const FIXED = [
  { name: 'voice-welcome', text: '欢迎来到汉字乐园！点一点小熊猫，我们一起学汉字吧！', emotion: 'calm' },
  { name: 'voice-lets-learn', text: '选一关，开始学汉字吧！', emotion: 'calm' },
  { name: 'voice-level-complete', text: '太棒了！这一关全部完成，你真是识字小达人！', emotion: 'happy' },
  { name: 'voice-try-again', text: '没关系，再试一次吧！', emotion: 'calm' },
  { name: 'voice-praise-1', text: '哇，你真棒，全部答对啦！', emotion: 'happy' },
  { name: 'voice-praise-2', text: '太厉害啦，你是识字小能手！', emotion: 'happy' },
  { name: 'voice-praise-3', text: '真聪明，一个都没有错！', emotion: 'happy' },
  { name: 'voice-praise-4', text: '好极了，这些字都认识你啦！', emotion: 'happy' },
  { name: 'voice-praise-5', text: '太好了，又是全对！', emotion: 'happy' },
  { name: 'voice-praise-6', text: '了不起，继续加油！', emotion: 'happy' },
  { name: 'voice-instr-pic2char', text: '看一看图片，点出正确的字吧！', emotion: 'calm' },
  { name: 'voice-instr-sound2char', text: '听一听，点出你听到的字吧！', emotion: 'calm' },
  { name: 'voice-instr-findall', text: '把正确的字，全部找出来吧！', emotion: 'calm' },
  { name: 'voice-instr-link', text: '点一个字，再点它的图片，配成一对吧！', emotion: 'calm' },
  { name: 'voice-instr-match', text: '翻开卡片，找到相同的字和图片吧！', emotion: 'calm' },
  { name: 'voice-instr-bubble', text: '听一听，戳破正确的字吧！', emotion: 'calm' },
  { name: 'voice-instr-whack', text: '小地鼠举着字出来啦，快敲正确的字吧！', emotion: 'calm' },
]

// 声调符号 -> 数字声调(rì -> ri4, nǚ -> nv3, 轻声无标记原样)
const TONE_MAP = { ā: ['a', 1], á: ['a', 2], ǎ: ['a', 3], à: ['a', 4], ē: ['e', 1], é: ['e', 2], ě: ['e', 3], è: ['e', 4], ī: ['i', 1], í: ['i', 2], ǐ: ['i', 3], ì: ['i', 4], ō: ['o', 1], ó: ['o', 2], ǒ: ['o', 3], ò: ['o', 4], ū: ['u', 1], ú: ['u', 2], ǔ: ['u', 3], ù: ['u', 4], ǖ: ['v', 1], ǘ: ['v', 2], ǚ: ['v', 3], ǜ: ['v', 4] }
function toneDigit(pinyin) {
  let tone = 0, out = ''
  for (const ch of pinyin) {
    const t = TONE_MAP[ch]
    if (t) { tone = t[1]; out += t[0] }
    else if (ch === 'ü') out += 'v'
    else out += ch
  }
  return tone ? out + tone : out
}

// 播报条目:单字(带拼音正音) + 字词(逗号停顿) + 固定文案(带情绪)
function buildItems() {
  const items = []
  for (const c of CHARACTERS) {
    if (c.pinyin) items.push({ name: c.char, text: c.char, dict: [`${c.char}/(${toneDigit(c.pinyin)})`] })
    else items.push({ name: c.char, text: c.char })
    items.push({ name: `${c.char}-word`, text: `${c.char}，${c.word}` })
  }
  return [...items, ...FIXED.map((f) => ({ name: f.name, text: f.text, emotion: f.emotion }))]
}

async function renderOne(voice, item) {
  const rel = join(voice.key, `${assetName(item.name)}.mp3`)
  if (OUT_DIRS.every((d) => existsSync(join(d, rel)))) return 0 // 已生成,断点续跑跳过
  const buf = await synth(item.text, { voice_id: voice.id, ...(item.emotion ? { emotion: item.emotion } : {}) }, item.dict)
  for (const d of OUT_DIRS) {
    mkdirSync(join(d, voice.key), { recursive: true })
    writeFileSync(join(d, rel), buf)
  }
  return buf.length
}

// ---- CLI ----
const mode = process.argv[2]

if (mode === 'samples') {
  const SAMPLES = [
    { kind: '欢迎', text: '欢迎来到汉字乐园！点一点小熊猫，我们一起学汉字吧！', emotion: 'calm' },
    { kind: '指令', text: '听一听，点出你听到的字吧！', emotion: 'calm' },
    { kind: '字词', text: '日，太阳' },
    { kind: '夸奖', text: '答对啦！你真棒！', emotion: 'happy' },
  ]
  mkdirSync(SAMPLE_DIR, { recursive: true })
  const failed = []
  for (const v of VOICES) {
    for (const s of SAMPLES) {
      const file = `${v.label}-${s.kind}.mp3`
      try {
        const buf = await synth(s.text, { voice_id: v.id, ...(s.emotion ? { emotion: s.emotion } : {}) })
        writeFileSync(join(SAMPLE_DIR, file), buf)
        console.log(`✓ ${file} ${(buf.length / 1024).toFixed(0)}KB`)
      } catch (e) {
        failed.push(file)
        console.error(`✗ ${file}: ${e.message}`)
      }
      await sleep(DELAY_MS)
    }
  }
  console.log(failed.length ? `\n完成 ${VOICES.length * SAMPLES.length - failed.length},失败: ${failed.join(' ')}` : `\n全部完成 ${VOICES.length * SAMPLES.length}`)
  process.exit(failed.length ? 1 : 0)
}

if (mode === 'smoke') {
  // 覆盖:常规声调(水) + ü声调(女,验证 nv3 接受度) + 无障碍字(日) + 字词条 + 情绪文案2条
  const picks = ['水', '女', '日', '水-word', 'voice-welcome', 'voice-praise-1']
  const all = buildItems()
  const failed = []
  for (const v of VOICES) {
    for (const p of picks) {
      const it = all.find((x) => x.name === p)
      try {
        const bytes = await renderOne(v, it)
        console.log(`✓ ${v.key}/${p} ${bytes ? (bytes / 1024).toFixed(0) + 'KB' : '跳过(已存在)'}`)
      } catch (e) {
        failed.push(`${v.key}/${p}`)
        console.error(`✗ ${v.key}/${p}: ${e.message}`)
      }
      await sleep(DELAY_MS)
    }
  }
  console.log(failed.length ? `\n失败 ${failed.length}: ${failed.join(' ')}` : '\nsmoke 全部通过')
  process.exit(failed.length ? 1 : 0)
}

if (mode === 'batch') {
  const vk = process.argv[3]
  const voices = vk ? VOICES.filter((v) => v.key === vk) : VOICES
  if (!voices.length) throw new Error(`未知 voiceKey: ${vk},可选 ${VOICES.map((v) => v.key).join('/')}`)
  const items = buildItems()
  const jobs = []
  for (const v of voices) for (const it of items) jobs.push([v, it])
  console.log(`目标 ${jobs.length} 条(音色 ${voices.map((v) => v.key).join('/')}),模型 ${MODEL},并发 ${CONCURRENCY}`)
  let done = 0, skip = 0, idx = 0
  const failed = []
  async function worker() {
    while (idx < jobs.length) {
      const [v, it] = jobs[idx++]
      try {
        const bytes = await renderOne(v, it)
        if (bytes) done++
        else skip++
      } catch (e) {
        failed.push(`${v.key}/${it.name}`)
        console.error(`✗ ${v.key}/${it.name}: ${e.message}`)
      }
      if ((done + skip + failed.length) % 100 === 0) console.log(`进度 ${done + skip + failed.length}/${jobs.length}(新${done} 跳${skip} 败${failed.length})`)
      await sleep(DELAY_MS)
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker))
  // 并发阶段撞限流失败的条目,串行慢速补一轮
  const retry = failed.splice(0)
  for (const key of retry) {
    const [vk, name] = key.split('/')
    try {
      const bytes = await renderOne(VOICES.find((x) => x.key === vk), items.find((x) => x.name === name))
      if (bytes) done++
      console.log(`↻ 补跑成功 ${key}`)
    } catch (e) {
      failed.push(key)
      console.error(`✗ 补跑仍失败 ${key}: ${e.message}`)
    }
    await sleep(2000)
  }
  console.log(failed.length ? `\n结束:新${done} 跳${skip} 失败${failed.length}: ${failed.slice(0, 20).join(' ')}${failed.length > 20 ? ' ...(重跑 batch 即续)' : ''}` : `\n全部完成:新${done} 跳${skip} 共${jobs.length}`)
  process.exit(failed.length ? 1 : 0)
}

throw new Error('用法: gen-voice-audio.mjs <samples|smoke|batch [voiceKey]>')
