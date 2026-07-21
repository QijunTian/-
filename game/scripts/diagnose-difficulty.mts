/**
 * 难度诊断：多种子、两种策略，统计通关率/步数/颠锅使用。
 * 纯引擎推演，不依赖浏览器。
 */
import {
  createLevel,
  shakePot,
  tryPick,
} from '../src/game/engine.ts'
import {
  isItemClickable,
  LEVEL_CHALLENGE,
  LEVEL_TUTORIAL,
} from '../src/game/levelGen.ts'
import type { LevelConfig, LevelRuntime } from '../src/game/types.ts'

type Strategy = 'prefer-slot' | 'greedy-match'

function pickTarget(runtime: LevelRuntime, strategy: Strategy) {
  const clickable = runtime.items.filter((i) => isItemClickable(i, runtime.items))
  if (!clickable.length) return null

  if (strategy === 'prefer-slot') {
    const inSlot = clickable.find((i) => runtime.slot.includes(i.type))
    if (inSlot) return inSlot
    return clickable[0]!
  }

  // greedy: 优先点能让槽内某类型接近 3 的
  const counts = new Map<string, number>()
  for (const t of runtime.slot) counts.set(t, (counts.get(t) ?? 0) + 1)
  clickable.sort((a, b) => {
    const ca = counts.get(a.type) ?? 0
    const cb = counts.get(b.type) ?? 0
    return cb - ca
  })
  return clickable[0]!
}

function playOnce(config: LevelConfig, seed: number, strategy: Strategy) {
  let runtime = createLevel(config, seed)
  let steps = 0
  let shakes = 0
  while (runtime.status === 'playing' && steps < 400) {
    steps += 1
    const target = pickTarget(runtime, strategy)
    if (!target) {
      if (runtime.shakesLeft > 0) {
        const r = shakePot(runtime, seed + steps)
        runtime = r.runtime
        shakes += 1
        continue
      }
      break
    }
    // 槽快满且点这个不会立刻成三 → 尝试颠锅换局面
    const typeCount = runtime.slot.filter((t) => t === target.type).length
    if (
      runtime.slot.length >= runtime.config.slotCapacity - 1 &&
      typeCount < 2 &&
      runtime.shakesLeft > 0
    ) {
      const r = shakePot(runtime, seed + steps * 3)
      runtime = r.runtime
      shakes += 1
      continue
    }
    const res = tryPick(runtime, target.uid)
    runtime = res.runtime
  }
  return {
    status: runtime.status,
    steps,
    shakes,
    leftover: runtime.items.filter((i) => !i.removed).length,
    slot: runtime.slot.length,
  }
}

function batch(config: LevelConfig, label: string, n = 40) {
  const strategies: Strategy[] = ['prefer-slot', 'greedy-match']
  for (const strategy of strategies) {
    let wins = 0
    let loses = 0
    let stuck = 0
    let stepSum = 0
    for (let i = 0; i < n; i++) {
      const r = playOnce(config, 1000 + i * 17, strategy)
      if (r.status === 'won') wins += 1
      else if (r.status === 'lost') loses += 1
      else stuck += 1
      stepSum += r.steps
    }
    console.log(
      JSON.stringify({
        label,
        strategy,
        n,
        winRate: +(wins / n).toFixed(3),
        loseRate: +(loses / n).toFixed(3),
        stuckRate: +(stuck / n).toFixed(3),
        avgSteps: +(stepSum / n).toFixed(1),
      }),
    )
  }
}

batch(LEVEL_TUTORIAL, 'tutorial')
batch(LEVEL_CHALLENGE, 'challenge')
