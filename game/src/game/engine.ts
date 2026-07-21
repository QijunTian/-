import { pickFailLine, pickToast, pickWinLine } from './copy.ts'
import { ITEM_CATALOG, STRESS_TYPES } from './items.ts'
import {
  generateBoard,
  isItemClickable,
  LEVEL_CHALLENGE,
  LEVEL_TUTORIAL,
  mulberry32,
} from './levelGen.ts'
import type { BoardItem, ItemTypeId, LevelConfig, LevelRuntime } from './types.ts'

export type EngineEvent =
  | { type: 'picked'; itemType: ItemTypeId; heat: number }
  | { type: 'blocked' }
  | {
      type: 'matched'
      itemType: ItemTypeId
      combo: number
      bonus?: 'slack-clear' | 'coffee-shake' | 'boil'
      bonusDetail?: string
    }
  | { type: 'shaken'; revealed: number }
  | { type: 'boiled'; revealed: number }
  | { type: 'won'; line: string }
  | { type: 'lost'; line: string }
  | { type: 'revived' }
  | { type: 'noop'; reason: string }

function cloneItems(items: BoardItem[]): BoardItem[] {
  return items.map((it) => ({ ...it }))
}

export function createLevel(config: LevelConfig, seed: number, failCount = 0): LevelRuntime {
  let shakes = config.freeShakes
  if (failCount >= 2) shakes += 1
  if (failCount >= 4) shakes += 1

  return {
    config,
    items: generateBoard(config, seed),
    slot: [],
    shakesLeft: shakes,
    failCount,
    status: 'playing',
    hintText:
      config.id === 'tutorial'
        ? '点金色边框；摸鱼能甩锅，咖啡能续命'
        : '别让热度烧满——连消才是王道',
    combo: 0,
    heat: 0,
    toast: '',
  }
}

export function remainingItems(runtime: LevelRuntime): BoardItem[] {
  return runtime.items.filter((i) => !i.removed)
}

function eliminateTriples(slot: ItemTypeId[]): {
  slot: ItemTypeId[]
  matched: ItemTypeId | null
  matchCount: number
} {
  const counts = new Map<ItemTypeId, number>()
  for (const t of slot) counts.set(t, (counts.get(t) ?? 0) + 1)

  let matched: ItemTypeId | null = null
  for (const [type, count] of counts) {
    if (count >= 3) {
      matched = type
      break
    }
  }
  if (!matched) return { slot, matched: null, matchCount: 0 }

  let removeLeft = 3
  const next: ItemTypeId[] = []
  for (const t of slot) {
    if (t === matched && removeLeft > 0) {
      removeLeft -= 1
      continue
    }
    next.push(t)
  }
  const again = eliminateTriples(next)
  return {
    slot: again.slot,
    matched,
    matchCount: 1 + again.matchCount,
  }
}

function applySlackBonus(
  slot: ItemTypeId[],
  items: BoardItem[],
  seed: number,
): { slot: ItemTypeId[]; items: BoardItem[]; returned: ItemTypeId | null } {
  const idx = slot.findIndex((t) => STRESS_TYPES.includes(t))
  if (idx < 0) return { slot, items, returned: null }
  const returned = slot[idx]!
  const nextSlot = [...slot.slice(0, idx), ...slot.slice(idx + 1)]
  const nextItems = cloneItems(items)
  const alive = nextItems.filter((i) => !i.removed)
  const maxLayer = alive.reduce((m, i) => Math.max(m, i.layer), 0)
  const rand = mulberry32(seed)
  nextItems.push({
    uid: `back-${seed}-${returned}`,
    type: returned,
    x: 150 + rand() * 80,
    y: 220 + rand() * 60,
    layer: maxLayer + 3,
    w: 64,
    h: 64,
    removed: false,
  })
  return { slot: nextSlot, items: nextItems, returned }
}

/** 热锅爆发：抬起被压块，同时把一块可点的压回去 */
function boilBoard(
  items: BoardItem[],
  seed: number,
): { items: BoardItem[]; revealed: number } {
  const rand = mulberry32(seed)
  const next = cloneItems(items)
  const alive = next.filter((i) => !i.removed)
  const maxLayer = alive.reduce((m, i) => Math.max(m, i.layer), 0)
  const covered = alive.filter((i) => !isItemClickable(i, next))
  const clickable = alive.filter((i) => isItemClickable(i, next))

  let revealed = 0
  if (covered.length) {
    const lift = covered[Math.floor(rand() * covered.length)]!
    lift.layer = maxLayer + 2
    lift.x += (rand() - 0.5) * 24
    lift.y += (rand() - 0.5) * 24
    revealed = 1
  }
  if (clickable.length > 1) {
    const bury = clickable[Math.floor(rand() * clickable.length)]!
    bury.layer = Math.max(0, bury.layer - 1)
  }
  return { items: next, revealed }
}

export function tryPick(
  runtime: LevelRuntime,
  uid: string,
  seed = Date.now(),
): { runtime: LevelRuntime; event: EngineEvent } {
  if (runtime.status !== 'playing') {
    return { runtime, event: { type: 'noop', reason: 'not-playing' } }
  }

  const item = runtime.items.find((i) => i.uid === uid)
  if (!item || item.removed) {
    return { runtime, event: { type: 'noop', reason: 'missing' } }
  }

  if (!isItemClickable(item, runtime.items)) {
    return { runtime, event: { type: 'blocked' } }
  }

  let items = cloneItems(runtime.items)
  const target = items.find((i) => i.uid === uid)!
  target.removed = true

  let slot = [...runtime.slot, target.type]
  const elim = eliminateTriples(slot)
  slot = elim.slot

  let combo = runtime.combo
  let heat = runtime.heat
  let shakesLeft = runtime.shakesLeft
  let toast = pickToast(target.type, seed)
  let hintText = runtime.hintText
  let bonus: 'slack-clear' | 'coffee-shake' | 'boil' | undefined
  let bonusDetail: string | undefined
  let event: EngineEvent

  if (elim.matched) {
    combo += elim.matchCount
    heat = Math.max(0, heat - 2)
    if (elim.matched === 'slack') {
      const bonusRes = applySlackBonus(slot, items, seed + 7)
      slot = bonusRes.slot
      items = bonusRes.items
      if (bonusRes.returned) {
        bonus = 'slack-clear'
        bonusDetail = `摸鱼甩锅：${ITEM_CATALOG[bonusRes.returned].name}被甩回锅里`
        toast = bonusDetail
      } else {
        toast = '摸鱼成功，餐盘里暂无压力可甩'
      }
    }
    if (elim.matched === 'coffee') {
      shakesLeft += 1
      bonus = 'coffee-shake'
      bonusDetail = '咖啡续命：颠锅 +1'
      toast = bonusDetail
    }
    hintText = combo >= 2 ? `连消 x${combo}！` : `消掉了 ${ITEM_CATALOG[elim.matched].name}`
    event = {
      type: 'matched',
      itemType: elim.matched,
      combo,
      bonus,
      bonusDetail,
    }
  } else {
    combo = 0
    heat = Math.min(5, heat + (ITEM_CATALOG[target.type].vibe === 'stress' ? 2 : 1))
    hintText =
      heat >= 4 ? '锅要糊了！快连消降温' : `餐盘 ${slot.length}/${runtime.config.slotCapacity}`
    event = { type: 'picked', itemType: target.type, heat }
  }

  // 热度烧满：强制洗牌一波（不耗颠锅）
  if (heat >= 5 && runtime.status === 'playing') {
    const boiled = boilBoard(items, seed + 99)
    items = boiled.items
    heat = 2
    bonus = 'boil'
    bonusDetail = '热锅爆发：局势被掀翻了'
    toast = bonusDetail!
    hintText = bonusDetail!
    if (event.type === 'picked') {
      event = { type: 'boiled', revealed: boiled.revealed }
    }
  }

  let status: LevelRuntime['status'] = 'playing'
  const left = items.filter((i) => !i.removed)
  if (left.length === 0 && slot.length === 0) {
    status = 'won'
    event = { type: 'won', line: pickWinLine(seed) }
    hintText = '通关'
  } else if (slot.length >= runtime.config.slotCapacity) {
    status = 'lost'
    event = { type: 'lost', line: pickFailLine(seed) }
    hintText = '爆锅了'
  }

  return {
    runtime: {
      ...runtime,
      items,
      slot,
      shakesLeft,
      status,
      hintText,
      combo,
      heat,
      toast,
    },
    event,
  }
}

export function shakePot(
  runtime: LevelRuntime,
  seed = Date.now(),
): { runtime: LevelRuntime; event: EngineEvent } {
  if (runtime.status !== 'playing') {
    return { runtime, event: { type: 'noop', reason: 'not-playing' } }
  }
  if (runtime.shakesLeft <= 0) {
    return { runtime, event: { type: 'noop', reason: 'no-shake' } }
  }

  const rand = mulberry32(seed)
  const before = new Set(
    runtime.items.filter((i) => isItemClickable(i, runtime.items)).map((i) => i.uid),
  )

  const items = cloneItems(runtime.items)
  const alive = items.filter((i) => !i.removed)
  const maxLayer = alive.reduce((m, i) => Math.max(m, i.layer), 0)

  for (const it of alive) {
    it.x += (rand() - 0.5) * 42
    it.y += (rand() - 0.5) * 42
    it.x = Math.min(300, Math.max(40, it.x))
    it.y = Math.min(430, Math.max(120, it.y))
  }

  const covered = alive.filter((i) => !isItemClickable(i, items))
  const liftCount = Math.min(4, covered.length)
  for (let i = covered.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    const tmp = covered[i]!
    covered[i] = covered[j]!
    covered[j] = tmp
  }
  for (let i = 0; i < liftCount; i++) {
    const pick = covered[i]!
    pick.layer = maxLayer + 1 + i
    pick.x += (rand() - 0.5) * 28
    pick.y += (rand() - 0.5) * 28
    pick.x = Math.min(300, Math.max(40, pick.x))
    pick.y = Math.min(430, Math.max(120, pick.y))
  }

  const afterClickable = items.filter((i) => isItemClickable(i, items))
  let revealed = 0
  for (const it of afterClickable) {
    if (!before.has(it.uid)) revealed += 1
  }

  return {
    runtime: {
      ...runtime,
      items,
      shakesLeft: runtime.shakesLeft - 1,
      heat: Math.max(0, runtime.heat - 1),
      hintText: revealed > 0 ? `颠出了 ${revealed} 个新目标` : '锅晃了，再找找',
      toast: '颠锅！重新洗牌',
    },
    event: { type: 'shaken', revealed },
  }
}

export function addShakes(runtime: LevelRuntime, n: number): LevelRuntime {
  return { ...runtime, shakesLeft: runtime.shakesLeft + n }
}

export function reviveClearSlot(runtime: LevelRuntime): { runtime: LevelRuntime; event: EngineEvent } {
  if (runtime.status !== 'lost') {
    return { runtime, event: { type: 'noop', reason: 'not-lost' } }
  }
  return {
    runtime: {
      ...runtime,
      slot: [],
      status: 'playing',
      hintText: '续命成功，稳住别浪',
      failCount: runtime.failCount,
      heat: Math.max(0, runtime.heat - 2),
      combo: 0,
      toast: '广告续命，热度下降',
    },
    event: { type: 'revived' },
  }
}

export function startTutorial(seed = Date.now(), failCount = 0): LevelRuntime {
  return createLevel(LEVEL_TUTORIAL, seed, failCount)
}

export function startChallenge(seed = Date.now(), failCount = 0): LevelRuntime {
  return createLevel(LEVEL_CHALLENGE, seed, failCount)
}

export function countByType(items: BoardItem[]): Map<ItemTypeId, number> {
  const m = new Map<ItemTypeId, number>()
  for (const it of items) {
    if (it.removed) continue
    m.set(it.type, (m.get(it.type) ?? 0) + 1)
  }
  return m
}
