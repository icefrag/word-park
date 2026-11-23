# 汉字小乐园(微信小程序版)

给 3-4 岁小朋友的认汉字小游戏:132 个有图汉字、19 个主题单元、8 种玩法,
全程语音引导、零惩罚设计。由网页版(Vue 3)迁移而来,逻辑层(characters/levels/engine/progress)
与网页版同源,UI 层转为原生小程序页面与自定义组件。

## 功能

- **19 个主题单元**:日月水火 → 一家人 → 动物园 → 小身体与文具 → 数字乐园 → 象形字乐园,每单元 4-12 字
- **8 种玩法**:识字卡、看图选字、听音选字、找一找、翻牌配对、气泡挑战、打地鼠、连连看
- **132 字全配图**(OpenMoji,CC BY-SA 4.0)+ 285 条预生成语音(微软 Huihui)
- **零惩罚**:答错只有鼓励语音,答对星星粒子 + 表扬
- **进度本地存储**:星级、解锁、已认字数;家长可一键重置

## 目录结构

```
miniprogram/
├── app.{js,json,wxss}        # 入口:页面注册 + 全局样式(rpx 适配手机)
├── config.js                 # 素材基地址:ECS 直链(http://47.93.245.108:8081/assets)
├── pages/
│   ├── home/                 # 首页(欢迎语音 + 开始按钮)
│   ├── map/                  # 单元地图(星级/锁定/已认字进度条/家长重置)
│   ├── play/                 # 关卡容器:按轮次类型条件渲染 8 个玩法组件
│   └── reward/               # 过关奖励(彩带 + 星级)
├── components/               # 8 个玩法组件(全部 apply-shared 复用全局样式)
│   ├── flash-card/ quiz-picture/ quiz-sound/ quiz-findall/
│   └── memory-match/ bubble-pop/ whack-mole/ link-match/
├── utils/                    # 逻辑层(与网页版同源)
│   ├── characters.js         # 100 字唯一数据源(unit/emojiCode/图名 hex 转换)
│   ├── levels.js             # 17 关生成式定义
│   ├── engine.js             # 纯函数出题器
│   ├── progress.js           # wx storage 进度
│   └── audio.js              # InnerAudioContext 语音单通道 + 音效池
└── assets/                   # (已删除;素材全量在 ECS,本地镜像为 upload-cloud/)
```

## 开发

1. 微信开发者工具导入项目根目录(AppID: wx95ae2ac906b4d550)
2. 模拟器直接可玩(本地素材,不受 2MB 限制)

```bash
node scripts/smoke-test.mjs      # 逻辑层冒烟测试(21 项)
node scripts/gen-new-assets.mjs  # 新增字素材生成(OpenMoji 图 + Huihui TTS,改字表后)
```

## 上线(真机/体验版)

素材 248MB(391 图 + 4,873 音频)全量在阿里云 ECS 自建 nginx(CloudBase 已于 2026-11 弃用),
`config.js` 的 `ASSET_BASE` 已指向 `http://47.93.245.108:8081/assets`。
换图/加字后同步:`bash scripts/ecs/sync-ecs.sh`,流程与验证见 `scripts/upload-assets.md`。

### 改了素材怎么让客户端更新(不用发版)

素材版本号由 ECS 上的 `version.json` 下发:小程序启动时拉一次存本地,所有素材 URL 带这个版本号
(`miniprogram/utils/asset-version.js`)。改完素材按这三步:

```bash
# 1. 覆盖 upload-cloud/ 下的素材文件(图片/音频)
# 2. 升版本号(写 version.json + 包内兜底默认值)
node scripts/set-asset-ver.mjs 20261124
# 3. 同步上云(含 version.json)
bash scripts/ecs/sync-ecs.sh
```

客户端下次启动即换 URL 重新拉图。改了 nginx 配置用 `bash scripts/ecs/reload-nginx.sh` 重载
(nginx 由计划任务以 SYSTEM 身份运行,管理员会话直接 reload 会报 Access denied)。

## 致谢

- 图片:[OpenMoji](https://openmoji.org/)(CC BY-SA 4.0)
- 语音:Microsoft Huihui (Windows TTS) 预生成
