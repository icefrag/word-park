// 单字音频重生成:只重合成指定汉字的单字播报(词条音频不动)
// 用法: node scripts/regen-char-audio.mjs 足 [走 ...] [--voice tianmei,warm] [--try 3] [--out scripts/tmp-tts]
// 场景: 某个字线上读音错(如「足」被读成 zuo),只重生成这一条,其余素材不重跑
// 注意: 同一字的单字 TTS 读音并不稳定(同一参数多次生成可能一个 zú 一个 zuǒ),
//       建议 --try 3 生成多份,再用 uv run scripts/asr-audit/tone_check.py 挑声调正确的那份
// 参数与 gen-voice-audio.mjs 一致: speech-2.8-hd / 拼音正音 pronunciation_dict.tone
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIRS = [join(__dirname, 'new-assets/assets/audio'), join(__dirname, '../upload-cloud/audio')]
const API_HOSTS = ['https://api.minimaxi.com', 'https://api.minimax.cn']
const MODEL = 'speech-2.8-hd'

const VOICES = [
  { key: 'tianmei', id: 'female-tianmei-jingpin' },
  { key: 'xiaoling', id: 'tianxin_xiaoling' },
  { key: 'warm', id: 'Chinese (Mandarin)_Warm_Girl' },
  { key: 'tong', id: 'lovely_girl' },
]

const args = process.argv.slice(2)
const flag = (name, def) => {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : def
}
const voiceKeys = flag('--voice', VOICES.map((v) => v.key).join(',')).split(',')
const tries = Number(flag('--try', 1))
const outDir = flag('--out', '')
const chars = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--')))
if (!chars.length) {
  console.error('用法: node scripts/regen-char-audio.mjs <汉字...> [--voice tianmei,...] [--try 3] [--out <候选目录>]')
  process.exit(1)
}

const KEY = readFileSync(join(__dirname, '.env'), 'utf8').match(/MINIMAX_API_KEY=(.+)/)[1].trim()
const require_ = createRequire(join(__dirname, '../miniprogram/utils/__smoke__.js'))
const { CHARACTERS, assetName } = require_('./characters')

// 声调符号 -> 数字声调(zú -> zu2),与 gen-voice-audio.mjs 保持一致
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

async function synth(text, voiceId, dict) {
  let lastErr = ''
  for (const host of API_HOSTS) {
    try {
      const res = await fetch(`${host}/v1/t2a_v2`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
        body: JSON.stringify({
          model: MODEL, text, stream: false,
          voice_setting: { speed: 0.9, vol: 1, pitch: 0, voice_id: voiceId },
          ...(dict ? { pronunciation_dict: { tone: dict } } : {}),
          audio_setting: { sample_rate: 32000, bitrate: 128000, format: 'mp3', channel: 1 },
        }),
      })
      const body = await res.json().catch(() => ({}))
      const code = body?.base_resp?.status_code ?? res.status
      if (code === 0 && body?.data?.audio) return Buffer.from(body.data.audio, 'hex')
      lastErr = `接口异常 ${code}: ${body?.base_resp?.status_msg ?? res.statusText}`
    } catch (e) { lastErr = e.message }
  }
  throw new Error(lastErr)
}

for (const ch of chars) {
  const c = CHARACTERS.find((x) => x.char === ch)
  if (!c) { console.error(`✗ 字表无「${ch}」`); continue }
  const dict = c.pinyin ? [`${c.char}/(${toneDigit(c.pinyin)})`] : null
  for (const v of VOICES.filter((x) => voiceKeys.includes(x.key))) {
    for (let t = 1; t <= tries; t++) {
      const buf = await synth(c.char, v.id, dict)
      const name = tries > 1 ? `${assetName(c.char)}-try${t}.mp3` : `${assetName(c.char)}.mp3`
      const dirs = outDir ? [join(__dirname, '..', outDir)] : OUT_DIRS
      for (const d of dirs) {
        mkdirSync(join(d, v.key), { recursive: true })
        writeFileSync(join(d, v.key, name), buf)
      }
      console.log(`✓ ${v.key}/${name} (${(buf.length / 1024).toFixed(0)}KB, dict=${dict ? dict[0] : '无'})`)
    }
  }
}
