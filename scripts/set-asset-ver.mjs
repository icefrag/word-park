// 素材版本号:改素材后执行本脚本,版本号会写进两处
// 用法: node scripts/set-asset-ver.mjs 20261124
// 写两处的原因:
//   upload-cloud/version.json —— 线上真源,小程序启动时拉它(见 miniprogram/utils/asset-version.js)
//   miniprogram/config.js     —— 包内兜底默认值,首次启动还没拉到版本时用
// 之后: bash scripts/ecs/sync-ecs.sh 把 version.json 传上 ECS,客户端下次启动自动换 URL 重新拉图
import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ver = process.argv[2]
if (!/^\d{8}$/.test(ver || '')) {
  console.error('用法: node scripts/set-asset-ver.mjs <yyyyMMdd>')
  process.exit(1)
}

const ROOT = join(__dirname, '..')
writeFileSync(join(ROOT, 'upload-cloud/version.json'), JSON.stringify({ ver }) + '\n', 'utf8')

const cfgPath = join(ROOT, 'miniprogram/config.js')
const cfg = readFileSync(cfgPath, 'utf8')
if (!/const ASSET_VER = '[^']*'/.test(cfg)) {
  console.error('miniprogram/config.js 里没找到 ASSET_VER,请手动改')
  process.exit(1)
}
const next = cfg.replace(/const ASSET_VER = '[^']*'/, `const ASSET_VER = '${ver}'`)
writeFileSync(cfgPath, next, 'utf8')
console.log(`✓ upload-cloud/version.json -> {"ver":"${ver}"}`)
console.log(`✓ miniprogram/config.js ASSET_VER -> ${ver}`)
console.log('下一步: bash scripts/ecs/sync-ecs.sh')
