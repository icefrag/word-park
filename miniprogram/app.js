// app.js
App({
  onLaunch: function () {
    // 素材走云存储 HTTPS 直链(config.js),玩法本身不依赖云 API;
    // 保留 init 为后续云函数/开放数据能力预留,env 留空使用默认环境
    if (wx.cloud) {
      wx.cloud.init({ traceUser: true })
    }
  },
})
