# 汉字小乐园(微信小程序版)

给 3-4 岁小朋友的认汉字小游戏:100 个有图汉字、17 个主题单元、8 种玩法,
全程语音引导、零惩罚设计。由网页版(Vue 3)迁移而来,逻辑层(characters/levels/engine/progress)
与网页版同源,UI 层转为原生小程序页面与自定义组件。

## 功能

- **17 个主题单元**:日月水火 → 一家人 → 动物园 → 小身体与文具,每单元 4-8 字
- **8 种玩法**:识字卡、看图选字、听音选字、找一找、翻牌配对、气泡挑战、打地鼠、连连看
- **100 字全配图**(OpenMoji,CC BY-SA 4.0)+ 221 条预生成语音(微软 Huihui)
- **零惩罚**:答错只有鼓励语音,答对星星粒子 + 表扬
- **进度本地存储**:星级、解锁、已认字数;家长可一键重置

## 目录结构

```
miniprogram/
├── app.{js,json,wxss}        # 入口:页面注册 + 全局样式(rpx 适配手机)
├── config.js                 # 素材基地址:本地 '/assets' 或云存储直链
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
└── assets/                   # 开发期本地素材(上线前上云并删除,见下方)
```

## 开发

1. 微信开发者工具导入项目根目录(AppID: wx95ae2ac906b4d550)
2. 模拟器直接可玩(本地素材,不受 2MB 限制)

```bash
node scripts/smoke-test.mjs      # 逻辑层冒烟测试(21 项)
node scripts/prepare-assets.mjs  # 从网页版重新生成素材(改字表后)
```

## 上线(真机/体验版)

素材 21MB 超主包 2MB 限制,须上云存储,步骤见 `scripts/upload-assets.md`:
开通云环境 → 上传 `miniprogram/assets` → 权限设「所有用户可读」→
`config.js` 的 `ASSET_BASE` 改为云直链 → 删除本地 assets → 上传体验版。

## 致谢

- 图片:[OpenMoji](https://openmoji.org/)(CC BY-SA 4.0)
- 语音:Microsoft Huihui (Windows TTS) 预生成
