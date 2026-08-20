// 素材基地址:
// - 开发期(模拟器):本地包内 '/assets'
// - 素材上传云存储后:改为云存储 HTTPS 直链前缀,如 'https://<envId>.tcb.qcloud.la/assets'
//   (云开发控制台 -> 存储 -> 权限设置 -> 所有用户可读,即可用该直链访问)
const ASSET_BASE = '/assets'

module.exports = { ASSET_BASE }
