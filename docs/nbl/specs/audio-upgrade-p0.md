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

默认拍板项：模型 `speech-2.8-hd`（3.5 元/万字符，汉字×2 计费，全量约 1.5 元/遍）；输出 mp3 32kHz/128kbps/单声道；语速 0.9；夸奖 happy 情绪、指令/欢迎 calm；单字条目用 characters.js 的 pinyin 生成 pronunciation_dict 强制正音；文件命名与调用方式完全不变（纯素材替换）。

## 3. 资产清单

| 类别 | 数量 | 命名 | 文本来源 |
|---|---|---|---|
| 单字读音 | 600 | `{hex码点}.mp3` | characters.js char 字段，pinyin 进 pronunciation_dict |
| 字词播报 | 600 | `{hex码点}-word.mp3` | 「{char}，{word}」，依赖词上下文自然消歧 |
| 固定提示语 | 17 | `voice-*.mp3` | 本文第 4 节清单 |
| UI 音效 | 4 | `sfx-*.mp3` | Pixabay 下载替换（correct/wrong/flip/win） |
| BGM | 1-2 | `bgm-main.mp3`（可选 `bgm-reward.mp3`） | Pixabay 挑选 |

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

## 5. 音色小样（待大王试听终裁）

`scripts/audio-samples/`，4 音色 × 4 段真实文案（欢迎/指令/字词/夸奖）：

1. `female-tianmei-jingpin` 精品甜美女声
2. `tianxin_xiaoling` 甜心小玲
3. `Chinese (Mandarin)_Warm_Girl` 温暖少女
4. `lovely_girl` 萌萌女童（童声对照）

## 6. Pixabay 候选（待大王试听定稿）

试听：搜索页内直接点播放；定稿后下载 mp3 丢 `scripts/new-assets/raw-audio/`，小美统一处理上云。

| 用途 | 搜索页 | 候选（页面内按名搜索） |
|---|---|---|
| BGM | pixabay.com/zh/music 搜 `kids happy` | Kids Happy - Happy Kids (PaulYudin, 1:15)；Happy Kids (The_Mountain, 1:23)；Kids - Kids Happy Music (alex-morgan, 1:47)；Happy Ukulele (SigmaMusicArt, 1:29) |
| sfx-correct | 搜 `correct` | Correct (DRAGON-STUDIO)；Chime Positive-tone；Correct Right Accurate |
| sfx-wrong | 搜 `wrong` | Wrong Answer (Universfield 0:03 按钮音)；Error/Mistake (Lesiakower)；Error 08 (Universfield)。挑温和不吓人的，避开刺耳 buzzer |
| sfx-flip | 搜 `flip` | flipCard (freesound)；Page Flip |
| sfx-win | 搜 `win` | Level win (0:03)；You Win Sequence 2 (floraphonic 0:07)；Marimba Win F 2 (木琴，很童趣) |

## 7. 生成流水线（复用现有素材线）

- 脚本：`scripts/gen-voice-audio.mjs`（已建 samples 模式；batch 模式评审后扩展）——调 `/v1/t2a_v2`，双域名轮换、限流退避、key 读 `scripts/.env`，范式同 `gen-ai-images.mjs`。
- batch 模式要点：
  - manifest = 600 单字 + 600 字词 + 17 固定文案（文案表内置于脚本，含情绪标注）。
  - pinyin 声调符号（rì）→ 数字声调（ri4）转换函数，单字条目附 `pronunciation_dict` 强制正音；字词条目靠词上下文自然消歧。
  - 字词停顿先用「中文逗号」，批量前用 2-3 个字对比 `日，太阳` vs `日<#0.4#>太阳` 效果再定。
  - 产物双写 `scripts/new-assets/assets/audio/` + `upload-cloud/audio/`（.mp3，与旧 .wav 共存不覆盖）。
- BGM/音效：大王下载丢 `scripts/new-assets/raw-audio/` → 统一转 32kHz 单声道 mp3（必要时 BGM 裁剪循环段）→ 按第 3 节命名落位。

## 8. 代码改动（外科手术式）

1. `miniprogram/utils/audio.js`：`fileUrl()` 扩展名 `.wav` → `.mp3`（一行，覆盖全部播报与音效）。
2. `miniprogram/utils/audio.js`：新增 BGM 管理器（`wx.createInnerAudioContext` loop 单例，导出 `playBgm()/pauseBgm()`），home/map/reward 页 onShow 播放、onHide 暂停；play 页不接。
3. 调用方（4 页 + 8 玩法组件）零改动——文件名不变。

## 9. 上云与验收

- 上云：`cloudbase storage upload upload-cloud/audio assets/audio -e 636c-cloudbase-d8gyy2qjqef096442-1471843187`。
- 两步核对（项目惯例）：① `node -e` 统计 upload-cloud/audio 与 scripts/new-assets/assets/audio 的 mp3 数量对账（预期 1221 + BGM）；② curl 对云端 base URL 抽样 HEAD 8-10 个文件（含 voice-*/sfx-*/码点混合）确认 200。
- `node scripts/smoke-test.mjs` 回归（含 audio URL 断言）。
- 旧 .wav 确认无引用后择期清理，不阻塞本期。

## 10. 执行顺序与状态

- [x] 音乐 API 实测（2153 关死，兜底 Pixabay）
- [x] 音色小样 16 个（`scripts/audio-samples/`，待终裁）
- [x] 21 条文案 v1（第 4 节，待过目）
- [x] Pixabay 候选（第 6 节，待试听）
- [ ] 大王三项终裁
- [ ] batch 模式批量合成 1221 条 + 上云 + 两步核对
- [ ] audio.js 改 mp3 + BGM 管理器 + smoke-test
