#!/usr/bin/env bash
# 本地启动 daily_stock_analysis（最易上手的A股AI分析项目）
# 用法：bash scripts/run_daily_stock_analysis.sh

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP="$ROOT/daily_stock_analysis"

if [[ ! -d "$APP" ]]; then
  echo "未找到 $APP，请先克隆仓库"
  exit 1
fi

cd "$APP"

# 创建虚拟环境（若不存在）
if [[ ! -d .venv ]]; then
  python3 -m venv .venv
  # shellcheck disable=SC1091
  source .venv/bin/activate
  pip install -U pip setuptools wheel
  pip install -r requirements.txt
else
  # shellcheck disable=SC1091
  source .venv/bin/activate
fi

# 最小配置文件
if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "已生成 .env，请填入 OPENAI_API_KEY（DeepSeek兼容）后再做完整AI分析"
fi

mkdir -p data logs

# 前端静态资源（可选；已构建则跳过）
if [[ ! -f static/index.html ]]; then
  if command -v npm >/dev/null 2>&1; then
    (cd apps/dsa-web && npm ci && npm run build)
  else
    echo "未安装 npm，将仅启动API（无完整Web页面）"
  fi
fi

echo "启动 WebUI：默认 http://127.0.0.1:8001"
echo "无LLM Key时可先：python main.py --dry-run --stocks 603589 --no-notify"
exec python main.py --webui-only --no-notify
