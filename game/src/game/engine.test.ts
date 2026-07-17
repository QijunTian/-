import { describe, expect, it } from 'vitest'
import {
  addShakes,
  createLevel,
  remainingItems,
  reviveClearSlot,
  shakePot,
  tryPick,
} from './engine.ts'
import {
  generateBoard,
  isItemClickable,
  isItemCovered,
  LEVEL_CHALLENGE,
  LEVEL_TUTORIAL,
} from './levelGen.ts'

describe('level generation', () => {
  it('count per type divisible by 3 and totals match', () => {
    const board = generateBoard(LEVEL_TUTORIAL, 42)
    expect(board.length).toBe(LEVEL_TUTORIAL.types.length * LEVEL_TUTORIAL.countPerType)
    const counts = new Map<string, number>()
    for (const item of board) {
      counts.set(item.type, (counts.get(item.type) ?? 0) + 1)
    }
    for (const c of counts.values()) {
      expect(c % 3).toBe(0)
    }
  })

  it('challenge board has covered items under tight stacking', () => {
    const board = generateBoard(LEVEL_CHALLENGE, 7)
    const covered = board.filter((i) => isItemCovered(i, board))
    expect(covered.length).toBeGreaterThan(0)
  })
})

describe('pick / match / fail / win', () => {
  it('blocked when covered', () => {
    const runtime = createLevel(LEVEL_CHALLENGE, 99)
    const covered = runtime.items.find((i) => isItemCovered(i, runtime.items))
    expect(covered).toBeTruthy()
    const { event, runtime: next } = tryPick(runtime, covered!.uid)
    expect(event.type).toBe('blocked')
    expect(next.slot.length).toBe(0)
    expect(remainingItems(next).length).toBe(remainingItems(runtime).length)
  })

  it('three same types eliminate from slot', () => {
    const runtime = createLevel(LEVEL_TUTORIAL, 1)
    // 手工构造：只留场上三个同类型可点，并清空遮挡
    const type = runtime.config.types[0]!
    runtime.items = runtime.items.map((it, idx) => ({
      ...it,
      type,
      layer: 0,
      x: 40 + idx * 70,
      y: 200,
      removed: idx >= 3,
    }))
    // 确保前三个都不互相严重遮挡：拉开距离
    for (let i = 0; i < 3; i++) {
      runtime.items[i]!.x = 40 + i * 80
      runtime.items[i]!.y = 220
      runtime.items[i]!.layer = 0
      runtime.items[i]!.removed = false
    }
    for (let i = 3; i < runtime.items.length; i++) {
      runtime.items[i]!.removed = true
    }

    let state = runtime
    for (let i = 0; i < 3; i++) {
      const uid = state.items[i]!.uid
      expect(isItemClickable(state.items[i]!, state.items)).toBe(true)
      const res = tryPick(state, uid)
      state = res.runtime
    }
    expect(state.slot.length).toBe(0)
    expect(state.status).toBe('won')
  })

  it('slot full causes lose', () => {
    const runtime = createLevel(LEVEL_TUTORIAL, 2)
    runtime.items = runtime.items.map((it, idx) => ({
      ...it,
      removed: idx >= 7,
      layer: 0,
      x: 30 + (idx % 7) * 50,
      y: 210 + Math.floor(idx / 7) * 10,
      type: runtime.config.types[idx % runtime.config.types.length]!,
    }))
    // 强制槽位用不同种类填满且凑不出3个
    runtime.slot = ['dingtalk', 'kpi', 'coffee', 'slack', 'dingtalk', 'kpi', 'coffee']
    // 点一个不会成三消的
    const clickable = runtime.items.find((i) => isItemClickable(i, runtime.items) && i.type === 'slack')
    expect(clickable).toBeTruthy()
    // 先把 slot 设为 6 个，再点第 7 个同型不成三
    runtime.slot = ['dingtalk', 'kpi', 'coffee', 'slack', 'dingtalk', 'kpi']
    const target = runtime.items.find((i) => !i.removed && i.type === 'coffee' && isItemClickable(i, runtime.items))
    expect(target).toBeTruthy()
    const { runtime: next, event } = tryPick(runtime, target!.uid)
    expect(next.slot.length).toBe(7)
    expect(next.status).toBe('lost')
    expect(event.type).toBe('lost')
  })
})

describe('shake and revive', () => {
  it('shake consumes count and can reveal items', () => {
    const runtime = createLevel(LEVEL_CHALLENGE, 11)
    const before = runtime.shakesLeft
    const coveredBefore = runtime.items.filter((i) => isItemCovered(i, runtime.items)).length
    expect(coveredBefore).toBeGreaterThan(0)
    const { runtime: next, event } = shakePot(runtime, 12345)
    expect(next.shakesLeft).toBe(before - 1)
    expect(event.type).toBe('shaken')
  })

  it('addShakes increases count', () => {
    const runtime = createLevel(LEVEL_TUTORIAL, 3)
    const next = addShakes(runtime, 2)
    expect(next.shakesLeft).toBe(runtime.shakesLeft + 2)
  })

  it('revive clears slot only when lost', () => {
    const runtime = createLevel(LEVEL_TUTORIAL, 4)
    runtime.status = 'lost'
    runtime.slot = ['dingtalk', 'kpi', 'coffee']
    const { runtime: next, event } = reviveClearSlot(runtime)
    expect(event.type).toBe('revived')
    expect(next.status).toBe('playing')
    expect(next.slot).toEqual([])
  })
})
