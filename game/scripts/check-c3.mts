import { createLevel, shakePot, tryPick } from '../src/game/engine.ts'
import { isItemClickable, SLOT_CAPACITY } from '../src/game/levelGen.ts'
import type { LevelConfig } from '../src/game/types.ts'

const config: LevelConfig = {
  id: 'c3',
  title: '',
  types: ['dingtalk', 'kpi', 'report', 'meeting', 'boss', 'coffee', 'takeout', 'slack'],
  countPerType: 3,
  layers: 3,
  coverTightness: 0.5,
  freeShakes: 2,
  slotCapacity: SLOT_CAPACITY,
}

function play(seed: number, mode: 'naive' | 'greedy') {
  let runtime = createLevel(config, seed)
  let steps = 0
  while (runtime.status === 'playing' && steps < 500) {
    steps++
    const clickable = runtime.items.filter((i) => isItemClickable(i, runtime.items))
    if (!clickable.length) {
      if (runtime.shakesLeft > 0) {
        runtime = shakePot(runtime, seed + steps).runtime
        continue
      }
      break
    }
    let target
    if (mode === 'greedy') {
      const counts = new Map<string, number>()
      for (const t of runtime.slot) counts.set(t, (counts.get(t) ?? 0) + 1)
      clickable.sort((a, b) => (counts.get(b.type) ?? 0) - (counts.get(a.type) ?? 0))
      target = clickable[0]!
    } else {
      target = clickable.find((i) => runtime.slot.includes(i.type)) ?? clickable[0]!
    }
    const typeCount = runtime.slot.filter((t) => t === target.type).length
    if (runtime.slot.length >= 6 && typeCount < 2 && runtime.shakesLeft > 0) {
      runtime = shakePot(runtime, seed + steps * 3).runtime
      continue
    }
    runtime = tryPick(runtime, target.uid).runtime
  }
  return runtime.status
}

const n = 100
let naive = 0
let greedy = 0
for (let i = 0; i < n; i++) {
  if (play(2000 + i * 13, 'naive') === 'won') naive += 1
  if (play(2000 + i * 13, 'greedy') === 'won') greedy += 1
}
console.log({ naive: naive / n, greedy: greedy / n })
