// 音频池:语音单通道(后播打断先播),音效 3 实例轮换可叠加,BGM 循环单例
// 小程序无 speechSynthesis,网页版的 TTS 回退在此移除 — 全部音频文件已预生成
// 播报音频按音色分目录(audio/{voiceKey}/*.mp3,由 scripts/gen-voice-audio.mjs 生成),音色由用户在主页设置选择
const { ASSET_BASE, ASSET_VER } = require('../config')
const { assetName } = require('./characters')

// 可选音色(key 与云端 audio/ 下目录名一一对应,新增音色先跑素材脚本再登记)
const VOICES = [
  { key: 'tianmei', name: '甜美女声' },
  { key: 'xiaoling', name: '甜心小玲' },
  { key: 'warm', name: '温暖姐姐' },
  { key: 'tong', name: '萌萌童声' },
]
const DEFAULT_VOICE = 'tianmei'
const VOICE_KEY_STORAGE = 'voiceKey'

let voiceKey = ''

function currentVoice() {
  if (!voiceKey) {
    const saved = wx.getStorageSync(VOICE_KEY_STORAGE)
    voiceKey = VOICES.some((v) => v.key === saved) ? saved : DEFAULT_VOICE
  }
  return voiceKey
}

function setVoice(key) {
  if (!VOICES.some((v) => v.key === key)) return
  voiceKey = key
  wx.setStorageSync(VOICE_KEY_STORAGE, key)
}

// 播报类(单字/字词/voice-*)走音色目录 mp3;音效(sfx-*)走根目录 wav(免版权音效源文件即 wav,不转码)
function fileUrl(name) {
  if (name.startsWith('sfx-')) return `${ASSET_BASE}/audio/${assetName(name)}.wav?v=${ASSET_VER}`
  return `${ASSET_BASE}/audio/${currentVoice()}/${assetName(name)}.mp3?v=${ASSET_VER}`
}

// 语音单例:切换 src 前 stop,保证打断语义
const voiceCtx = wx.createInnerAudioContext()
voiceCtx.obeyMuteSwitch = false
// iOS 首开竞态:src 赋值后立即 play() 会被静默吞掉(用户实测切一次音色才出声);
// canplay 到达时若仍处于暂停则补播,正常播放不受影响
voiceCtx.onCanplay(() => { if (voiceCtx.paused) voiceCtx.play() })

// 音效池:轮换取用,允许上一个未播完时叠加下一个
const SFX_POOL_SIZE = 3
const sfxPool = []
let sfxIndex = 0
for (let i = 0; i < SFX_POOL_SIZE; i++) {
  const ctx = wx.createInnerAudioContext()
  ctx.obeyMuteSwitch = false
  sfxPool.push(ctx)
}

function playSfx(name) {
  // 答对音效伴随轻震动:多感官正反馈(机型不支持则静默失败,不影响出声)
  if (name === 'sfx-correct') wx.vibrateShort({ type: 'light', fail: () => {} })
  const ctx = sfxPool[sfxIndex++ % SFX_POOL_SIZE]
  ctx.stop()
  ctx.src = fileUrl(name)
  ctx.play()
}

function stopVoice() {
  voiceCtx.stop()
}

function playVoice(name) {
  voiceCtx.stop()
  voiceCtx.src = fileUrl(name)
  voiceCtx.play()
}

function playChar(char) {
  playVoice(char)
}

// 与 voice-praise-1~6 音频文案保持一致(数组仅用于随机取号)
const PRAISES = ['哇，你真棒', '太厉害啦', '真聪明', '好极了', '太好了', '了不起']

function playPraise() {
  const i = Math.floor(Math.random() * PRAISES.length)
  playVoice(`voice-praise-${i + 1}`)
}

// BGM:主页/地图/奖励页播放,玩法页静音(听音辨字玩法不被干扰);压低音量垫在播报之下
const bgmCtx = wx.createInnerAudioContext()
bgmCtx.obeyMuteSwitch = false // 与语音/音效一致:不被 iPhone 静音键误杀
bgmCtx.onCanplay(() => { if (bgmCtx.paused) bgmCtx.play() })
let bgmReady = false

function playBgm() {
  if (!bgmReady) {
    bgmReady = true
    bgmCtx.loop = true
    bgmCtx.volume = 0.35
    bgmCtx.src = `${ASSET_BASE}/audio/bgm-main.mp3?v=${ASSET_VER}`
  }
  bgmCtx.play()
}

function pauseBgm() {
  bgmCtx.pause()
}

module.exports = { playSfx, stopVoice, playVoice, playChar, playPraise, fileUrl, VOICES, currentVoice, setVoice, playBgm, pauseBgm }
