// app.js
const { refresh } = require('./utils/asset-version')

App({
  onLaunch: function () {
    // 素材走云存储 HTTPS 直链(config.js),玩法本身不依赖云 API;
    // 保留 init 为后续云函数/开放数据能力预留,env 留空使用默认环境
    if (wx.cloud) {
      wx.cloud.init({ traceUser: true })
    }
    // 拉一次云端素材版本(ECS 上的 version.json):版本存本地,后续素材 URL 用它,
    // 这样改素材只要覆盖文件 + 改 version.json,不用重新发版小程序
    refresh()
  },
})
