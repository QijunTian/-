import {
  CLEAR_LINES,
  FAIL_LINES,
  LEVEL_OVERTIME,
  LEVEL_SHIFT,
  STRESS_CATALOG,
  TOAST_THROW,
  WAVE_HINT,
  WAVE_POOL,
} from './catalog.ts'
import type { DeskItem, LevelSpec, Particle, SimState, StressId, Wave } from './types.ts'

export const W = 390
export const H = 720
export const POT = { cx: 195, cy: 520, rx: 118, ry: 72 }

let uidSeq = 1
function uid(prefix: string): string {
  uidSeq += 1
  return `${prefix}-${uidSeq}`
}

function pickLine(lines: string[], seed: number): string {
  return lines[Math.abs(seed) % lines.length]!
}

export function waveOf(cleared: number, total: number): Wave {
  const p = cleared / Math.max(1, total)
  if (p < 0.34) return 1
  if (p < 0.67) return 2
  return 3
}

/** 收官缩容：看起来快下班了，锅突然变小 */
export function effectivePotCap(state: SimState): number {
  const p = state.cleared / Math.max(1, state.spec.totalStress)
  if (p >= 0.75) return Math.max(2, state.spec.potCap - 1)
  return state.spec.potCap
}

/** 乱炖夹生：锅里≥3且没有任何一对同类 */
export function isClaggy(state: SimState): boolean {
  const pot = state.items.filter((i) => i.place === 'pot')
  if (pot.length < 3) return false
  const counts = new Map<StressId, number>()
  for (const p of pot) counts.set(p.type, (counts.get(p.type) ?? 0) + 1)
  for (const n of counts.values()) {
    if (n >= 2) return false
  }
  return true
}

function spawnInterval(state: SimState): number {
  const base = state.spec.spawnEveryMs
  if (state.wave === 1) return base
  if (state.wave === 2) return base * 0.78
  return base * 0.58
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
    toast: '把压力甩进锅 · 同类更好炖',
    hint: WAVE_HINT[1],
    elapsed: 0,
    spawnAcc: 0,
    dragUid: null,
    calm: 0,
    fullAcc: 0,
    wave: 1,
    sameTypeStreak: 0,
    claggy: false,
  }
  for (let i = 0; i < Math.min(3, spec.deskCap); i++) {
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

function pickType(state: SimState, seed: number): StressId {
  const pool = WAVE_POOL[state.wave]
  return pool[Math.abs(seed) % pool.length]!
}

function spawnOne(state: SimState, seed: number): void {
  if (state.spawnLeft <= 0) return
  if (deskCount(state) >= state.spec.deskCap) return

  const type = pickType(state, seed)
  const isBoss = state.wave === 3 && (state.spawned + 1) % 5 === 0
  const withShell = !isBoss && state.wave >= 2 && Math.abs(seed) % 3 === 0
  const roam = state.wave >= 2 && (isBoss || Math.abs(seed) % 2 === 0)
  // 诱饵：中后期偶尔出现，看起来最好甩
  const bait = !isBoss && state.wave >= 2 && Math.abs(seed) % 7 === 0

  const x = 55 + (Math.abs(seed * 13) % 280)
  const y = 130 + (Math.abs(seed * 7) % 200)
  state.items.push({
    uid: uid('s'),
    type: isBoss ? 'boss' : type,
    x,
    y,
    vx: roam ? (Math.abs(seed) % 2 === 0 ? 28 : -28) : 0,
    vy: roam ? 16 : 0,
    r: isBoss ? 34 : bait ? 30 : 28,
    place: 'desk',
    cook: 0,
    wobble: Math.abs(seed) % 100,
    shell: withShell || isBoss ? 1 : 0,
    roam,
    boss: isBoss,
    bait,
  })
  state.spawnLeft -= 1
  state.spawned += 1
}

export function hitItem(state: SimState, x: number, y: number): DeskItem | null {
  const candidates = state.items
    .filter((i) => i.place === 'desk')
    .sort((a, b) => b.r - a.r)
  for (const it of candidates) {
    const dx = x - it.x
    const dy = y - it.y
    if (dx * dx + dy * dy <= (it.r + 10) * (it.r + 10)) return it
  }
  return null
}

export function beginDrag(state: SimState, id: string): SimState {
  const it = state.items.find((i) => i.uid === id)
  if (!it) return state
  let toast = '甩出去——'
  if (it.bait) toast = '金色摸鱼？看起来很好甩…'
  else if (it.shell > 0) toast = '先甩裂外壳！'
  return { ...state, dragUid: id, toast }
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

function willCrossPot(x: number, y: number, vx: number, vy: number): boolean {
  for (let t = 0; t < 8; t++) {
    if (inPot(x + vx * 40 * t, y + vy * 40 * t)) return true
  }
  return false
}

function toastFor(type: StressId): string {
  return TOAST_THROW[type]
}

function sameTypeBonus(state: SimState): number {
  const pot = state.items.filter((i) => i.place === 'pot')
  if (pot.length < 2) return 1
  const counts = new Map<StressId, number>()
  for (const p of pot) counts.set(p.type, (counts.get(p.type) ?? 0) + 1)
  let best = 1
  for (const n of counts.values()) {
    if (n >= 3) best = Math.max(best, 2.1)
    else if (n >= 2) best = Math.max(best, 1.55)
  }
  return best
}

export function endDrag(
  state: SimState,
  x: number,
  y: number,
  vx: number,
  vy: number,
): { state: SimState; event: 'throw-in' | 'throw-miss' | 'crack' | 'pot-full' | 'noop' } {
  if (!state.dragUid) return { state, event: 'noop' }
  const id = state.dragUid
  const target = state.items.find((it) => it.uid === id)
  if (!target) return { state: { ...state, dragUid: null }, event: 'noop' }

  const speed = Math.hypot(vx, vy)
  const aimIn = inPot(x, y) || (speed > 0.35 && willCrossPot(x, y, vx, vy))

  // 带壳：第一次命中锅只裂壳，不进锅
  if (aimIn && target.shell > 0) {
    const items = state.items.map((it) =>
      it.uid !== id
        ? it
        : {
            ...it,
            shell: 0,
            x: clamp(x, 40, W - 40),
            y: clamp(y, 110, 400),
            place: 'desk' as const,
            vx: 0,
            vy: 0,
            roam: false,
          },
    )
    return {
      state: {
        ...state,
        items,
        dragUid: null,
        toast: target.boss ? '老板外壳裂了！再甩一次' : '壳裂了，再甩进锅',
        hint: '破壳后再甩',
      },
      event: 'crack',
    }
  }

  if (aimIn && potCount(state) >= effectivePotCap(state)) {
    const items = state.items.map((it) =>
      it.uid !== id
        ? it
        : {
            ...it,
            x: clamp(x, 40, W - 40),
            y: clamp(y, 110, 400),
            place: 'desk' as const,
            vx: (Math.random() - 0.5) * 40,
            vy: -20,
          },
    )
    const cap = effectivePotCap(state)
    return {
      state: {
        ...state,
        items,
        dragUid: null,
        toast: `锅满了（${cap}）！半熟也占位`,
        hint: '先炖熟再爆发，别乱塞',
      },
      event: 'pot-full',
    }
  }

  if (aimIn) {
    const wasBait = target.bait
    const items = state.items.map((it) =>
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
            roam: false,
            bait: false,
          },
    )
    let next: SimState = {
      ...state,
      items,
      dragUid: null,
      toast: toastFor(target.type),
      potHeat: Math.min(1, state.potHeat + 0.08),
      calm: Math.min(1, state.calm + 0.03),
    }
    next = spawnSplash(next, POT.cx, POT.cy - 10, '#fde68a')

    // 诱饵套路：爽一下，桌面立刻多两份
    if (wasBait) {
      spawnOne(next, Date.now() + 1)
      spawnOne(next, Date.now() + 2)
      next.toast = '摸鱼成功？加班两份已送达'
      next.hint = '诱饵会引来更多压力'
      next.calm = Math.max(0, next.calm - 0.08)
    }

    next.claggy = isClaggy(next)
    const bonus = sameTypeBonus(next)
    if (!wasBait && bonus > 1.5) {
      next.toast = bonus > 2 ? '三连同类！大火收汁' : '同类下锅，炖得更快'
      next.sameTypeStreak += 1
    } else if (!wasBait) {
      next.sameTypeStreak = 0
      if (next.claggy) {
        next.toast = '乱炖夹生了…看起来在开，其实不动'
        next.hint = '弄一对同类才能救锅'
      }
    }
    return { state: next, event: 'throw-in' }
  }

  const items = state.items.map((it) =>
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
  return {
    state: { ...state, items, dragUid: null, toast: '没进锅，再甩一次' },
    event: 'throw-miss',
  }
}

export function tapPot(state: SimState): SimState {
  if (state.status !== 'playing') return state
  const inPotItems = state.items.filter((i) => i.place === 'pot')
  if (!inPotItems.length) {
    return { ...state, toast: '先把压力甩进来', hint: '桌面拖到锅里' }
  }
  const bonus = sameTypeBonus(state)
  const claggy = isClaggy(state)
  const rate = (0.2 * bonus * (claggy ? 0.35 : 1))
  const items = state.items.map((it) => {
    if (it.place !== 'pot') return it
    const tough = STRESS_CATALOG[it.type].toughness * (it.boss ? 1.25 : 1)
    return { ...it, cook: Math.min(1, it.cook + rate / tough) }
  })
  let next: SimState = {
    ...state,
    items,
    claggy,
    toast: claggy ? '夹生糊锅，越搅越心慌' : bonus > 1.5 ? '同类爆炒！' : '搅拌！开炖',
    potHeat: Math.min(1, state.potHeat + 0.12),
    hint: claggy ? '弄一对同类破局' : state.hint,
  }
  next = spawnSplash(next, POT.cx, POT.cy, claggy ? '#a8a29e' : '#fb923c')
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
      life: 0.4 + Math.random() * 0.25,
      color,
      size: 3 + Math.random() * 4,
    })
  }
  return { ...state, particles }
}

function tryBurst(state: SimState): SimState {
  const potItems = state.items.filter((i) => i.place === 'pot')
  if (!potItems.length) return state
  const cooked = potItems.filter((i) => i.cook >= 1)
  const raw = potItems.filter((i) => i.cook < 1)
  const allCooked = cooked.length === potItems.length
  const enough = cooked.length >= state.spec.burstNeed
  if (!allCooked && !enough) return state

  // 残锅：只清熟的；半熟继续占坑
  const removeIds = new Set(cooked.map((i) => i.uid))
  if (raw.length === 0) {
    for (const p of potItems) removeIds.add(p.uid)
  }

  const clearedNow = removeIds.size
  const items = state.items.filter((i) => !removeIds.has(i.uid))
  const oldWave = state.wave
  let next: SimState = {
    ...state,
    items,
    cleared: state.cleared + clearedNow,
    bursts: state.bursts + 1,
    potHeat: 0.12,
    calm: Math.min(1, state.calm + (raw.length ? 0.08 : 0.16)),
    sameTypeStreak: 0,
  }
  next.claggy = isClaggy(next)
  next.wave = waveOf(next.cleared, next.spec.totalStress)

  if (raw.length > 0) {
    next.toast = `爆了一半…还有${raw.length}个半熟赖着`
    next.hint = '半熟占锅，这就是差一点'
  } else if (next.wave !== oldWave) {
    next.toast = `进入第${next.wave}波：${WAVE_HINT[next.wave]}`
    next.hint = WAVE_HINT[next.wave]
  } else {
    next.toast = clearedNow >= 4 ? '大锅清蒸！桌面清爽' : '咕嘟——压力化了'
    next.hint = `锅 ${potCount(next)}/${effectivePotCap(next)} · ${WAVE_HINT[next.wave]}`
  }
  if (effectivePotCap(next) < next.spec.potCap) {
    next.hint = `收官锅变小了（${effectivePotCap(next)}格）· 半熟更致命`
  }

  next = spawnSplash(next, POT.cx, POT.cy - 20, '#86efac')
  next = spawnSplash(next, POT.cx, POT.cy, '#fde68a')
  return checkEnd(next)
}

function checkEnd(state: SimState): SimState {
  if (state.status !== 'playing') return state
  if (state.spawnLeft <= 0 && state.items.length === 0) {
    return {
      ...state,
      status: 'won',
      toast: pickLine(CLEAR_LINES, state.bursts),
      hint: '下班',
      calm: 1,
    }
  }
  if (state.cleared >= state.spec.totalStress && deskCount(state) === 0 && potCount(state) === 0) {
    return {
      ...state,
      status: 'won',
      toast: pickLine(CLEAR_LINES, state.cleared),
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
    wave: waveOf(state.cleared, state.spec.totalStress),
  }
  if (next.wave !== state.wave) {
    next.hint = WAVE_HINT[next.wave]
    next.toast = `第${next.wave}波来了`
  }

  const interval = spawnInterval(next)
  while (next.spawnAcc >= interval && next.spawnLeft > 0) {
    next.spawnAcc -= interval
    spawnOne(next, Math.floor(next.elapsed * 1000 + next.spawned * 99))
  }

  if (deskCount(next) >= next.spec.deskCap) {
    next.fullAcc += dt
    next.hint = next.wave >= 2 ? '桌面满了！破壳→甩锅→点炖' : '桌面满了！快甩进锅'
    if (next.fullAcc > 8 && potCount(next) === 0) {
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

  if (potCount(next) >= effectivePotCap(next)) {
    const uncooked = next.items.filter((i) => i.place === 'pot' && i.cook < 1).length
    if (uncooked >= effectivePotCap(next)) {
      next.hint = '半熟占满了，差一点翻车'
    }
  }

  const bonus = sameTypeBonus(next)
  const claggy = isClaggy(next)
  next = {
    ...next,
    claggy,
    items: next.items.map((it) => {
      if (it.place !== 'pot') return stepWorld(it, dt, next.dragUid)
      const tough = STRESS_CATALOG[it.type].toughness * (it.boss ? 1.3 : 1)
      const rate = 0.28 * bonus * (claggy ? 0.35 : 1)
      return {
        ...it,
        cook: Math.min(1, it.cook + (dt * rate) / tough),
        wobble: it.wobble + dt * 5,
        x: it.x + Math.sin(it.wobble * 2) * 0.12,
      }
    }),
  }

  next = tryBurst(next)

  next = {
    ...next,
    items: next.items.map((it) => {
      if (it.place !== 'flying') return it
      if (inPot(it.x, it.y)) {
        if (potCount(next) >= effectivePotCap(next)) {
          return {
            ...it,
            place: 'desk' as const,
            x: clamp(it.x, 40, W - 40),
            y: 380,
            vx: 0,
            vy: 0,
          }
        }
        if (it.shell > 0) {
          return {
            ...it,
            shell: 0,
            place: 'desk' as const,
            x: clamp(it.x, 40, W - 40),
            y: clamp(it.y, 120, 400),
            vx: 0,
            vy: 0,
            roam: false,
          }
        }
        return {
          ...it,
          place: 'pot' as const,
          x: POT.cx + (Math.random() - 0.5) * 40,
          y: POT.cy + (Math.random() - 0.5) * 24,
          vx: 0,
          vy: 0,
          cook: Math.max(it.cook, 0.05),
          roam: false,
        }
      }
      if (Math.hypot(it.vx, it.vy) < 12) {
        return {
          ...it,
          place: 'desk' as const,
          vx: it.roam ? 24 : 0,
          vy: it.roam ? 12 : 0,
          x: clamp(it.x, 36, W - 36),
          y: clamp(it.y, 100, 420),
        }
      }
      return it
    }),
  }

  next.calm = Math.max(0, next.calm - dt * 0.01)
  return checkEnd(next)
}

function stepWorld(it: DeskItem, dt: number, dragUid: string | null): DeskItem {
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
    let { x, y, vx, vy } = it
    if (it.roam) {
      x += vx * dt
      y += vy * dt
      if (x < 45 || x > W - 45) vx *= -1
      if (y < 120 || y > 400) vy *= -1
    } else {
      y += Math.sin(it.wobble) * 0.04
    }
    return { ...it, x, y, vx, vy, wobble: it.wobble + dt * 3 }
  }
  return it
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
  let moved = 0
  let potN = state.items.filter((i) => i.place === 'pot').length
  const items = state.items.map((it) => {
    if (it.place !== 'desk' || moved >= 2) return it
    if (potN >= effectivePotCap(state)) return it
    moved += 1
    potN += 1
    return {
      ...it,
      place: 'pot' as const,
      shell: 0,
      x: POT.cx + (Math.random() - 0.5) * 40,
      y: POT.cy,
      cook: 0.55,
      vx: 0,
      vy: 0,
      roam: false,
    }
  })
  return {
    ...state,
    items,
    status: 'playing',
    toast: '广告续命：两份下锅了',
    hint: '点锅加速炖化',
    calm: Math.min(1, state.calm + 0.1),
    fullAcc: 0,
  }
}
