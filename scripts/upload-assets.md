# 素材同步到阿里云 ECS(上线真机必需)

小程序主包上限 2MB,248MB 素材(391 图 + 4,873 音频)全部放 ECS 自建 nginx,HTTP 直链访问。
2026-11-18 从微信云开发 CloudBase 全量迁来(CloudBase 已弃用,不再续费)。

## 架构速览

| 项 | 值 |
|---|---|
| 事实源 | 本地 `upload-cloud/`(= ECS `C:\www\assets` 完整镜像) |
| 服务地址 | `http://47.93.245.108:8081/assets/...`(nginx @ Windows Server) |
| 同步入口 | `bash scripts/ecs/sync-ecs.sh`(增量,只传新增/变更) |
| 全量核对 | `node scripts/check-cloud.mjs`(期望 5264 全 200) |
| 服务器配置 | `scripts/ecs/nginx.conf`;SSH 别名 `wordpark-ecs`(~/.ssh/config) |
| nginx 目录 | `C:\Users\Administrator\Desktop\nginx-1.31.8`(开机自启:计划任务 wordpark-nginx) |

## 日常同步(换图/新增字后)

1. 生成/更新素材到 `upload-cloud/`(生图脚本两目录同时写)
2. `bash scripts/ecs/sync-ecs.sh`
3. **同名覆盖必须升 `miniprogram/config.js` 的 `ASSET_VER`**(微信端缓存顽固,见 char-image SKILL.md 踩坑记录)
4. `node scripts/check-cloud.mjs` 全量核验

## ⚠️ 不要用远程 tar 解压传文件

Windows bsdtar 按系统 GBK 码页解 UTF-8 文件名,汉字图片名解码冲突互相覆盖
(2026-11-18 踩坑:tar 传 391 图只落地 183 张;音频全 ASCII 幸免)。一律走 scp/SFTP 直传。

## 验证清单

- [ ] 首页熊猫图正常显示(图片直链生效)
- [ ] 点开始有欢迎语音(音频直链生效)
- [ ] 第 1 关识字卡图片+组词语音正常
