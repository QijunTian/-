import { describe, expect, it } from 'vitest'
import { createLevel, shakePot, tryPick } from './engine.ts'
import { isItemClickable, LEVEL_CHALLENGE, LEVEL_TUTORIAL } from './levelGen.ts'

function greedyPlay(seed: number, config = LEVEL_CHALLENGE) {
  let runtime = createLevel(config, seed)
  let steps = 0
  while (runtime.status === 'playing' && steps < 500) {
    steps += 1
    const clickable = runtime.items.filter((i) => isItemClickable(i, runtime.items))
    if (!clickable.length) {
      if (runtime.shakesLeft > 0) {
        runtime = shakePot(runtime, seed + steps).runtime
        continue
      }
      break
    }
    const counts = new Map<string, number>()
    for (const t of runtime.slot) counts.set(t, (counts.get(t) ?? 0) + 1)
    clickable.sort((a, b) => (counts.get(b.type) ?? 0) - (counts.get(a.type) ?? 0))
    const target = clickable[0]!
    const typeCount = runtime.slot.filter((t) => t === target.type).length
    if (runtime.slot.length >= 6 && typeCount < 2 && runtime.shakesLeft > 0) {
      runtime = shakePot(runtime, seed + steps * 3).runtime
      continue
    }
    runtime = tryPick(runtime, target.uid).runtime
  }
  return runtime.status
}

describe('difficulty balance', () => {
  it('tutorial stays mostly clearable', () => {
    let wins = 0
    const n = 30
    for (let i = 0; i < n; i++) {
      if (greedyPlay(5000 + i * 9, LEVEL_TUTORIAL) === 'won') wins += 1
    }
    expect(wins / n).toBeGreaterThan(0.8)
  })

  it('challenge is hard but not zero-win', () => {
    let wins = 0
    const n = 60
    for (let i = 0; i < n; i++) {
      if (greedyPlay(6000 + i * 13, LEVEL_CHALLENGE) === 'won') wins += 1
    }
    const rate = wins / n
    expect(rate).toBeGreaterThan(0.05)
    expect(rate).toBeLessThan(0.55)
  })
})

describe('fail softener', () => {
  it('gives extra shakes after repeated fails', () => {
    const base = createLevel(LEVEL_CHALLENGE, 1, 0)
    const soft = createLevel(LEVEL_CHALLENGE, 1, 2)
    expect(soft.shakesLeft).toBeGreaterThan(base.shakesLeft)
  })
})
