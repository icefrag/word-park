// 素材基地址:已上传云存储(权限:所有用户可读),HTTPS 直链访问
// 云开发控制台 -> 存储 -> 文件详情的下载地址,取到 /assets 为止的前缀
const ASSET_BASE = 'https://636c-cloudbase-d8gyy2qjqef096442-1471843187.tcb.qcloud.la/assets'
// 素材版本:同名文件覆盖上云后,小程序 image/audio 会命中旧缓存;改此号强制全端刷新(素材批次日期)
const ASSET_VER = '20260908'

module.exports = { ASSET_BASE, ASSET_VER }
