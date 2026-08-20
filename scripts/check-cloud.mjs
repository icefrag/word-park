// 全量核对云存储素材:源目录(网页版)文件名转 hex 后逐个请求云端,列出缺失并归集到补传目录
// 用法: node scripts/check-cloud.mjs <云端BASE>
import { readdirSync, mkdirSync, cpSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SRC = 'C:/Users/icefr/Desktop/game/public/assets'
const BASE = process.argv[2]?.replace(/\/$/, '') ?? 'https://636c-cloudbase-d8gyy2qjqef096442-1471843187.tcb.qcloud.la/assets'
const STAGE = join(__dirname, 'missing-upload/assets')

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

// 收集全部期望文件
const expected = []
for (const dir of ['images', 'audio']) {
  for (const f of readdirSync(join(SRC, dir))) {
    const dot = f.lastIndexOf('.')
    expected.push({ local: join(SRC, dir, f), remote: `${dir}/${asciiName(f.slice(0, dot))}${f.slice(dot)}` })
  }
}
console.log(`期望文件 ${expected.length} 个,开始云端核对(${BASE})...`)

// 并发 12 检查
const missing = []
const batch = 12
for (let i = 0; i < expected.length; i += batch) {
  const chunk = expected.slice(i, i + batch)
  await Promise.all(
    chunk.map(async (e) => {
      try {
        const res = await fetch(`${BASE}/${e.remote}`, { method: 'HEAD' })
        if (!res.ok) missing.push(e)
      } catch {
        missing.push(e)
      }
    })
  )
  process.stdout.write(`\r已检查 ${Math.min(i + batch, expected.length)}/${expected.length}`)
}
console.log('')

if (missing.length === 0) {
  console.log('云端文件全部齐全!')
  process.exit(0)
}

// 归集缺失文件到补传目录(保持 assets/ 结构)
for (const e of missing) {
  const dst = join(STAGE, e.remote)
  mkdirSync(dirname(dst), { recursive: true })
  cpSync(e.local, dst)
}
writeFileSync(join(STAGE, 'missing-list.txt'), missing.map((e) => e.remote).join('\n'))
console.log(`缺失 ${missing.length} 个,已归集到 scripts/missing-upload/assets/ :`)
missing.forEach((e) => console.log(`  ${e.remote}`))
