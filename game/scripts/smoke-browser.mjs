import { chromium } from 'playwright'

const base = process.env.SMOKE_URL || 'http://127.0.0.1:4173/'
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 420, height: 820 } })
await page.goto(base, { waitUntil: 'networkidle' })
if ((await page.title()) !== '摸鱼锅') throw new Error('title mismatch')

await page.getByRole('button', { name: '开始试锅' }).click()
await page.locator('[data-action="ad-shake"]').click()
await page.waitForSelector('.ad-card')
const t0 = Date.now()
await page.waitForFunction(() => !document.querySelector('.ad-card'), null, { timeout: 8000 })
if (Date.now() - t0 < 2000) throw new Error('ad too fast')

await page.locator('[data-action="home"]').click()
await page.getByRole('button', { name: '直接今日挑战' }).click()
const canvas = page.locator('#game-canvas')
let failed = false
for (let i = 0; i < 120; i++) {
  if (await page.locator('[data-action="revive"]').count()) {
    failed = true
    break
  }
  await canvas.click({
    position: { x: 100 + (i % 6) * 40, y: 230 + (i % 5) * 35 },
    force: true,
  })
}
if (!failed) throw new Error('challenge did not fail')
await page.locator('[data-action="revive"]').click()
await page.waitForSelector('.ad-card')
await page.waitForFunction(() => !document.querySelector('.ad-card'), null, { timeout: 8000 })
await page.waitForSelector('[data-action="shake"]')
console.log('SMOKE_BROWSER_OK')
await browser.close()
