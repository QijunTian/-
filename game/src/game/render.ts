import { STRESS_CATALOG } from './catalog.ts'
import { H, POT, W, progressOf } from './sim.ts'
import type { SimState } from './types.ts'

export function logicalSize(): { w: number; h: number } {
  return { w: W, h: H }
}

export function drawSim(ctx: CanvasRenderingContext2D, state: SimState): void {
  ctx.clearRect(0, 0, W, H)

  // 桌面氛围：越干净越亮
  const calm = state.calm
  const g = ctx.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, lerpColor('#2a1810', '#1f2937', calm))
  g.addColorStop(0.55, lerpColor('#4a2818', '#334155', calm))
  g.addColorStop(1, '#120c08')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)

  // 桌面区域
  ctx.fillStyle = `rgba(251, 191, 36, ${0.05 + calm * 0.08})`
  roundRect(ctx, 24, 96, W - 48, 300, 22)
  ctx.fill()
  ctx.strokeStyle = `rgba(253, 230, 138, ${0.2 + calm * 0.35})`
  ctx.lineWidth = 2
  roundRect(ctx, 24, 96, W - 48, 300, 22)
  ctx.stroke()

  if (calm > 0.55) {
    ctx.fillStyle = `rgba(167, 243, 208, ${calm - 0.45})`
    ctx.font = '12px "PingFang SC", sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('桌面正在变干净…', W / 2, 120)
  }

  drawPot(ctx, state)

  // 物品：桌面/飞行在上，锅内略小
  const ordered = [...state.items].sort((a, b) => {
    const za = a.place === 'pot' ? 0 : a.place === 'desk' ? 1 : 2
    const zb = b.place === 'pot' ? 0 : b.place === 'desk' ? 1 : 2
    return za - zb
  })
  for (const it of ordered) {
    const def = STRESS_CATALOG[it.type]
    const scale = it.place === 'pot' ? 0.72 * (1 - it.cook * 0.55) : 1
    const alpha = it.place === 'pot' ? 0.55 + (1 - it.cook) * 0.45 : 1
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.translate(it.x, it.y)
    ctx.scale(scale, scale)
    ctx.fillStyle = 'rgba(0,0,0,0.25)'
    circle(ctx, 3, 4, it.r)
    ctx.fill()
    ctx.fillStyle = def.color
    circle(ctx, 0, 0, it.r)
    ctx.fill()
    ctx.strokeStyle = it.place === 'pot' ? '#fde68a' : '#fff7ed'
    ctx.lineWidth = 2
    circle(ctx, 0, 0, it.r)
    ctx.stroke()
    ctx.font = '18px "Segoe UI Emoji", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#fff'
    ctx.fillText(def.emoji, 0, -6)
    ctx.font = 'bold 11px "PingFang SC", sans-serif'
    ctx.fillText(def.name, 0, 12)
    if (it.place === 'pot') {
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(0, 0, it.r + 4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * it.cook)
      ctx.stroke()
    }
    ctx.restore()
  }

  for (const p of state.particles) {
    ctx.globalAlpha = Math.max(0, p.life * 2)
    ctx.fillStyle = p.color
    circle(ctx, p.x, p.y, p.size)
    ctx.fill()
  }
  ctx.globalAlpha = 1

  drawHud(ctx, state)
}

function drawPot(ctx: CanvasRenderingContext2D, state: SimState): void {
  const { cx, cy, rx, ry } = POT
  ctx.fillStyle = '#5b3418'
  ctx.beginPath()
  ctx.ellipse(cx, cy + 34, rx + 16, 34, 0, 0, Math.PI * 2)
  ctx.fill()

  const heat = state.potHeat
  const broth = ctx.createRadialGradient(cx, cy, 10, cx, cy, rx)
  broth.addColorStop(0, heat > 0.5 ? '#fda4af' : '#fbbf24')
  broth.addColorStop(0.6, heat > 0.5 ? '#f97316' : '#d97706')
  broth.addColorStop(1, '#7c2d12')
  ctx.fillStyle = broth
  ctx.beginPath()
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#fcd34d'
  ctx.lineWidth = 5
  ctx.stroke()

  ctx.fillStyle = 'rgba(255,247,237,0.85)'
  ctx.font = 'bold 13px "PingFang SC", sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('摸鱼锅 · 点我加速炖', cx, cy + ry + 22)
}

function drawHud(ctx: CanvasRenderingContext2D, state: SimState): void {
  ctx.fillStyle = '#fff7ed'
  ctx.font = 'bold 18px "PingFang SC", sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText(state.spec.title, 16, 32)

  const p = progressOf(state)
  ctx.fillStyle = 'rgba(255,255,255,0.12)'
  roundRect(ctx, 16, 44, 200, 10, 6)
  ctx.fill()
  ctx.fillStyle = '#86efac'
  roundRect(ctx, 16, 44, Math.max(4, 200 * p), 10, 6)
  ctx.fill()
  ctx.fillStyle = '#bbf7d0'
  ctx.font = '11px sans-serif'
  ctx.fillText(`下班进度 ${Math.floor(p * 100)}%`, 224, 53)

  ctx.textAlign = 'right'
  ctx.fillStyle = '#fde68a'
  ctx.font = '12px "PingFang SC", sans-serif'
  ctx.fillText(state.hint, W - 16, 32)

  if (state.toast) {
    ctx.textAlign = 'center'
    ctx.fillStyle = 'rgba(0,0,0,0.5)'
    roundRect(ctx, 50, 64, W - 100, 28, 10)
    ctx.fill()
    ctx.fillStyle = '#fef3c7'
    ctx.font = '13px "PingFang SC", sans-serif'
    ctx.fillText(state.toast, W / 2, 80)
  }
}

function circle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
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

function lerpColor(a: string, b: string, t: number): string {
  const pa = hex(a)
  const pb = hex(b)
  const r = Math.round(pa[0] + (pb[0] - pa[0]) * t)
  const g = Math.round(pa[1] + (pb[1] - pa[1]) * t)
  const bl = Math.round(pa[2] + (pb[2] - pa[2]) * t)
  return `rgb(${r},${g},${bl})`
}

function hex(c: string): [number, number, number] {
  const n = c.replace('#', '')
  return [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16)]
}
