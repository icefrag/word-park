// 素材对账:字表 ↔ 音频/图片文件 双向核对(缺文件、多文件、hex 码点冲突)
// 用法: node scripts/audit-assets.mjs
import { createRequire } from 'node:module'
import { readdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const { CHARACTERS, assetName } = require(join(ROOT, 'miniprogram/utils/characters.js'))

const VOICES = ['tianmei', 'xiaoling', 'warm', 'tong']
const AUDIO = join(ROOT, 'upload-cloud/audio')
const IMAGES = join(ROOT, 'upload-cloud/images')

const problems = { audioMissing: [], audioExtra: [], imageMissing: [], imageExtra: [], hexDup: [] }

// 1. hex 码点冲突检查(不同字映射到同一文件名 = 错位根因)
const hexMap = new Map()
for (const c of CHARACTERS) {
  const h = assetName(c.char)
  if (hexMap.has(h)) problems.hexDup.push(`${h}: '${c.char}' 与 '${hexMap.get(h)}' 冲突`)
  else hexMap.set(h, c.char)
}

// 2. 音频双向
const validAudio = new Set()
for (const c of CHARACTERS) {
  const h = assetName(c.char)
  validAudio.add(`${h}.mp3`)
  validAudio.add(`${h}-word.mp3`)
}
for (const v of VOICES) {
  const files = new Set(readdirSync(join(AUDIO, v)))
  for (const c of CHARACTERS) {
    const h = assetName(c.char)
    if (!files.has(`${h}.mp3`)) problems.audioMissing.push(`${v}/${h}.mp3 (字:${c.char})`)
    if (!files.has(`${h}-word.mp3`)) problems.audioMissing.push(`${v}/${h}-word.mp3 (字:${c.char})`)
  }
  for (const f of files) {
    if (!validAudio.has(f) && !f.startsWith('voice-') && !f.startsWith('bgm')) {
      problems.audioExtra.push(`${v}/${f} (反解字:'${hexMap.get(f.replace('-word', '').replace('.mp3', '')) ?? '?'})`)
    }
  }
}

// 3. 图片双向(有 emojiCode 必须有图;图名必须是字表中的字)
const validImages = new Set(CHARACTERS.filter((c) => c.emojiCode).map((c) => `${c.char}.png`))
for (const c of CHARACTERS) {
  if (c.emojiCode && !existsSync(join(IMAGES, `${c.char}.png`))) problems.imageMissing.push(`${c.char}.png (unit ${c.unit})`)
}
for (const f of readdirSync(IMAGES)) {
  if (!validImages.has(f) && !['panda.png', 'welcome-bg.png'].includes(f)) problems.imageExtra.push(f)
}

console.log(`字表 ${CHARACTERS.length} 字;hex 冲突 ${problems.hexDup.length};音频缺 ${problems.audioMissing.length};音频多余 ${problems.audioExtra.length};图缺 ${problems.imageMissing.length};图多余 ${problems.imageExtra.length}`)
for (const k of Object.keys(problems)) {
  if (problems[k].length) {
    console.log(`\n== ${k} ==`)
    problems[k].forEach((p) => console.log('  ' + p))
  }
}
