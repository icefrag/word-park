// 棋盘类玩法的像素尺寸:rpx 在平板上随屏宽放大会撑爆竖屏高度,
// 统一按屏宽相对 375 基准缩放并封顶 1.3,平板与手机都拿到合理像素值
function rpx2px() {
  const ww = wx.getSystemInfoSync().windowWidth
  const scale = Math.min(ww / 375, 1.3)
  return (rpx) => Math.round((rpx / 2) * scale)
}

module.exports = { rpx2px }
