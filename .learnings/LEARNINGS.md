# Learnings

记录可复用做法与经验。

## 2026-07-23 · daily_stock_analysis 本地落地

- 项目：ZhuLinsen/daily_stock_analysis（A股AI分析，免费数据优先）
- 做法：`python3 -m venv` 前需系统包 `python3.12-venv`；依赖装完后先 `--dry-run` 验证行情源
- 东财/Efinance 可能断连，项目会自动切腾讯等备用源
- Web：`apps/dsa-web` 执行 `npm ci && npm run build` 产出 `static/`，再 `python main.py --webui-only`
- 无 LLM Key 时仍可起 Web/API；完整AI分析需配置 DeepSeek 兼容的 `OPENAI_API_KEY` + `OPENAI_BASE_URL`
