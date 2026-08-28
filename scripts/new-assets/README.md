# 新增 32 字素材(待上传云存储)

由 `node scripts/gen-new-assets.mjs` 生成(OpenMoji 图 618x618 + Huihui TTS 字音/组词音),
对应 `characters.js` 中新增的 32 个字(单元 18/19 + 单元 6/7/9/13/16 补字)。

- `assets/images/` 32 张 PNG(按字码点命名,如 一=4e00.png)
- `assets/audio/` 64 条 WAV(`{码点}.wav` 读单字,`{码点}-word.wav` 读「字,组词」)

## 上传(二选一,传完本目录可删)

1. 云开发控制台 → 存储 → 把 `assets` 文件夹整体上传(与已有 `assets/images`、`assets/audio` 合并)
2. 或命令行(首次需扫码授权):
   ```bash
   npx -y @cloudbase/cli login
   npx -y @cloudbase/cli storage upload scripts/new-assets/assets assets -e 636c-cloudbase-d8gyy2qjqef096442-1471843187
   ```

## 验证(任抽几条)

```bash
curl -sI https://636c-cloudbase-d8gyy2qjqef096442-1471843187.tcb.qcloud.la/assets/images/4e00.png
curl -sI https://636c-cloudbase-d8gyy2qjqef096442-1471843187.tcb.qcloud.la/assets/audio/4e00-word.wav
```
