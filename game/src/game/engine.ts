import { pickFailLine, pickWinLine } from './copy.ts'
import {
  generateBoard,
  isItemClickable,
  LEVEL_CHALLENGE,
  LEVEL_TUTORIAL,
  mulberry32,
} from './levelGen.ts'
import type { BoardItem, ItemTypeId, LevelConfig, LevelRuntime } from './types.ts'

export type EngineEvent =
  | { type: 'picked'; itemType: ItemTypeId }
  | { type: 'blocked' }
  | { type: 'matched'; itemType: ItemTypeId }
  | { type: 'shaken'; revealed: number }
  | { type: 'won'; line: string }
  | { type: 'lost'; line: string }
  | { type: 'revived' }
  | { type: 'noop'; reason: string }

function cloneItems(items: BoardItem[]): BoardItem[] {
  return items.map((it) => ({ ...it }))
}

export function createLevel(config: LevelConfig, seed: number, failCount = 0): LevelRuntime {
  let shakes = config.freeShakes
  // 连败安抚：不改规则，只多给颠锅（第2次起+1，第4次起再+1）
  if (failCount >= 2) shakes += 1
  if (failCount >= 4) shakes += 1

  return {
    config,
    items: generateBoard(config, seed),
    slot: [],
    shakesLeft: shakes,
    failCount,
    status: 'playing',
    hintText: config.id === 'tutorial' ? '点三个相同的放进餐盘即可消除' : '差一口也别停',
  }
}

export function remainingItems(runtime: LevelRuntime): BoardItem[] {
  return runtime.items.filter((i) => !i.removed)
}

function eliminateTriples(slot: ItemTypeId[]): { slot: ItemTypeId[]; matched: ItemTypeId | null } {
  const counts = new Map<ItemTypeId, number>()
  for (const t of slot) counts.set(t, (counts.get(t) ?? 0) + 1)

  let matched: ItemTypeId | null = null
  for (const [type, count] of counts) {
    if (count >= 3) {
      matched = type
      break
    }
  }
  if (!matched) return { slot, matched: null }

  let removeLeft = 3
  const next: ItemTypeId[] = []
  for (const t of slot) {
    if (t === matched && removeLeft > 0) {
      removeLeft -= 1
      continue
    }
    next.push(t)
  }
  // 可能一次凑出多组，递归清
  const again = eliminateTriples(next)
  return { slot: again.slot, matched: matched }
}

export function tryPick(runtime: LevelRuntime, uid: string): { runtime: LevelRuntime; event: EngineEvent } {
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

  const items = cloneItems(runtime.items)
  const target = items.find((i) => i.uid === uid)!
  target.removed = true

  let slot = [...runtime.slot, target.type]
  const elim = eliminateTriples(slot)
  slot = elim.slot

  let status: LevelRuntime['status'] = 'playing'
  let event: EngineEvent = elim.matched
    ? { type: 'matched', itemType: elim.matched }
    : { type: 'picked', itemType: target.type }

  const left = items.filter((i) => !i.removed)
  if (left.length === 0 && slot.length === 0) {
    status = 'won'
    event = { type: 'won', line: pickWinLine(Date.now()) }
  } else if (slot.length >= runtime.config.slotCapacity) {
    // 槽满后再检查是否刚消完仍满
    status = 'lost'
    event = { type: 'lost', line: pickFailLine(Date.now()) }
  }

  return {
    runtime: {
      ...runtime,
      items,
      slot,
      status,
      hintText:
        status === 'playing'
          ? runtime.hintText
          : status === 'won'
            ? '通关'
            : '爆锅了',
    },
    event,
  }
}

/**
 * 颠锅：对仍在场上的物体施加位置扰动，并把若干被压物体抬到顶层。
 * 返回实际新变为可点的数量，供验收。
 */
export function shakePot(runtime: LevelRuntime, seed = Date.now()): { runtime: LevelRuntime; event: EngineEvent } {
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
    // 避免颠出锅外太远
    it.x = Math.min(300, Math.max(40, it.x))
    it.y = Math.min(430, Math.max(120, it.y))
  }

  // 优先抬起被压物体；至少尝试露出 4 个新目标
  const covered = alive.filter((i) => !isItemClickable(i, items))
  const liftCount = Math.min(4, covered.length)
  // 打乱后按顺序抬，减少重复抽中同一块
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
      hintText: revealed > 0 ? `颠出了 ${revealed} 个新目标` : '锅晃了，再找找',
    },
    event: { type: 'shaken', revealed },
  }
}

export function addShakes(runtime: LevelRuntime, n: number): LevelRuntime {
  return { ...runtime, shakesLeft: runtime.shakesLeft + n }
}

/** 复活：清空餐盘，状态回到 playing */
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
