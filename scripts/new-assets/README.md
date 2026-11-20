# 新增 32 字素材(待上传云存储)

由 `node scripts/gen-new-assets.mjs` 生成(OpenMoji 图 618x618 + Huihui TTS 字音/组词音),
对应 `characters.js` 中新增的 32 个字(单元 18/19 + 单元 6/7/9/13/16 补字)。

- `assets/images/` 32 张 PNG(按字码点命名,如 一=4e00.png)
- `assets/audio/` 64 条 WAV(`{码点}.wav` 读单字,`{码点}-word.wav` 读「字,组词」)

## 上传(本目录为历史批次产物,已上云;如今同步入口统一为 ECS)

```bash
bash scripts/ecs/sync-ecs.sh
```

## 验证(任抽几条)

```bash
curl -sI http://47.93.245.108:8081/assets/images/%E4%B8%80.png
curl -sI http://47.93.245.108:8081/assets/audio/tianmei/4e00.mp3
```
(图=汉字名百分号编码;字音频在音色子目录,hex 命名)
