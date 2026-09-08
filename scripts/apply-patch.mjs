// 一次性补丁:把 scripts/patch-emoji.json 里的 emojiCode 写回 characters.js
import { readFileSync, writeFileSync } from 'node:fs'

const patch = JSON.parse(readFileSync('scripts/patch-emoji.json', 'utf8'))
let src = readFileSync('miniprogram/utils/characters.js', 'utf8')
let n = 0
for (const { char, emojiCode } of patch) {
  const re = new RegExp(`(char:\\s*'${char}',[^}]*?emojiCode:\\s*)null`)
  if (re.test(src)) {
    src = src.replace(re, `$1'${emojiCode}'`)
    n++
  }
}
// 回退 9 个人物类字到 null（亲属/称谓同图问题）
const REVERT_CHARS = ['叔', '阿', '姨', '伯', '婶', '友', '朋', '伙', '伴']
let reverted = 0
for (const ch of REVERT_CHARS) {
  const re = new RegExp(`(char:\\s*'${ch}',[^}]*?emojiCode:\\s*)('[0-9a-f-]+')`)
  if (re.test(src)) {
    src = src.replace(re, '$1null')
    reverted++
  }
}
writeFileSync('miniprogram/utils/characters.js', src)
console.log(`补图: ${n}, 回退到无图: ${reverted}`)