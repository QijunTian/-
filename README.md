# A股AI分析本地运行说明

本仓库已接入评价最易上手、免费数据优先的项目：

**[ZhuLinsen/daily_stock_analysis](https://github.com/ZhuLinsen/daily_stock_analysis)**（约5.8万Star）

## 为何选它

- 免费行情源：AkShare/腾讯/Baostock等，可不配Tushare
- 上手快：克隆后配`.env`即可；支持`--dry-run`先验证数据
- A股友好：自选股日更、决策看板、Web工作台
- 配DeepSeek Key后即可完整AI分析与推送

## 本机已完成

1. 克隆到`daily_stock_analysis/`
2. 安装Python依赖（`.venv`）
3. 构建前端到`daily_stock_analysis/static/`
4. 写入最小`.env`（自选股含口子窖`603589`）
5. `--dry-run`已拉取行情入库（口子窖最新约`19.56`，`2026-07-23`跌约`2.05%`）

## Windows 本机一键启动（推荐）

前置：安装 [Python 3.10+](https://www.python.org/downloads/)（勾选Add to PATH）、[Git](https://git-scm.com/download/win)；完整页面再装 [Node.js LTS](https://nodejs.org/)。

把本仓库拉到本机后，任选其一：

```powershell
# PowerShell
powershell -ExecutionPolicy Bypass -File scripts\run_daily_stock_analysis.ps1
```

或资源管理器双击：`scripts\run_daily_stock_analysis.bat`

浏览器打开：`http://127.0.0.1:8001`

## Linux / macOS 快速启动

```bash
bash scripts/run_daily_stock_analysis.sh
```

或手动：

```bash
cd daily_stock_analysis
source .venv/bin/activate
python main.py --webui-only --no-notify
```

浏览器打开：`http://127.0.0.1:8001`

## 开启完整AI分析（推荐DeepSeek）

编辑`daily_stock_analysis/.env`，取消注释并填写：

```env
OPENAI_API_KEY=sk-你的密钥
OPENAI_BASE_URL=https://api.deepseek.com/v1
OPENAI_MODEL=deepseek-chat
AGENT_MODE=true
```

然后：

```bash
cd daily_stock_analysis && source .venv/bin/activate
python main.py --stocks 603589,600519 --no-notify
```

## 注意

- `.env`含密钥，勿提交到Git（已在忽略规则中）
- 免费数据源可能被上游限流，项目会自动切换备用源
- 分析结果仅供学习研究，不构成投资建议
