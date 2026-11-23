// 从 miniprogram/utils/characters.js 导出审计字表(chars.json)
// 用法: node scripts/asr-audit/gen-chars.mjs
// 字段: char / word / pinyin(声调校验用,取字表人工标注,不用 pypinyin 默认读音)
import { writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const __dirname = dirname(fileURLToPath(import.meta.url))
const require_ = createRequire(join(__dirname, '../../miniprogram/utils/__smoke__.js'))
const { CHARACTERS } = require_('./characters')

const out = CHARACTERS.map((c) => ({ char: c.char, word: c.word, pinyin: c.pinyin || '' }))
writeFileSync(join(__dirname, 'chars.json'), JSON.stringify(out), 'utf8')
console.log(`已写入 chars.json:${out.length} 字`)
