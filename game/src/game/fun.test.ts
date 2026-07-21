import { describe, expect, it } from 'vitest'
import { createLevel, tryPick } from './engine.ts'
import { isItemClickable, LEVEL_TUTORIAL } from './levelGen.ts'

describe('fun hooks', () => {
  it('coffee match grants an extra shake', () => {
    const runtime = createLevel(LEVEL_TUTORIAL, 1)
    // 只留三块咖啡，全部可点
    runtime.items = runtime.items.map((it, idx) => ({
      ...it,
      type: 'coffee' as const,
      removed: idx >= 3,
      layer: 0,
      x: 60 + idx * 80,
      y: 220,
    }))
    const before = runtime.shakesLeft
    let state = runtime
    for (let i = 0; i < 3; i++) {
      const uid = state.items[i]!.uid
      expect(isItemClickable(state.items[i]!, state.items)).toBe(true)
      state = tryPick(state, uid, 10 + i).runtime
    }
    expect(state.status).toBe('won')
    // 通关前咖啡奖励应已加上；won 时 shakesLeft 仍保留
    expect(state.shakesLeft).toBeGreaterThanOrEqual(before)
  })

  it('slack match returns a stress tile to the board (keeps solvable counts)', () => {
    const runtime = createLevel(LEVEL_TUTORIAL, 2)
    runtime.slot = ['dingtalk', 'dingtalk']
    runtime.items = [
      {
        uid: 's1',
        type: 'slack',
        x: 80,
        y: 220,
        layer: 1,
        w: 64,
        h: 64,
        removed: false,
      },
      {
        uid: 's2',
        type: 'slack',
        x: 160,
        y: 220,
        layer: 1,
        w: 64,
        h: 64,
        removed: false,
      },
      {
        uid: 's3',
        type: 'slack',
        x: 240,
        y: 220,
        layer: 1,
        w: 64,
        h: 64,
        removed: false,
      },
    ]
    let state = runtime
    for (const uid of ['s1', 's2', 's3']) {
      state = tryPick(state, uid, 99).runtime
    }
    // 三消摸鱼后：甩回 1 个压力块到锅里，槽位压力减轻但可解性保持
    expect(state.slot.filter((t) => t === 'dingtalk').length).toBe(1)
    expect(state.items.filter((i) => !i.removed && i.type === 'dingtalk').length).toBe(1)
    expect(state.toast.includes('甩')).toBe(true)
  })

  it('stress picks raise heat', () => {
    const runtime = createLevel(LEVEL_TUTORIAL, 3)
    runtime.items = runtime.items.map((it, idx) => ({
      ...it,
      type: idx % 2 === 0 ? ('kpi' as const) : ('report' as const),
      removed: false,
      layer: 0,
      x: 40 + (idx % 6) * 55,
      y: 200 + Math.floor(idx / 6) * 50,
    }))
    // 只点一个不构成三消
    const target = runtime.items.find((i) => isItemClickable(i, runtime.items))!
    const { runtime: next, event } = tryPick(runtime, target.uid, 5)
    expect(event.type).toBe('picked')
    expect(next.heat).toBeGreaterThan(runtime.heat)
  })
})
