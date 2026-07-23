#!/usr/bin/env bash
# 克隆评价最易上手的A股AI分析项目 daily_stock_analysis
# 注释：仅做浅克隆，加快下载

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TARGET="$ROOT/daily_stock_analysis"

if [[ -d "$TARGET/.git" ]]; then
  echo "已存在：$TARGET"
  exit 0
fi

git clone --depth 1 https://github.com/ZhuLinsen/daily_stock_analysis.git "$TARGET"
echo "克隆完成：$TARGET"
echo "下一步：bash scripts/run_daily_stock_analysis.sh"
