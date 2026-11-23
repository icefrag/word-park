// 素材版本号:云端下发
// 背景:素材 URL 里的 v 参数原先写死在包里,改图必须重新发版小程序;而且 nginx 给同名文件
//      30 天强缓存,同名覆盖后客户端根本不回源。
// 方案:ECS 上放 version.json(内容 {"ver":"20261123"}),启动时拉一次,拉到的版本存本地,
//      之后所有素材 URL 用这个版本号。改素材只需覆盖文件 + 改 version.json,不用发版。
// 兜底:拉取失败或用户没网时,用包内 config.ASSET_VER 默认值。
const { ASSET_BASE, ASSET_VER } = require('../config')

const STORAGE_KEY = 'assetVer'
let current = ''

// 当前生效的版本号(先看本地缓存,再看包内默认值)
function getVer() {
  if (!current) {
    current = wx.getStorageSync(STORAGE_KEY) || ASSET_VER
  }
  return current
}

// 拉云端版本;返回新版本号(有变化时),无变化或失败返回 null
function refresh() {
  return new Promise((resolve) => {
    wx.request({
      url: `${ASSET_BASE}/version.json?t=${Date.now()}`,
      success(res) {
        const v = res.data && res.data.ver
        if (v && v !== getVer()) {
          current = v
          wx.setStorageSync(STORAGE_KEY, v)
          resolve(v)
        } else {
          resolve(null)
        }
      },
      fail() { resolve(null) }
    })
  })
}

module.exports = { getVer, refresh }
