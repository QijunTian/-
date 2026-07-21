import { ITEM_CATALOG } from './items.ts'
import { isItemClickable } from './levelGen.ts'
import type { LevelRuntime } from './types.ts'

const W = 390
const H = 720
export const CONTROLS_RESERVE = 108

export function logicalSize(): { w: number; h: number } {
  return { w: W, h: H }
}

export function drawFrame(
  ctx: CanvasRenderingContext2D,
  runtime: LevelRuntime,
  blockedFlashUid: string | null,
  shakePulse: number,
  matchPulse = 0,
): void {
  ctx.clearRect(0, 0, W, H)

  const heatT = runtime.heat / 5
  const g = ctx.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, '#1a120b')
  g.addColorStop(0.45, heatT > 0.6 ? '#5a1e12' : '#3b2416')
  g.addColorStop(1, '#120c08')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)

  ctx.globalAlpha = 0.12 + heatT * 0.12
  ctx.fillStyle = heatT > 0.6 ? '#fb7185' : '#fde68a'
  for (let i = 0; i < 14; i++) {
    const x = 40 + ((i * 67) % 310)
    const y = 70 + ((i * 41) % 110) + Math.sin(shakePulse + i + heatT * 3) * 5
    ctx.beginPath()
    ctx.arc(x, y, 8 + (i % 3) * 3, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1

  drawPot(ctx, shakePulse, heatT)

  const alive = runtime.items.filter((i) => !i.removed)
  alive.sort((a, b) => a.layer - b.layer || a.y - b.y)

  for (const item of alive) {
    const clickable = isItemClickable(item, runtime.items)
    const def = ITEM_CATALOG[item.type]
    const flash = blockedFlashUid === item.uid
    const ox = Math.sin(shakePulse * 8 + item.layer) * (shakePulse > 0 ? 3 : 0)
    const oy = Math.cos(shakePulse * 7 + item.layer) * (shakePulse > 0 ? 2 : 0)
    const jx = flash ? Math.sin(Date.now() / 30) * 3 : 0

    ctx.save()
    ctx.translate(item.x + ox + jx, item.y + oy)

    ctx.fillStyle = 'rgba(0,0,0,0.28)'
    roundRect(ctx, 6, 8, item.w - 4, item.h - 4, 14)
    ctx.fill()

    ctx.fillStyle = def.color
    roundRect(ctx, 0, 0, item.w - 6, item.h - 6, 14)
    ctx.fill()

    if (clickable) {
      ctx.shadowColor = 'rgba(251, 191, 36, 0.85)'
      ctx.shadowBlur = 12
      ctx.strokeStyle = flash ? '#fff' : '#fbbf24'
      ctx.lineWidth = flash ? 4 : 3
      roundRect(ctx, 0, 0, item.w - 6, item.h - 6, 14)
      ctx.stroke()
      ctx.shadowBlur = 0
    } else {
      ctx.fillStyle = 'rgba(0,0,0,0.5)'
      roundRect(ctx, 0, 0, item.w - 6, item.h - 6, 14)
      ctx.fill()
      ctx.strokeStyle = 'rgba(255,255,255,0.12)'
      ctx.lineWidth = 1
      roundRect(ctx, 0, 0, item.w - 6, item.h - 6, 14)
      ctx.stroke()
    }

    ctx.fillStyle = clickable ? '#fff' : 'rgba(255,255,255,0.55)'
    ctx.font = '20px "Segoe UI Emoji", "Apple Color Emoji", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(def.emoji, (item.w - 6) / 2, (item.h - 6) / 2 - 10)
    ctx.font = 'bold 13px "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif'
    ctx.fillText(def.name, (item.w - 6) / 2, (item.h - 6) / 2 + 12)

    ctx.restore()
  }

  drawSlot(ctx, runtime)
  drawHud(ctx, runtime)

  if (runtime.toast) {
    ctx.save()
    ctx.globalAlpha = 0.95
    ctx.fillStyle = 'rgba(0,0,0,0.55)'
    roundRect(ctx, 48, 88, W - 96, 36, 12)
    ctx.fill()
    ctx.fillStyle = '#fde68a'
    ctx.font = '13px "PingFang SC", "Microsoft YaHei", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(runtime.toast, W / 2, 106)
    ctx.restore()
  }

  if (matchPulse > 0) {
    ctx.save()
    ctx.globalAlpha = Math.min(1, matchPulse)
    ctx.fillStyle = runtime.combo >= 2 ? '#fde047' : '#bbf7d0'
    ctx.font = 'bold 30px "Segoe UI", "PingFang SC", sans-serif'
    ctx.textAlign = 'center'
    const label = runtime.combo >= 2 ? `连消 x${runtime.combo}！` : '消除！'
    ctx.fillText(label, W / 2, 168)
    ctx.restore()
  }
}

function drawPot(ctx: CanvasRenderingContext2D, shakePulse: number, heatT: number): void {
  const cx = 195 + Math.sin(shakePulse * 10) * shakePulse * 4
  const cy = 278
  ctx.save()
  ctx.translate(cx, cy)

  ctx.fillStyle = '#6b3f22'
  ctx.beginPath()
  ctx.ellipse(0, 36, 158, 50, 0, 0, Math.PI * 2)
  ctx.fill()

  const broth = ctx.createRadialGradient(0, 10, 20, 0, 20, 140)
  broth.addColorStop(0, heatT > 0.7 ? '#fb7185' : '#fbbf24')
  broth.addColorStop(0.55, heatT > 0.7 ? '#e11d48' : '#d97706')
  broth.addColorStop(1, '#92400e')
  ctx.fillStyle = broth
  ctx.beginPath()
  ctx.ellipse(0, 8, 140, 100, 0, 0, Math.PI * 2)
  ctx.fill()

  ctx.strokeStyle = heatT > 0.7 ? '#fda4af' : '#f59e0b'
  ctx.lineWidth = 6
  ctx.beginPath()
  ctx.ellipse(0, 8, 140, 100, 0, 0, Math.PI * 2)
  ctx.stroke()

  ctx.restore()
}

function drawSlot(ctx: CanvasRenderingContext2D, runtime: LevelRuntime): void {
  const y = 512
  const cap = runtime.config.slotCapacity
  const cell = 44
  const totalW = cap * (cell + 6)
  const startX = (W - totalW) / 2
  const danger = runtime.slot.length >= cap - 2

  ctx.fillStyle = danger ? 'rgba(127, 29, 29, 0.55)' : 'rgba(0,0,0,0.45)'
  roundRect(ctx, startX - 10, y - 14, totalW + 20, cell + 28, 16)
  ctx.fill()

  ctx.fillStyle = danger ? '#fecaca' : '#fde68a'
  ctx.font = '12px sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText(danger ? '餐盘告急' : '餐盘', startX - 4, y - 20)

  for (let i = 0; i < cap; i++) {
    const x = startX + i * (cell + 6)
    ctx.fillStyle = 'rgba(255,255,255,0.08)'
    roundRect(ctx, x, y, cell, cell, 10)
    ctx.fill()
    ctx.strokeStyle = danger ? 'rgba(252,165,165,0.5)' : 'rgba(253,230,138,0.35)'
    ctx.stroke()

    const type = runtime.slot[i]
    if (!type) continue
    const def = ITEM_CATALOG[type]
    ctx.fillStyle = def.color
    roundRect(ctx, x + 3, y + 3, cell - 6, cell - 6, 8)
    ctx.fill()
    ctx.font = '14px "Segoe UI Emoji", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(def.emoji, x + cell / 2, y + cell / 2 - 6)
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 9px sans-serif'
    ctx.fillText(def.name, x + cell / 2, y + cell / 2 + 10)
  }
}

function drawHud(ctx: CanvasRenderingContext2D, runtime: LevelRuntime): void {
  ctx.fillStyle = '#fef3c7'
  ctx.font = 'bold 20px "Segoe UI", "PingFang SC", sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText(runtime.config.title, 18, 32)

  const left = runtime.items.filter((i) => !i.removed).length
  const clickable = runtime.items.filter((i) => isItemClickable(i, runtime.items)).length
  ctx.font = '12px sans-serif'
  ctx.fillStyle = '#fcd34d'
  ctx.fillText(`剩余 ${left} · 可点 ${clickable} · 颠锅 ${runtime.shakesLeft}`, 18, 52)

  // 热度条
  ctx.fillStyle = 'rgba(255,255,255,0.12)'
  roundRect(ctx, 18, 62, 140, 10, 6)
  ctx.fill()
  const heatW = (140 * runtime.heat) / 5
  ctx.fillStyle = runtime.heat >= 4 ? '#fb7185' : '#f59e0b'
  roundRect(ctx, 18, 62, Math.max(4, heatW), 10, 6)
  ctx.fill()
  ctx.fillStyle = '#fecaca'
  ctx.font = '11px sans-serif'
  ctx.fillText(`热度 ${runtime.heat}/5`, 164, 71)

  ctx.textAlign = 'right'
  ctx.fillStyle = 'rgba(254,243,199,0.9)'
  const hint =
    runtime.hintText.length > 14 ? `${runtime.hintText.slice(0, 13)}…` : runtime.hintText
  ctx.fillText(hint, W - 18, 52)
  if (runtime.combo >= 2) {
    ctx.fillStyle = '#fde047'
    ctx.font = 'bold 13px sans-serif'
    ctx.fillText(`COMBO x${runtime.combo}`, W - 18, 72)
  }
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

export function hitTest(runtime: LevelRuntime, lx: number, ly: number): string | null {
  if (ly > H - CONTROLS_RESERVE + 20) return null
  const alive = runtime.items.filter((i) => !i.removed)
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
