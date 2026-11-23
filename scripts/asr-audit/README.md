# 音频审计工具

校对播报音频到底读的什么字、什么声调。

## audit.py —— 字音审计

```bash
uv run audit.py --voice tianmei                # 全量(约 1200 条,CPU 上十几分钟)
uv run audit.py --voice tianmei --sample 40    # 只扫前 40 条
```

- 听写:faster-whisper(small,CPU)逐条转写 `upload-cloud/audio/<音色>/*.mp3`
- 比对:按**音节**比期望与听写(不是字符串子串)。子串比较会把「足 zu」当「左 zuo」判成匹配,曾漏掉真实错音
- 声调:单字条另比声调,同音不同调(如 zu2 → zuo3)单列到 `tone-mismatch.json`,需人耳复核
- 输出:`result.json`(全量明细)、`tone-mismatch.json`(声调不符候选)

注意:whisper small 对 0.8 秒孤立单字不可靠,「不匹配」清单里大量是 whisper 噪声,**结论必须人耳复核**。

## tone_check.py —— 声调体检

```bash
uv run tone_check.py tianmei:8db3                     # 查某个字某音色
uv run tone_check.py scripts/tmp-tts/tianmei/8db3.mp3 # 查任意文件
uv run tone_check.py                                  # 全量体检(4 音色)
```

用基频(F0)轨迹判声调:半段中位数差 `rel`(2声上升为正)与峰值位置 `peak`(3声峰值靠前)。
只作筛查:`rel > 0.08` 判上升、`rel < -0.08` 判下降、`peak < 0.45` 判降升。

## gen-chars.mjs —— 导出字表

```bash
node scripts/asr-audit/gen-chars.mjs
```

从 `miniprogram/utils/characters.js` 生成 `chars.json`(字/词/拼音),审计字表与线上素材同源。

## 案例:「足」读成「左」(2026-11)

- 现象:默认音色 tianmei 的「足」单字播报听起来是「左」
- 根因:9 月那批 TTS 生成的 `tianmei/8db3.mp3` 声调错了(读成 zuǒ),不是小程序配错文件
- 旁证:同音色的「足足球」词条读音正确;其余三个音色(xiaoling/warm/tong)的「足」都正常
- 修复:`node scripts/regen-char-audio.mjs 足 --try 3` 重生成并挑声调正确的那份,同步 ECS,升 `ASSET_VER`
- 遗留风险:**同一字的单字 TTS 读音不稳定**,同参数多次生成可能一个 zú 一个 zuǒ,重生成必须多生成几份再挑
