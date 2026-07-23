# 在 Windows 本机一键安装并启动 daily_stock_analysis
# 用法：在仓库根目录打开 PowerShell，执行：
#   powershell -ExecutionPolicy Bypass -File scripts\run_daily_stock_analysis.ps1

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$App = Join-Path $Root "daily_stock_analysis"

Write-Host "==> 工作目录: $Root"

# 检查 Python
$py = Get-Command python -ErrorAction SilentlyContinue
if (-not $py) {
    Write-Host "未找到 python。请先安装 Python 3.10+ 并勾选 Add to PATH："
    Write-Host "https://www.python.org/downloads/"
    exit 1
}
Write-Host "==> Python: $(python --version)"

# 克隆项目
if (-not (Test-Path (Join-Path $App ".git"))) {
    Write-Host "==> 克隆 ZhuLinsen/daily_stock_analysis ..."
    git clone --depth 1 https://github.com/ZhuLinsen/daily_stock_analysis.git $App
} else {
    Write-Host "==> 已存在项目目录: $App"
}

Set-Location $App

# 创建虚拟环境
if (-not (Test-Path ".\.venv\Scripts\python.exe")) {
    Write-Host "==> 创建虚拟环境 .venv"
    python -m venv .venv
}

$VenvPy = ".\.venv\Scripts\python.exe"
$VenvPip = ".\.venv\Scripts\pip.exe"

Write-Host "==> 安装 Python 依赖（首次较慢）"
& $VenvPip install -U pip setuptools wheel
& $VenvPip install -r requirements.txt

# 最小 .env
if (-not (Test-Path ".env")) {
    Write-Host "==> 写入最小 .env"
    @"
# Windows 本地最小配置
STOCK_LIST=600519,300750,603589
REPORT_LANGUAGE=zh
DATABASE_PATH=./data/stock_analysis.db
LOG_DIR=./logs
LOG_LEVEL=INFO
WEBUI_ENABLED=true
WEBUI_HOST=127.0.0.1
WEBUI_PORT=8001
WEBUI_AUTO_BUILD=false
AGENT_MODE=false

# 完整 AI 分析时取消注释并填写 DeepSeek Key：
# OPENAI_API_KEY=sk-xxx
# OPENAI_BASE_URL=https://api.deepseek.com/v1
# OPENAI_MODEL=deepseek-chat
# AGENT_MODE=true
"@ | Set-Content -Encoding UTF8 ".env"
}

New-Item -ItemType Directory -Force -Path "data","logs" | Out-Null

# 构建前端（有 npm 则构建）
$npm = Get-Command npm -ErrorAction SilentlyContinue
if (-not (Test-Path ".\static\index.html")) {
    if ($npm) {
        Write-Host "==> 构建前端 WebUI"
        Push-Location "apps\dsa-web"
        npm ci
        npm run build
        Pop-Location
    } else {
        Write-Host "未检测到 npm。将仅启动 API；完整页面建议安装 Node.js LTS："
        Write-Host "https://nodejs.org/"
    }
} else {
    Write-Host "==> 前端静态资源已存在，跳过构建"
}

Write-Host ""
Write-Host "启动完成，请浏览器打开: http://127.0.0.1:8001/"
Write-Host "API 文档: http://127.0.0.1:8001/docs"
Write-Host "按 Ctrl+C 可停止服务"
Write-Host ""

& $VenvPy main.py --webui-only --no-notify
