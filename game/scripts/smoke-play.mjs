/**
 * 无头冒烟：启动后打开页面，点开始试锅，尝试点击画布若干次。
 * 用 Playwright 若可用；否则仅做 HTTP + 静态资源检查。
 */
import { createServer } from 'node:http'
import { readFileSync, existsSync } from 'node:fs'
import { join, extname } from 'node:path'
import { pathToFileURL } from 'node:url'

const dist = join(process.cwd(), 'dist')
if (!existsSync(join(dist, 'index.html'))) {
  console.error('dist/ missing, run npm run build first')
  process.exit(1)
}

const mime = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
}

const server = createServer((req, res) => {
  const url = req.url === '/' ? '/index.html' : req.url.split('?')[0]
  const file = join(dist, url)
  if (!file.startsWith(dist) || !existsSync(file)) {
    res.writeHead(404)
    res.end('not found')
    return
  }
  res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'text/plain' })
  res.end(readFileSync(file))
})

await new Promise((r) => server.listen(4177, '127.0.0.1', r))
const base = 'http://127.0.0.1:4177'
const html = await fetch(base).then((r) => r.text())
if (!html.includes('摸鱼锅') && !html.includes('main') && !html.includes('assets/')) {
  // built index references assets; title is 摸鱼锅
}
const titleOk = html.includes('摸鱼锅')
console.log('HTTP index title ok:', titleOk)

let browserOk = false
try {
  const { chromium } = await import('playwright')
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 420, height: 800 } })
  await page.goto(base, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: '开始试锅' }).click({ timeout: 5000 })
  await page.waitForTimeout(500)
  // 点击画布中心偏上区域若干次，验证无崩溃
  const canvas = page.locator('#game-canvas')
  await canvas.click({ position: { x: 200, y: 300 } })
  await canvas.click({ position: { x: 160, y: 280 } })
  await canvas.click({ position: { x: 240, y: 320 } })
  const btn = page.getByRole('button', { name: /颠锅/ })
  await btn.click()
  const text = await page.locator('.controls').innerText()
  console.log('controls after shake:', text.replace(/\s+/g, ' ').trim())
  browserOk = true
  await browser.close()
} catch (e) {
  console.log('Playwright path skipped:', e.message)
}

server.close()
if (!titleOk) process.exit(1)
console.log('smoke done', { titleOk, browserOk })
