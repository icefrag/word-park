// 素材基地址:阿里云 ECS 自建 nginx(2026-11 迁移,微信云开发 CloudBase 已弃用)
// 服务器配置见 scripts/ecs/nginx.conf;素材同步入口 bash scripts/ecs/sync-ecs.sh
const ASSET_BASE = 'http://47.93.245.108:8081/assets'
// 素材版本:同名文件覆盖上云后,小程序 image/audio 会命中旧缓存;改此号强制全端刷新(素材批次日期)
const ASSET_VER = '20261120'

module.exports = { ASSET_BASE, ASSET_VER }
