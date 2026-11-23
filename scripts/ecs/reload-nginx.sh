#!/usr/bin/env bash
# 重载 ECS 上的 nginx(改完 conf/nginx.conf 执行本脚本)
# 背景: nginx 由计划任务 wordpark-nginx 以 SYSTEM 身份运行,管理员 SSH 会话直接跑
#       nginx.exe -s reload 会报 OpenEvent(...Access denied),所以借一次性 SYSTEM 计划任务执行
set -euo pipefail
cd "$(dirname "$0")/../.."

HOST=wordpark-ecs
CONF_DIR='C:/Users/Administrator/Desktop/nginx-1.31.8/conf'
BAT_WIN='C:\Users\Administrator\Desktop\nginx-1.31.8\conf\reload.bat'

scp -q scripts/ecs/reload-nginx.bat "$HOST:$CONF_DIR/reload.bat"
ssh "$HOST" "cmd /c schtasks /Create /TN nginx-reload-once /TR $BAT_WIN /RU SYSTEM /SC ONCE /ST 23:59 /F"
ssh "$HOST" "cmd /c schtasks /Run /TN nginx-reload-once"
sleep 2
ssh "$HOST" "cmd /c schtasks /Delete /TN nginx-reload-once /F"
echo "nginx 已重载(配置: $CONF_DIR/nginx.conf)"
