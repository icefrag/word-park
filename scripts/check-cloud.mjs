// 全量核对素材服务器:源目录 upload-cloud/(云端镜像的事实源)逐个 HEAD 素材 BASE,列出缺失并归集到补传目录
// 用法: node scripts/check-cloud.mjs <素材BASE,默认 ECS>
import { readdirSync, mkdirSync, cpSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SRC = join(__dirname, '..', 'upload-cloud')
const BASE = process.argv[2]?.replace(/\/$/, '') ?? 'http://47.93.245.108:8081/assets'
const STAGE = join(__dirname, 'missing-upload/assets')

// 收集全部期望文件:图=汉字名走百分号编码(与 characters.js imageOf 一致);
// 音频=根目录 BGM/音效与音色子目录内文件本就是 ASCII/hex 名,原样拼接
const expected = []
for (const entry of readdirSync(join(SRC, 'images'), { withFileTypes: true })) {
  expected.push({ local: join(SRC, 'images', entry.name), remote: `images/${encodeURIComponent(entry.name)}` })
}
for (const entry of readdirSync(join(SRC, 'audio'), { withFileTypes: true })) {
  if (entry.isDirectory()) {
    for (const f of readdirSync(join(SRC, 'audio', entry.name))) {
      expected.push({ local: join(SRC, 'audio', entry.name, f), remote: `audio/${entry.name}/${f}` })
    }
  } else {
    expected.push({ local: join(SRC, 'audio', entry.name), remote: `audio/${entry.name}` })
  }
}
console.log(`期望文件 ${expected.length} 个,开始核对素材服务器(${BASE})...`)

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
