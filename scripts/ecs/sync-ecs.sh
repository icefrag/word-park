#!/usr/bin/env bash
# word-park 素材增量同步到阿里云 ECS —— 素材上云唯一入口(CloudBase 已弃用)
# 用法: bash scripts/ecs/sync-ecs.sh
# 机制: 与上次同步清单比对,逐文件 SFTP 直传新增/变更文件(不用远程 tar:
#       Windows bsdtar 按 GBK 码页解 UTF-8 名,汉字文件名会冲突覆盖,见 2026-11-18 迁移记录)
# 注意: 同名覆盖后微信端缓存顽固,须同步升 miniprogram/config.js 的 ASSET_VER
# 说明: 只增不删;远端多出的文件不清理(如需全量重建直接喊 agent 重跑迁移)
set -euo pipefail
cd "$(dirname "$0")/../.."

HOST=wordpark-ecs                       # ~/.ssh/config 别名
REMOTE_DIR=C:/www/assets                # ECS nginx root
STATE=scripts/ecs/.sync-state.txt

# 1. 本地清单: 大小|mtime|路径
find upload-cloud -type f -printf '%s|%T@|%p\n' | sort > "$STATE.new"

# 2. 与上次清单差集 = 新增/变更(大小或 mtime 任一变化)
if [[ -f $STATE ]]; then
  changed=$(comm -13 "$STATE" "$STATE.new" | awk -F'|' '{print $3}')
else
  echo "无历史清单,视为全量同步"; changed=$(awk -F'|' '{print $3}' "$STATE.new")
fi

total=$(grep -c . <<<"$changed" || true)
if [[ $total -eq 0 ]]; then echo "无变更,远端已是最新"; rm "$STATE.new"; exit 0; fi
echo "待同步 $total 个文件..."

# 3. 逐文件直传(目录不存在则先建;用 fd3 防 ssh/scp 吃掉清单 stdin)
n=0
while IFS= read -r -u 3 f; do
  [[ -z $f ]] && continue
  rel=${f#upload-cloud/}
  dir=$(dirname "$rel")
  if [[ $dir != . ]]; then
    ssh "$HOST" "powershell -NoProfile -Command \"New-Item -ItemType Directory -Force -Path '$REMOTE_DIR/$dir' | Out-Null\"" >/dev/null
  fi
  scp -q "upload-cloud/$rel" "$HOST:$REMOTE_DIR/$rel"
  n=$((n + 1)); echo "  [$n/$total] $rel"
done 3<<< "$changed"

mv "$STATE.new" "$STATE"
echo "同步完成: $n 个文件已上 ECS ($REMOTE_DIR)"
echo "提醒: 若覆盖了同名文件,记得升 miniprogram/config.js 的 ASSET_VER"
