import { chromium } from 'playwright'

const base = process.env.SMOKE_URL || 'http://127.0.0.1:4173/'
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 420, height: 840 } })
await page.goto(base, { waitUntil: 'networkidle' })
if ((await page.title()) !== '摸鱼锅') throw new Error('title mismatch')

await page.getByRole('button', { name: '开始这一班' }).click()
await page.waitForTimeout(400)
const canvas = page.locator('#game-canvas')
const box = await canvas.boundingBox()
if (!box) throw new Error('no canvas')

// 从桌面区域拖到锅
await page.mouse.move(box.x + box.width * 0.35, box.y + box.height * 0.35)
await page.mouse.down()
await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.72, { steps: 8 })
await page.mouse.up()
await page.waitForTimeout(200)

await page.getByRole('button', { name: '点锅加速炖' }).click()
await page.waitForTimeout(200)
await page.locator('[data-action="stir"]').click()
await page.screenshot({ path: '/opt/cursor/artifacts/stew-play.png' }).catch(() => {})
console.log('SMOKE_BROWSER_OK')
await browser.close()
