import { ITEM_CATALOG } from './items.ts'
import { isItemClickable } from './levelGen.ts'
import type { LevelRuntime } from './types.ts'

const W = 390
const H = 720

export function logicalSize(): { w: number; h: number } {
  return { w: W, h: H }
}

export function drawFrame(
  ctx: CanvasRenderingContext2D,
  runtime: LevelRuntime,
  blockedFlashUid: string | null,
  shakePulse: number,
): void {
  ctx.clearRect(0, 0, W, H)

  // 背景氛围
  const g = ctx.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, '#1a120b')
  g.addColorStop(0.45, '#3b2416')
  g.addColorStop(1, '#120c08')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)

  // 蒸汽点
  ctx.globalAlpha = 0.15
  ctx.fillStyle = '#fde68a'
  for (let i = 0; i < 12; i++) {
    const x = 40 + ((i * 67) % 310)
    const y = 80 + ((i * 41) % 120) + Math.sin(shakePulse + i) * 4
    ctx.beginPath()
    ctx.arc(x, y, 10 + (i % 3) * 3, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1

  drawPot(ctx, shakePulse)

  const alive = runtime.items.filter((i) => !i.removed)
  alive.sort((a, b) => a.layer - b.layer || a.y - b.y)

  for (const item of alive) {
    const clickable = isItemClickable(item, runtime.items)
    const def = ITEM_CATALOG[item.type]
    const flash = blockedFlashUid === item.uid
    const ox = Math.sin(shakePulse * 8 + item.layer) * (shakePulse > 0 ? 3 : 0)
    const oy = Math.cos(shakePulse * 7 + item.layer) * (shakePulse > 0 ? 2 : 0)

    ctx.save()
    ctx.translate(item.x + ox, item.y + oy)

    // 阴影
    ctx.fillStyle = 'rgba(0,0,0,0.28)'
    roundRect(ctx, 6, 8, item.w - 4, item.h - 4, 14)
    ctx.fill()

    ctx.fillStyle = def.color
    roundRect(ctx, 0, 0, item.w - 6, item.h - 6, 14)
    ctx.fill()

    ctx.strokeStyle = flash ? '#fff' : def.accent
    ctx.lineWidth = flash ? 4 : 2
    roundRect(ctx, 0, 0, item.w - 6, item.h - 6, 14)
    ctx.stroke()

    if (!clickable) {
      ctx.fillStyle = 'rgba(0,0,0,0.45)'
      roundRect(ctx, 0, 0, item.w - 6, item.h - 6, 14)
      ctx.fill()
    }

    ctx.fillStyle = '#fff'
    ctx.font = 'bold 16px "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(def.name, (item.w - 6) / 2, (item.h - 6) / 2)

    ctx.restore()
  }

  drawSlot(ctx, runtime)
  drawHud(ctx, runtime)
}

function drawPot(ctx: CanvasRenderingContext2D, shakePulse: number): void {
  const cx = 195 + Math.sin(shakePulse * 10) * shakePulse * 4
  const cy = 320
  ctx.save()
  ctx.translate(cx, cy)

  ctx.fillStyle = '#6b3f22'
  ctx.beginPath()
  ctx.ellipse(0, 40, 168, 56, 0, 0, Math.PI * 2)
  ctx.fill()

  const broth = ctx.createRadialGradient(0, 10, 20, 0, 20, 150)
  broth.addColorStop(0, '#fbbf24')
  broth.addColorStop(0.55, '#d97706')
  broth.addColorStop(1, '#92400e')
  ctx.fillStyle = broth
  ctx.beginPath()
  ctx.ellipse(0, 8, 150, 110, 0, 0, Math.PI * 2)
  ctx.fill()

  ctx.strokeStyle = '#f59e0b'
  ctx.lineWidth = 6
  ctx.beginPath()
  ctx.ellipse(0, 8, 150, 110, 0, 0, Math.PI * 2)
  ctx.stroke()

  ctx.restore()
}

function drawSlot(ctx: CanvasRenderingContext2D, runtime: LevelRuntime): void {
  const y = 600
  const cap = runtime.config.slotCapacity
  const cell = 44
  const totalW = cap * (cell + 6)
  const startX = (W - totalW) / 2

  ctx.fillStyle = 'rgba(0,0,0,0.45)'
  roundRect(ctx, startX - 10, y - 14, totalW + 20, cell + 28, 16)
  ctx.fill()

  ctx.fillStyle = '#fde68a'
  ctx.font = '12px sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText('餐盘', startX - 4, y - 20)

  for (let i = 0; i < cap; i++) {
    const x = startX + i * (cell + 6)
    ctx.fillStyle = 'rgba(255,255,255,0.08)'
    roundRect(ctx, x, y, cell, cell, 10)
    ctx.fill()
    ctx.strokeStyle = 'rgba(253,230,138,0.35)'
    ctx.stroke()

    const type = runtime.slot[i]
    if (!type) continue
    const def = ITEM_CATALOG[type]
    ctx.fillStyle = def.color
    roundRect(ctx, x + 3, y + 3, cell - 6, cell - 6, 8)
    ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 11px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(def.name, x + cell / 2, y + cell / 2)
  }
}

function drawHud(ctx: CanvasRenderingContext2D, runtime: LevelRuntime): void {
  ctx.fillStyle = '#fef3c7'
  ctx.font = 'bold 20px "Segoe UI", "PingFang SC", sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText(runtime.config.title, 18, 36)

  const left = runtime.items.filter((i) => !i.removed).length
  ctx.font = '13px sans-serif'
  ctx.fillStyle = '#fcd34d'
  ctx.fillText(`剩余 ${left} · 颠锅 ${runtime.shakesLeft}`, 18, 58)

  ctx.textAlign = 'right'
  ctx.fillStyle = 'rgba(254,243,199,0.85)'
  ctx.fillText(runtime.hintText, W - 18, 58)
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}

export function hitTest(
  runtime: LevelRuntime,
  lx: number,
  ly: number,
): string | null {
  const alive = runtime.items.filter((i) => !i.removed)
  // 高层优先
  alive.sort((a, b) => b.layer - a.layer || b.y - a.y)
  for (const item of alive) {
    if (
      lx >= item.x &&
      lx <= item.x + item.w - 6 &&
      ly >= item.y &&
      ly <= item.y + item.h - 6
    ) {
      return item.uid
    }
  }
  return null
}
