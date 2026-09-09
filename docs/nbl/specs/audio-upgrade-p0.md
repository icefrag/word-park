# 游戏音频升级 P0 设计（播报语音 / BGM / 音效）

> 2026-09-08 评审定稿（grill 7 轮决策全闭合）。状态：音色小样与文案清单待大王终裁，裁后执行批量合成。

## 1. 背景与目标

- 现状：全部播报音频为 Windows SAPI（Microsoft Huihui）预生成的 WAV，机械感重；无 BGM；4 个音效为老工程遗留。
- 目标：全量播报换 MiniMax TTS 温柔幼教女声；新增 BGM（主页/地图/奖励页）；4 个 UI 音效换 Pixabay 免版权音效。

## 2. 决策表

| # | 决策点 | 结论 | 依据 |
|---|---|---|---|
| Q1 | BGM 来源 | Pixabay 免版权曲库人工挑选 | MiniMax 音乐 API 实测返回 2153「不再面向新用户」（2026-08-20 公告），账号非历史付费用户；ModelScope 开源模型自部署不现实 |
| Q2 | 短音效来源 | Pixabay 音效库挑选替换 4 个 | MiniMax 无短音效接口（llms.txt 全索引确认），音乐接口无时长控制做不了 2 秒音效 |
| Q3 | 播报架构 | 全量预生成 mp3 + CDN 查表（即现有架构换引擎） | 文本集合有界 1221 条，无运行时动态拼接；主包 2MB 限制音频必须走云存储 |
| Q4 | 播报音色 | 温柔幼教女老师（非童声）；4 候选出小样终裁 | 听音辨字玩法中播报音是跟读模仿对象，标准清晰优先于萌；童声 `lovely_girl` 仅作对照试听 |
| Q5 | 固定文案 | 21 条全部重写为宝宝向文案 | 原文案不在仓库，重写零成本且可升级表达 |
| Q6 | BGM 场景 | 仅主页/地图/奖励页，玩法页静音 | 玩法页一半是听音辨字（quiz-sound/bubble-pop/whack-mole stage≥2 只听音），BGM 干扰辨音 |
| Q7 | 音乐接口替代 | Pixabay（而非 MiniMax Audio 网页版） | 大王拍板 |
| Q8 | 音色配置化 | 4 个音色全量生成，用户在设置中选择；默认「精品甜美女声」 | 大王拍板「1-4 都要」；增量成本约 4.5 元、云端约 +50MB，可接受。置 Q4 的单选终裁 |

默认拍板项：模型 `speech-2.8-hd`（3.5 元/万字符，汉字×2 计费，全量约 1.5 元/遍）；输出 mp3 32kHz/128kbps/单声道；语速 0.9；夸奖 happy 情绪、指令/欢迎 calm；单字条目用 characters.js 的 pinyin 生成 pronunciation_dict 强制正音；文件命名与调用方式完全不变（纯素材替换）。

## 3. 资产清单

voiceKey 取值：`tianmei`（精品甜美女声，默认）/ `xiaoling`（甜心小玲）/ `warm`（温暖少女）/ `tong`（萌萌女童）。

| 类别 | 数量 | 命名 | 文本来源 |
|---|---|---|---|
| 单字读音 | 600×4 | `audio/{voiceKey}/{hex码点}.mp3` | characters.js char 字段，pinyin 进 pronunciation_dict |
| 字词播报 | 600×4 | `audio/{voiceKey}/{hex码点}-word.mp3` | 「{char}，{word}」，依赖词上下文自然消歧 |
| 固定提示语 | 17×4 | `audio/{voiceKey}/voice-*.mp3` | 本文第 4 节清单 |
| UI 音效 | 4 | `audio/sfx-*.mp3`（根目录，不分音色） | 免版权音效库下载替换（correct/wrong/flip/win） |
| BGM | 1-2 | `audio/bgm-*.mp3`（根目录，不分音色） | 免版权曲库挑选 |

## 4. 固定文案清单 v1（待大王过目）

| 文件 | 场景 | 新文案 | 情绪 |
|---|---|---|---|
| voice-welcome | 主页进入/点熊猫 | 欢迎来到汉字乐园！点一点小熊猫，我们一起学汉字吧！ | calm |
| voice-lets-learn | 进地图/切页签 | 选一关，开始学汉字吧！ | calm |
| voice-level-complete | 过关庆祝 | 太棒了！这一关全部完成，你真是识字小达人！ | happy |
| voice-try-again | 答错鼓励（零惩罚） | 没关系，再试一次吧！ | calm |
| voice-praise-1 | 整轮完成夸奖（随机 6 选 1） | 哇，你真棒，全部答对啦！ | happy |
| voice-praise-2 | 〃 | 太厉害啦，你是识字小能手！ | happy |
| voice-praise-3 | 〃 | 真聪明，一个都没有错！ | happy |
| voice-praise-4 | 〃 | 好极了，这些字都认识你啦！ | happy |
| voice-praise-5 | 〃 | 太好了，又是全对！ | happy |
| voice-praise-6 | 〃 | 了不起，继续加油！ | happy |
| voice-instr-pic2char | 看图选字 | 看一看图片，点出正确的字吧！ | calm |
| voice-instr-sound2char | 听音选字 | 听一听，点出你听到的字吧！ | calm |
| voice-instr-findall | 找出全部目标字 | 把正确的字，全部找出来吧！ | calm |
| voice-instr-link | 字图连线配对 | 点一个字，再点它的图片，配成一对吧！ | calm |
| voice-instr-match | 翻牌配对 | 翻开卡片，找到相同的字和图片吧！ | calm |
| voice-instr-bubble | 戳气泡 | 听一听，戳破正确的字吧！ | calm |
| voice-instr-whack | 打地鼠 | 小地鼠举着字出来啦，快敲正确的字吧！ | calm |

（flash-card 无指令语音，播 `{char}-word`。）

## 5. 音色（4 个全部启用，大王拍板）

`scripts/audio-samples/` 留有 16 个试听小样（4 音色 × 欢迎/指令/字词/夸奖）：

| voiceKey | voice_id | 显示名 | 备注 |
|---|---|---|---|
| tianmei | `female-tianmei-jingpin` | 甜美女声 | **默认** |
| xiaoling | `tianxin_xiaoling` | 甜心小玲 | |
| warm | `Chinese (Mandarin)_Warm_Girl` | 温暖姐姐 | |
| tong | `lovely_girl` | 萌萌童声 | 童声，宝宝可切换当「小伙伴」 |

## 6. BGM 与音效最终选型（Mixkit License 可商用免署名；源文件在 `scripts/new-assets/raw-audio/`）

| 用途 | 落位文件 | 来源（Mixkit） |
|---|---|---|
| BGM | audio/bgm-main.mp3 | Owies Ukulele 2:40（Children/Folk Pop/Happy），assets.mixkit.co/music/1072/1072.mp3 |
| sfx-correct | audio/sfx-correct.wav | Correct answer tone 0:01，assets.mixkit.co/active_storage/sfx/2870/2870.wav |
| sfx-wrong | audio/sfx-wrong.wav | Wrong answer fail notification 0:01（温和款），sfx/946/946.wav |
| sfx-flip | audio/sfx-flip.wav | Tile game reveal 0:02，sfx/960/960.wav |
| sfx-win | audio/sfx-win.wav | Arcade game complete 0:01，sfx/205/205.wav |

备选（raw-audio/，同名替换即换，代码零改动）：mixkit-952（Correct answer reward）、mixkit-948（Wrong bass buzzer）、mixkit-226（Medieval fanfare 8s）、kenney_music-jingles.zip（CC0）。

## 7. 生成流水线（复用现有素材线）

- 脚本：`scripts/gen-voice-audio.mjs`（已建 samples 模式；batch 模式评审后扩展）——调 `/v1/t2a_v2`，双域名轮换、限流退避、key 读 `scripts/.env`，范式同 `gen-ai-images.mjs`。
- batch 模式要点：
  - manifest = (600 单字 + 600 字词 + 17 固定文案) × 4 音色 = 4868 条；3 并发跑，单条失败不中断，结尾汇总；双写目录已存在即跳过（断点续跑）。
  - pinyin 声调符号（rì）→ 数字声调（ri4）转换函数，ü 统一转 v（nǚ→nv3，smoke 阶段验证接口接受度）；单字条目附 `pronunciation_dict` 强制正音；字词条目靠词上下文自然消歧。
  - 字词停顿先用「中文逗号」（与旧版行为一致）；`<#0.4#>` 停顿标记留作后续调优项。
  - 产物双写 `scripts/new-assets/assets/audio/{voiceKey}/` + `upload-cloud/audio/{voiceKey}/`（.mp3，与旧 .wav 共存不覆盖）。
- BGM/音效：小美代选免授权来源（Mixkit/Kenney 免登录直下优先，Pixabay 需登录作后备）→ 丢 `scripts/new-assets/raw-audio/` → 统一按第 3 节命名落位（源文件已是 mp3 则直接用）。

## 8. 代码改动（外科手术式）

1. `miniprogram/utils/audio.js`：`fileUrl()` 改造——播报类（字/词/voice-*）走 `audio/{voiceKey}/{名}.mp3`（voiceKey 读本地存储 `voiceKey`，无则默认 `tianmei`），音效/BGM 走根目录 `.mp3`；导出 `VOICES` 配置表（key/显示名）与 `currentVoice()/setVoice(key)`。
2. 主页设置入口：右上角小齿轮 → 半屏弹层列出 4 个音色（当前项打勾），点选即切换并试听该音色的欢迎语，即时生效（wx.setStorageSync）。
3. `miniprogram/utils/audio.js`：新增 BGM 管理器（`wx.createInnerAudioContext` loop 单例，导出 `playBgm()/pauseBgm()`），home/map/reward 页 onShow 播放、onHide 暂停；play 页不接。
4. 玩法组件与页面调用方零改动——文件名规则由 `fileUrl()` 内部消化。

> 前置：`audio.js` 当前有并行任务（配图线）未提交改动，本节动手前须确认其已提交，避免踩脚。

## 9. 上云与验收

- 上云由大王手动执行（小美 shell 里 cloudbase CLI 认不到登录态，2026-09-08 实测只打印帮助未上传）。本地素材已就绪并通过双目录对账，逐条执行：

  ```
  cloudbase storage upload upload-cloud/audio/tianmei  assets/audio/tianmei  -e 636c-cloudbase-d8gyy2qjqef096442-1471843187
  cloudbase storage upload upload-cloud/audio/xiaoling assets/audio/xiaoling -e 636c-cloudbase-d8gyy2qjqef096442-1471843187
  cloudbase storage upload upload-cloud/audio/warm     assets/audio/warm     -e 636c-cloudbase-d8gyy2qjqef096442-1471843187
  cloudbase storage upload upload-cloud/audio/tong     assets/audio/tong     -e 636c-cloudbase-d8gyy2qjqef096442-1471843187
  cloudbase storage upload upload-cloud/audio/sfx-correct.wav assets/audio/sfx-correct.wav -e 636c-cloudbase-d8gyy2qjqef096442-1471843187
  cloudbase storage upload upload-cloud/audio/sfx-wrong.wav   assets/audio/sfx-wrong.wav   -e 636c-cloudbase-d8gyy2qjqef096442-1471843187
  cloudbase storage upload upload-cloud/audio/sfx-flip.wav    assets/audio/sfx-flip.wav    -e 636c-cloudbase-d8gyy2qjqef096442-1471843187
  cloudbase storage upload upload-cloud/audio/sfx-win.wav     assets/audio/sfx-win.wav     -e 636c-cloudbase-d8gyy2qjqef096442-1471843187
  cloudbase storage upload upload-cloud/audio/bgm-main.mp3    assets/audio/bgm-main.mp3    -e 636c-cloudbase-d8gyy2qjqef096442-1471843187
  ```

  注意：根目录 4 个 `sfx-*.wav` 会覆盖云端旧版（ASSET_VER 已升 `20260908-2`，强制全端刷缓存）。旧机械音 WAV（本地 1020 个 ×2 目录）已于 2026-09-09 清理（大王拍板不再保留回滚）；云端历史旧 WAV 已无引用，确认线上无旧版本客户端后可在控制台批量删除。
- 两步核对：① 本地对账已通过（4×1217 mp3 + 5 根文件，upload-cloud 与 new-assets 双目录一致）；② 上云后 HEAD 抽样：各音色 `65e5.mp3`、`5973.mp3`（女，ü 正音）、`voice-welcome.mp3`，根 `sfx-correct.wav`（新文件约 338KB，旧版仅 35KB 可据此区分）、`bgm-main.mp3`，应全 200。
- ⚠️ 踩坑记录（2026-09-09 排查）：音色目录上云后直链全 404 但控制台可见文件——**存储安全规则用了单段通配（`assets/audio/*`），`*` 不跨子目录**，根目录 sfx 能读、`tianmei/xxx.mp3` 被拒；且 CDN 缓存键忽略 query 参数，用签名地址请求过的文件裸访问会 200（Cache Hit 假象）。修复：自定义安全规则改 `{"read": true, "write": false}`。
- `node scripts/smoke-test.mjs` 已全绿（含音色切换/非法值/URL 规则断言）。

## 10. 执行顺序与状态

- [x] 音乐 API 实测（2153 关死，兜底免版权曲库）
- [x] 音色小样 16 个（大王反馈「效果不错」→ 拍板 4 音色全上做配置）
- [x] 21 条文案 v1（大王过目通过）
- [x] BGM/音效选型下载（Mixkit，第 6 节）
- [x] 批量合成 4868/4868（0 失败，4 音色 × 1217 条）
- [x] audio.js 音色配置 + 主页设置入口 + BGM 管理器 + smoke-test 全绿
- [ ] 上云（大王手动执行，命令见第 9 节）+ 上云后 HEAD 抽样
