import {
  CLEAR_LINES,
  FAIL_LINES,
  LEVEL_OVERTIME,
  LEVEL_SHIFT,
  STRESS_CATALOG,
  STRESS_ORDER,
  TOAST_THROW,
} from './catalog.ts'
import type { DeskItem, LevelSpec, Particle, SimState, StressId } from './types.ts'

export const W = 390
export const H = 720

/** 锅的捕获椭圆（画布坐标） */
export const POT = { cx: 195, cy: 520, rx: 118, ry: 72 }

let uidSeq = 1
function uid(prefix: string): string {
  uidSeq += 1
  return `${prefix}-${uidSeq}`
}

function pickLine(lines: string[], seed: number): string {
  return lines[Math.abs(seed) % lines.length]!
}

function randType(seed: number): StressId {
  return STRESS_ORDER[Math.abs(seed) % STRESS_ORDER.length]!
}

export function createSim(spec: LevelSpec, seed = Date.now()): SimState {
  uidSeq = seed % 1000
  const state: SimState = {
    spec,
    items: [],
    particles: [],
    spawnLeft: spec.totalStress,
    spawned: 0,
    cleared: 0,
    bursts: 0,
    potHeat: 0,
    status: 'playing',
    toast: '把压力甩进锅里炖掉',
    hint: '拖拽甩出 · 点锅加速炖化',
    elapsed: 0,
    spawnAcc: 0,
    dragUid: null,
    calm: 0,
    fullAcc: 0,
  }
  // 开局先来一点混乱，立刻有东西可甩
  for (let i = 0; i < Math.min(4, spec.deskCap); i++) {
    spawnOne(state, seed + i * 17)
  }
  return state
}

export function startShift(seed = Date.now()): SimState {
  return createSim(LEVEL_SHIFT, seed)
}

export function startOvertime(seed = Date.now()): SimState {
  return createSim(LEVEL_OVERTIME, seed)
}

function deskCount(state: SimState): number {
  return state.items.filter((i) => i.place === 'desk' || i.place === 'flying').length
}

function potCount(state: SimState): number {
  return state.items.filter((i) => i.place === 'pot').length
}

function spawnOne(state: SimState, seed: number): void {
  if (state.spawnLeft <= 0) return
  if (deskCount(state) >= state.spec.deskCap) return
  const type = randType(seed)
  const x = 60 + (Math.abs(seed * 13) % 270)
  const y = 120 + (Math.abs(seed * 7) % 220)
  state.items.push({
    uid: uid('s'),
    type,
    x,
    y,
    vx: 0,
    vy: 0,
    r: 28,
    place: 'desk',
    cook: 0,
    wobble: Math.abs(seed) % 100,
  })
  state.spawnLeft -= 1
  state.spawned += 1
}

export function hitItem(state: SimState, x: number, y: number): DeskItem | null {
  const candidates = state.items
    .filter((i) => i.place === 'desk')
    .sort((a, b) => b.wobble - a.wobble)
  for (const it of candidates) {
    const dx = x - it.x
    const dy = y - it.y
    if (dx * dx + dy * dy <= (it.r + 8) * (it.r + 8)) return it
  }
  return null
}

export function beginDrag(state: SimState, uid: string): SimState {
  return { ...state, dragUid: uid, toast: '甩出去——' }
}

export function moveDrag(state: SimState, x: number, y: number): SimState {
  if (!state.dragUid) return state
  const items = state.items.map((it) =>
    it.uid === state.dragUid ? { ...it, x, y, vx: 0, vy: 0 } : it,
  )
  return { ...state, items }
}

function inPot(x: number, y: number): boolean {
  const dx = (x - POT.cx) / POT.rx
  const dy = (y - POT.cy) / POT.ry
  return dx * dx + dy * dy <= 1
}

export function endDrag(
  state: SimState,
  x: number,
  y: number,
  vx: number,
  vy: number,
): { state: SimState; event: 'throw-in' | 'throw-miss' | 'noop' } {
  if (!state.dragUid) return { state, event: 'noop' }
  const id = state.dragUid
  const speed = Math.hypot(vx, vy)
  const target = state.items.find((it) => it.uid === id)
  if (!target) return { state: { ...state, dragUid: null }, event: 'noop' }

  const aimIn = inPot(x, y) || (speed > 0.35 && willCrossPot(x, y, vx, vy))
  let items: DeskItem[]
  let event: 'throw-in' | 'throw-miss'
  if (aimIn) {
    event = 'throw-in'
    items = state.items.map((it) =>
      it.uid !== id
        ? it
        : {
            ...it,
            x: POT.cx + (Math.random() - 0.5) * 50,
            y: POT.cy + (Math.random() - 0.5) * 28,
            vx: 0,
            vy: 0,
            place: 'pot' as const,
            cook: 0.05,
          },
    )
  } else {
    event = 'throw-miss'
    items = state.items.map((it) =>
      it.uid !== id
        ? it
        : {
            ...it,
            x,
            y,
            vx: vx * 180,
            vy: vy * 180,
            place: 'flying' as const,
          },
    )
  }

  let next: SimState = {
    ...state,
    items,
    dragUid: null,
    toast: event === 'throw-in' ? toastFor(items, id) : '没进锅，再甩一次',
  }
  if (event === 'throw-in') {
    next = spawnSplash(next, POT.cx, POT.cy - 10, '#fde68a')
    next.potHeat = Math.min(1, next.potHeat + 0.08)
    next.calm = Math.min(1, next.calm + 0.04)
  }
  return { state: next, event }
}

function toastFor(items: DeskItem[], id: string): string {
  const it = items.find((i) => i.uid === id)
  if (!it) return '进锅！'
  return TOAST_THROW[it.type]
}

/** 粗略预测短轨迹是否扫过锅 */
function willCrossPot(x: number, y: number, vx: number, vy: number): boolean {
  for (let t = 0; t < 8; t++) {
    const px = x + vx * 40 * t
    const py = y + vy * 40 * t
    if (inPot(px, py)) return true
  }
  return false
}

export function tapPot(state: SimState): SimState {
  if (state.status !== 'playing') return state
  const inPotItems = state.items.filter((i) => i.place === 'pot')
  if (!inPotItems.length) {
    return { ...state, toast: '先把压力甩进来', hint: '从桌面甩进锅里' }
  }
  const items = state.items.map((it) => {
    if (it.place !== 'pot') return it
    const tough = STRESS_CATALOG[it.type].toughness
    return { ...it, cook: Math.min(1, it.cook + 0.22 / tough) }
  })
  let next: SimState = {
    ...state,
    items,
    toast: '搅拌！开炖',
    potHeat: Math.min(1, state.potHeat + 0.1),
  }
  next = spawnSplash(next, POT.cx, POT.cy, '#fb923c')
  return tryBurst(next)
}

function spawnSplash(state: SimState, x: number, y: number, color: string): SimState {
  const particles = [...state.particles]
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI * 2 * i) / 10
    particles.push({
      x,
      y,
      vx: Math.cos(a) * (40 + Math.random() * 60),
      vy: Math.sin(a) * (30 + Math.random() * 50) - 30,
      life: 0.45 + Math.random() * 0.25,
      color,
      size: 3 + Math.random() * 4,
    })
  }
  return { ...state, particles }
}

function tryBurst(state: SimState): SimState {
  const potItems = state.items.filter((i) => i.place === 'pot')
  if (!potItems.length) return state
  const cookedN = potItems.filter((i) => i.cook >= 1).length
  const allCooked = cookedN === potItems.length
  const enough = cookedN >= state.spec.burstNeed
  if (!allCooked && !enough) return state

  const removeIds = new Set(potItems.map((i) => i.uid))
  const clearedNow = removeIds.size
  const items = state.items.filter((i) => !removeIds.has(i.uid))
  let next: SimState = {
    ...state,
    items,
    cleared: state.cleared + clearedNow,
    bursts: state.bursts + 1,
    potHeat: 0.15,
    calm: Math.min(1, state.calm + 0.18),
    toast: clearedNow >= 4 ? '大锅清蒸！桌面清爽' : '咕嘟——压力化了',
    hint: '继续甩，桌面会越来越干净',
  }
  next = spawnSplash(next, POT.cx, POT.cy - 20, '#86efac')
  next = spawnSplash(next, POT.cx, POT.cy, '#fde68a')
  return checkEnd(next)
}

function checkEnd(state: SimState): SimState {
  if (state.status !== 'playing') return state
  if (deskCount(state) >= state.spec.deskCap && state.spawnLeft > 0 && potCount(state) === 0) {
    // 桌面满且锅空太久会在 tick 里判负；此处仅通关判断
  }
  if (state.cleared >= state.spec.totalStress && deskCount(state) === 0 && potCount(state) === 0) {
    return {
      ...state,
      status: 'won',
      toast: pickLine(CLEAR_LINES, state.cleared + state.bursts),
      hint: '下班',
      calm: 1,
    }
  }
  // 已生成完毕且场上清空
  if (state.spawnLeft <= 0 && state.items.length === 0) {
    return {
      ...state,
      status: 'won',
      toast: pickLine(CLEAR_LINES, state.bursts),
      hint: '下班',
      calm: 1,
    }
  }
  return state
}

export function tick(state: SimState, dt: number): SimState {
  if (state.status !== 'playing') {
    return { ...state, particles: advanceParticles(state.particles, dt) }
  }

  let next: SimState = {
    ...state,
    elapsed: state.elapsed + dt,
    spawnAcc: state.spawnAcc + dt * 1000,
    particles: advanceParticles(state.particles, dt),
  }

  // 自动生成
  while (next.spawnAcc >= next.spec.spawnEveryMs && next.spawnLeft > 0) {
    next.spawnAcc -= next.spec.spawnEveryMs
    spawnOne(next, Math.floor(next.elapsed * 1000 + next.spawned * 99))
  }

  // 桌面顶满：先提示；持续过久且锅也空 → 柔和失败（不是折磨RNG）
  if (deskCount(next) >= next.spec.deskCap) {
    next.fullAcc += dt
    next.hint = '桌面满了！快甩进锅'
    if (next.fullAcc > 9 && potCount(next) === 0) {
      return {
        ...next,
        status: 'lost',
        toast: pickLine(FAIL_LINES, Math.floor(next.elapsed)),
        hint: '被淹没了',
      }
    }
  } else {
    next.fullAcc = 0
  }

  // 飞行与炖化
  const items = next.items.map((it) => stepItem(it, dt, next.dragUid))
  next = { ...next, items }

  // 锅内自动慢炖（解压：放下也会好）
  next = {
    ...next,
    items: next.items.map((it) => {
      if (it.place !== 'pot') return it
      const tough = STRESS_CATALOG[it.type].toughness
      return { ...it, cook: Math.min(1, it.cook + (dt * 0.35) / tough) }
    }),
  }

  next = tryBurst(next)

  // 飞行物进锅 / 落回桌面
  next = {
    ...next,
    items: next.items.map((it) => {
      if (it.place !== 'flying') return it
      if (inPot(it.x, it.y)) {
        return {
          ...it,
          place: 'pot' as const,
          x: POT.cx + (Math.random() - 0.5) * 40,
          y: POT.cy + (Math.random() - 0.5) * 24,
          vx: 0,
          vy: 0,
          cook: Math.max(it.cook, 0.05),
        }
      }
      if (Math.hypot(it.vx, it.vy) < 12) {
        return {
          ...it,
          place: 'desk' as const,
          vx: 0,
          vy: 0,
          x: clamp(it.x, 36, W - 36),
          y: clamp(it.y, 100, 420),
        }
      }
      return it
    }),
  }

  // 进锅补反馈
  const justIn = next.items.filter((i) => i.place === 'pot' && i.cook <= 0.06)
  if (justIn.length && Math.random() < 0.2) {
    next = spawnSplash(next, POT.cx, POT.cy, '#fde68a')
  }

  next.calm = Math.max(0, next.calm - dt * 0.01)
  return checkEnd(next)
}

function stepItem(it: DeskItem, dt: number, dragUid: string | null): DeskItem {
  if (it.uid === dragUid) return it
  if (it.place === 'flying') {
    let { x, y, vx, vy } = it
    vy += 420 * dt
    vx *= 1 - 1.8 * dt
    vy *= 1 - 0.6 * dt
    x += vx * dt
    y += vy * dt
    if (x < 24 || x > W - 24) vx *= -0.4
    if (y < 90) vy = Math.abs(vy) * 0.3
    if (y > 430 && !inPot(x, y)) {
      y = 430
      vy *= -0.25
      vx *= 0.6
    }
    return { ...it, x, y, vx, vy, wobble: it.wobble + dt * 8 }
  }
  if (it.place === 'desk') {
    return {
      ...it,
      y: it.y + Math.sin(it.wobble) * 0.05,
      wobble: it.wobble + dt * 3,
    }
  }
  // pot: 轻微晃
  return {
    ...it,
    x: it.x + Math.sin(it.wobble * 2) * 0.15,
    wobble: it.wobble + dt * 5,
  }
}

function advanceParticles(particles: Particle[], dt: number): Particle[] {
  return particles
    .map((p) => ({
      ...p,
      x: p.x + p.vx * dt,
      y: p.y + p.vy * dt,
      vy: p.vy + 80 * dt,
      life: p.life - dt,
    }))
    .filter((p) => p.life > 0)
}

function clamp(v: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, v))
}

export function progressOf(state: SimState): number {
  return Math.min(1, state.cleared / Math.max(1, state.spec.totalStress))
}

export function watchAdClearDesk(state: SimState): SimState {
  // 广告续命：清掉2个桌面压力（直接进锅半熟）
  let moved = 0
  const items = state.items.map((it) => {
    if (it.place !== 'desk' || moved >= 2) return it
    moved += 1
    return {
      ...it,
      place: 'pot' as const,
      x: POT.cx + (Math.random() - 0.5) * 40,
      y: POT.cy,
      cook: 0.6,
      vx: 0,
      vy: 0,
    }
  })
  return {
    ...state,
    items,
    status: 'playing',
    toast: '广告续命：两份压力下锅了',
    hint: '点锅加速炖化',
    calm: Math.min(1, state.calm + 0.1),
    fullAcc: 0,
  }
}
