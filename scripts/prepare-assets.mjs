// 素材准备:从网页版项目拷贝图片/音频到小程序包,并把中文文件名转为 ASCII(hex 码点)
// 用法: node scripts/prepare-assets.mjs [源assets目录] [目标assets目录]
// 例:   node scripts/prepare-assets.mjs "C:/Users/icefr/Desktop/game/public/assets" "./miniprogram/assets"
import { cpSync, mkdirSync, readdirSync, renameSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const SRC = process.argv[2] ?? 'C:/Users/icefr/Desktop/game/public/assets'
const DST = process.argv[3] ?? 'miniprogram/assets'

// '日' -> '65e5';纯 ASCII 段原样;多字符段逐字符转 hex 拼接
export function asciiName(name) {
  return name
    .split('-')
    .map((part) =>
      /^[\x20-\x7e]*$/.test(part)
        ? part
        : [...part].map((ch) => ch.charCodeAt(0).toString(16)).join('')
    )
    .join('-')
}

mkdirSync(DST, { recursive: true })
for (const dir of ['images', 'audio']) {
  cpSync(join(SRC, dir), join(DST, dir), { recursive: true })
  const renamed = []
  for (const f of readdirSync(join(DST, dir))) {
    const dot = f.lastIndexOf('.')
    const base = f.slice(0, dot)
    const ext = f.slice(dot)
    const target = asciiName(base) + ext
    if (target !== f) {
      renameSync(join(DST, dir, f), join(DST, dir, target))
      renamed.push(`${f} -> ${target}`)
    }
  }
  console.log(`${dir}: ${readdirSync(join(DST, dir)).length} 个文件,重命名 ${renamed.length} 个`)
  renamed.slice(0, 3).forEach((r) => console.log(`  ${r}`))
}

// 校验:不允许残留非 ASCII 文件名
for (const dir of ['images', 'audio']) {
  const bad = readdirSync(join(DST, dir)).filter((f) => !/^[\x20-\x7e]+$/.test(f))
  if (bad.length) {
    console.error(`存在未转换的中文文件名: ${bad.join(', ')}`)
    process.exit(1)
  }
}
console.log('素材准备完成(全部文件名为 ASCII)')
