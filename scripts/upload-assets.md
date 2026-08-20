# 素材上传云存储(上线真机必需)

小程序主包上限 2MB,21MB 素材(101 图 + 221 音频)必须放云存储,通过 HTTPS 直链访问。
模拟器开发期可直接用包内 `miniprogram/assets`(工具不受 2MB 限制),上线前完成以下步骤。

## 前置:创建云环境

1. 微信开发者工具顶部工具栏点「云开发」
2. 开通并创建环境(免费基础版即可,如 `word-park-xxxx`)
3. 记下环境 ID

## 方式一:云开发控制台手动上传(最简单,推荐)

1. 工具栏「云开发」→「存储」
2. **权限设置** → 选「所有用户可读」(这样文件可用 HTTPS 直链访问,无需登录态)
3. 点「上传文件夹」,选择 `miniprogram/assets` 整个文件夹
   (等价于最终路径 `assets/images/**` 与 `assets/audio/**`)
4. 回到文件列表,点开任意一张图,复制「下载地址」,形如:
   `https://word-park-xxxx.tcb.qcloud.la/assets/images/65e5.png`

## 方式二:命令行上传(可选)

```bash
# 首次需浏览器扫码授权(交互式)
npx -y @cloudbase/cli login
# <envId> 换成你的环境 ID
npx -y @cloudbase/cli storage upload miniprogram/assets assets -e <envId>
```

## 上传完成后:切换到云端地址

`miniprogram/config.js` 改一行(直链前缀到 `/assets` 为止):

```js
const ASSET_BASE = 'https://<envId>.tcb.qcloud.la/assets'
```

然后**删除 `miniprogram/assets` 目录**(否则包体积超 2MB 无法上传),
重新编译 → 真机预览 → 上传体验版。

## 验证清单

- [ ] 首页熊猫图正常显示(图片直链生效)
- [ ] 点开始有欢迎语音(音频直链生效)
- [ ] 第 1 关识字卡图片+组词语音正常
