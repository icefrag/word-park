// 音频池:语音单通道(后播打断先播),音效 3 实例轮换可叠加
// 小程序无 speechSynthesis,网页版的 TTS 回退在此移除 — 全部音频文件已预生成
const { ASSET_BASE } = require('../config')
const { assetName } = require('./characters')

const fileUrl = (name) => `${ASSET_BASE}/audio/${assetName(name)}.wav`

// 语音单例:切换 src 前 stop,保证打断语义
const voiceCtx = wx.createInnerAudioContext()
voiceCtx.obeyMuteSwitch = false

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

const PRAISES = ['太棒了', '你真棒', '真厉害', '好极了', '真聪明', '太好了']

function playPraise() {
  const i = Math.floor(Math.random() * PRAISES.length)
  playVoice(`voice-praise-${i + 1}`)
}

module.exports = { playSfx, stopVoice, playVoice, playChar, playPraise, fileUrl }
