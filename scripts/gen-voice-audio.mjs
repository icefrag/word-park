// AI 语音生成:MiniMax t2a_v2 文本转语音 -> mp3
// 用法: node scripts/gen-voice-audio.mjs samples   (生成音色小样到 scripts/audio-samples/,供试听选音色)
// 密钥: scripts/.env 的 MINIMAX_API_KEY(不入库)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = join(__dirname, 'audio-samples')
const API_HOSTS = ['https://api.minimaxi.com', 'https://api.minimax.cn'] // 与 gen-ai-images 一致:失败轮换
const DELAY_MS = 500
const MAX_RETRY = 3
const MODEL = 'speech-2.8-hd'

const keyMatch = readFileSync(join(__dirname, '.env'), 'utf8').match(/MINIMAX_API_KEY=(.+)/)
if (!keyMatch) throw new Error('scripts/.env 缺少 MINIMAX_API_KEY')
const KEY = keyMatch[1].trim()

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

let hostIdx = 0
async function synth(text, voiceSetting) {
  for (let attempt = 1; attempt <= MAX_RETRY; attempt++) {
    try {
      const res = await fetch(`${API_HOSTS[hostIdx]}/v1/t2a_v2`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
        body: JSON.stringify({
          model: MODEL, text, stream: false,
          voice_setting: { speed: 0.9, vol: 1, pitch: 0, ...voiceSetting },
          audio_setting: { sample_rate: 32000, bitrate: 128000, format: 'mp3', channel: 1 },
        }),
      })
      const body = await res.json().catch(() => ({}))
      const code = body?.base_resp?.status_code ?? res.status
      if (code === 0 && body?.data?.audio) return Buffer.from(body.data.audio, 'hex')
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

// ---- 音色小样:4 候选音色 x 4 段真实文案(欢迎/指令/字词/夸奖) ----
const VOICES = [
  { id: 'female-tianmei-jingpin', label: '1-精品甜美女声' },
  { id: 'tianxin_xiaoling', label: '2-甜心小玲' },
  { id: 'Chinese (Mandarin)_Warm_Girl', label: '3-温暖少女' },
  { id: 'lovely_girl', label: '4-萌萌女童' },
]
const SAMPLES = [
  { kind: '欢迎', text: '欢迎来到汉字乐园！点一点小熊猫，我们一起学汉字吧！', emotion: 'calm' },
  { kind: '指令', text: '听一听，点出你听到的字吧！', emotion: 'calm' },
  { kind: '字词', text: '日，太阳' },
  { kind: '夸奖', text: '答对啦！你真棒！', emotion: 'happy' },
]

const mode = process.argv[2]
if (mode === 'samples') {
  mkdirSync(OUT_DIR, { recursive: true })
  const failed = []
  for (const v of VOICES) {
    for (const s of SAMPLES) {
      const file = `${v.label}-${s.kind}.mp3`
      try {
        const buf = await synth(s.text, { voice_id: v.id, ...(s.emotion ? { emotion: s.emotion } : {}) })
        writeFileSync(join(OUT_DIR, file), buf)
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
throw new Error('用法: gen-voice-audio.mjs samples')
