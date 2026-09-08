---
name: char-image
description: word-park 识字卡片 AI 生图工作流(MiniMax image-01)。当需要为汉字新增/更换/重生成配图、characters.js 加了新字要补图、修「图片辨识度/不形象/一图多字」问题,或用户提到 字图/识字卡图片/生图/换图/图片素材 时使用。涵盖提示词撰写规范、生成命令、验收标准与上云流程。
---

# 字图生产工作流(word-park)

单一事实来源:`miniprogram/utils/characters.js`(字表) + `scripts/ai-prompts.json`(逐字场景提示词)。
生成工具:`scripts/gen-ai-images.mjs`(密钥在 `scripts/.env` 的 `MINIMAX_API_KEY`,不入库)。

## 流程

### 1. 确定目标字

- 新增字:先在 `characters.js` 加字并给非空 `emojiCode`(仅作为"有图"标记,内容不再用于生图)。
- 换图:直接定位目标字。

### 2. 撰写场景提示词(写进 scripts/ai-prompts.json)

每字一句中文场景,规则按优先级:

1. **单主体、具体可感**:幼儿 3 秒内认出主体;一个字一张图,不画多个并列主体(数字/成组词除外)。
2. **同词族必须拉开差异**:近义字用不同构图/状态区分。例:牙=单颗大白牙、齿=一排牙;船=木渔船、舟=独木舟、帆=白帆船;池=荷叶青蛙池塘、塘=水塘小鸭。
3. **抽象字场景化**:颜色→该色专属物体(红=消防车、黄=出租车、白=牛奶);数字→可数物体排排(生成后必须人工数数验收);方位→位置关系(上=积木顶上的猫、里=纸箱探头);加减乘除→彩色运算符号积木。
4. **人物字用年龄感区分**:哥姐=学龄比例+书包马尾;弟妹=幼儿大头比例+玩偶围兜;爷奶=白发+老花镜+唐装对襟衫。
5. **严禁画面出现文字**:提示词显式写"无文字";人物服饰写"纯色无花纹"(实测花纹易带出汉字,如奶的"福"字纹、妈的 Mother)。模型对"无文字"指令遵循率约 90%,残留靠验收兜底。
6. 数量词写汉字("五颗"),不写阿拉伯数字。

风格模板由工具自动拼接(`STYLE` 常量,勿在场景里重复):Q版圆润卡通、糖果色、单主体居中、纯白背景、无文字。改风格只改 `gen-ai-images.mjs` 的 `STYLE` 一处,全量重生成保持统一。

### 3. 生成

```bash
cd scripts
node gen-ai-images.mjs chars 字1 字2 ...   # 指定字,强制重生成
node gen-ai-images.mjs missing            # 补缺
node gen-ai-images.mjs all --force        # 全量重生成
```

产物:1024 原图缓存在 `scripts/ai-raw/`(重加工免重烧 API),成品 618x618 透明 PNG 自动写入
`scripts/new-assets/assets/images/` 和 `upload-cloud/images/`(文件名=字符 hex 码点,如 土→571f.png)。
成本:image-01 按张计费(约每张几毛钱),全量 389 张 ≈ 百元级,先 `chars` 试点再放量。

### 4. 验收(每批必做)

- 透明度:抽 3-5 张查四角 alpha=0(工具自动抠白,极少失败;视觉模型报"黑背景"是透明底的误报)。
- 语义:视觉模型逐张核对"画的是不是{字}{词}、有无文字/字母、五官手指有无畸形"。
- 数字字(一~十、百):人工/视觉数数,数量不符则换 seed 重生成(`chars` 重跑即可)。
- 人物字:核对年龄感与提示词设定(哥姐≠弟妹比例)。
- 多张可比对时拼网格图一次审(`sharp composite`,参考 pilot-grid.png 做法)。

### 5. 上云

```bash
cloudbase storage upload upload-cloud/images assets/images -e 636c-cloudbase-d8gyy2qjqef096442-1471843187
# 或云开发控制台手动上传 upload-cloud/images 到 assets/ 下
```

上传后抽查 URL 200(ASSET_BASE 见 `miniprogram/config.js`)。**覆盖云端旧图前旧图即备份,误覆盖可从 `scripts/emoji-backup-*/` 回滚**(首次 AI 全量替换前已备份全部 OpenMoji 旧图)。

## 踩坑记录

- `sharp` 的 `toBuffer({resolveWithObject:true})` 返回的 data 是 Buffer(本身即字节数组),没有 `.data` 属性。
- ESM 里不能用 `require`,取 characters.js 要 `createRequire()`。
- OpenMoji 旧管线 `gen-new-assets.mjs chars X` 会用 emoji 重覆盖 AI 图——AI 图时代禁用其图片部分,音频部分仍可用。
- 视觉验收接口(analyze_image)只收远程 URL,本地图先 Read 触发 CDN 化再用。
