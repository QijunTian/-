# ERRORS

## 2026-07-17 · 激励广告 rAF 在无头浏览器不结束

- **Symptom**：Playwright 点击「看广告+2颠锅」后 `.ad-card` 长时间不关闭，等待超时。
- **Cause**：`AdService` 用 `requestAnimationFrame` 推进进度；无头/后台场景下 rAF 可能不稳定，导致 Promise 不 resolve。
- **Fix**：改为 `setTimeout` 轮询 `Date.now()` 推进进度，仍保证 ≥2.5s 真实等待。
- **Prevention**：涉及计时的商业化流程优先用墙钟计时，不把 rAF 当唯一时钟。

## 2026-07-20 · 挑战关0%通关与UI遮挡

- **Symptom**：诊断脚本显示挑战关贪心策略通关率0%；浏览器截图显示底部按钮压住餐盘。
- **Cause**：挑战关参数过猛（8种×6、4层、遮挡0.62、颠锅1）；餐盘画在 y=600 与 HTML 控件重叠。
- **Fix**：挑战改为8种×3、3层、遮挡0.5、颠锅2；锅/餐盘上移；可点块金色描边；连败从第2次起加颠锅；增加难度回归测试。
- **Prevention**：改难度必须跑 `scripts/diagnose-difficulty.mts` 或 `difficulty.test.ts`，禁止只凭感觉。

## 2026-07-21 · 手感无聊：只有干点消

- **Symptom**：可玩但“没意思”——缺少声音、连击反馈，点任何块收益一样。
- **Cause**：MVP只做了规则正确，没做情绪节奏；题材停在文案层。
- **Fix**：加 WebAudio 音效；热度条（乱点糊锅会爆发洗牌）；连消；摸鱼甩回压力块；咖啡+颠锅；emoji+吐槽条。
- **Prevention**：每版自测问三句：有没有声音？点不同块是否手感不同？失败前有没有预警？
