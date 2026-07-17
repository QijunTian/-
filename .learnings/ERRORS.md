# ERRORS

## 2026-07-17 · 激励广告 rAF 在无头浏览器不结束

- **Symptom**：Playwright 点击「看广告+2颠锅」后 `.ad-card` 长时间不关闭，等待超时。
- **Cause**：`AdService` 用 `requestAnimationFrame` 推进进度；无头/后台场景下 rAF 可能不稳定，导致 Promise 不 resolve。
- **Fix**：改为 `setTimeout` 轮询 `Date.now()` 推进进度，仍保证 ≥2.5s 真实等待。
- **Prevention**：涉及计时的商业化流程优先用墙钟计时，不把 rAF 当唯一时钟。
