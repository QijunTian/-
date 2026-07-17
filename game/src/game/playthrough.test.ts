import { describe, expect, it } from 'vitest'
import { createLevel, tryPick } from './engine.ts'
import { isItemClickable, LEVEL_TUTORIAL } from './levelGen.ts'

/**
 * 真实推演：自动点所有当前可点物体，直到胜利或无解。
 * 教学关应在合理步数内可通关（种子固定）。
 */
describe('tutorial playthrough', () => {
  it('auto-plays tutorial seed to win', () => {
    let runtime = createLevel(LEVEL_TUTORIAL, 20260717)
    let guard = 0
    while (runtime.status === 'playing' && guard < 200) {
      guard += 1
      const clickable = runtime.items.filter((i) => isItemClickable(i, runtime.items))
      expect(clickable.length).toBeGreaterThan(0)
      // 优先点槽里已有类型，降低爆槽概率
      const prefer = clickable.find((i) => runtime.slot.includes(i.type)) ?? clickable[0]!
      const res = tryPick(runtime, prefer.uid)
      runtime = res.runtime
      if (res.event.type === 'blocked') {
        throw new Error('clickable item was blocked')
      }
    }
    expect(runtime.status).toBe('won')
  })
})
