import { createLevel, shakePot, tryPick } from '../src/game/engine.ts'
import { generateBoard, isItemClickable, SLOT_CAPACITY } from '../src/game/levelGen.ts'
import type { LevelConfig, LevelRuntime } from '../src/game/types.ts'

function pick(runtime: LevelRuntime) {
  const clickable = runtime.items.filter((i) => isItemClickable(i, runtime.items))
  if (!clickable.length) return null
  const counts = new Map<string, number>()
  for (const t of runtime.slot) counts.set(t, (counts.get(t) ?? 0) + 1)
  clickable.sort((a, b) => (counts.get(b.type) ?? 0) - (counts.get(a.type) ?? 0))
  return clickable[0]!
}

function play(config: LevelConfig, seed: number) {
  let runtime = createLevel(config, seed)
  let steps = 0
  while (runtime.status === 'playing' && steps < 500) {
    steps++
    const target = pick(runtime)
    if (!target) {
      if (runtime.shakesLeft > 0) {
        runtime = shakePot(runtime, seed + steps).runtime
        continue
      }
      break
    }
    const typeCount = runtime.slot.filter((t) => t === target.type).length
    if (
      runtime.slot.length >= config.slotCapacity - 1 &&
      typeCount < 2 &&
      runtime.shakesLeft > 0
    ) {
      runtime = shakePot(runtime, seed + steps * 3).runtime
      continue
    }
    runtime = tryPick(runtime, target.uid).runtime
  }
  return runtime.status
}

const candidates: LevelConfig[] = [
  {
    id: 'c1',
    title: '',
    types: ['dingtalk', 'kpi', 'report', 'meeting', 'boss', 'coffee'],
    countPerType: 3,
    layers: 3,
    coverTightness: 0.45,
    freeShakes: 2,
    slotCapacity: SLOT_CAPACITY,
  },
  {
    id: 'c2',
    title: '',
    types: ['dingtalk', 'kpi', 'report', 'meeting', 'boss', 'coffee', 'takeout'],
    countPerType: 3,
    layers: 3,
    coverTightness: 0.5,
    freeShakes: 2,
    slotCapacity: SLOT_CAPACITY,
  },
  {
    id: 'c3',
    title: '',
    types: ['dingtalk', 'kpi', 'report', 'meeting', 'boss', 'coffee', 'takeout', 'slack'],
    countPerType: 3,
    layers: 3,
    coverTightness: 0.5,
    freeShakes: 2,
    slotCapacity: SLOT_CAPACITY,
  },
  {
    id: 'c4',
    title: '',
    types: ['dingtalk', 'kpi', 'report', 'meeting', 'boss', 'coffee'],
    countPerType: 6,
    layers: 3,
    coverTightness: 0.4,
    freeShakes: 3,
    slotCapacity: SLOT_CAPACITY,
  },
  {
    id: 'c5',
    title: '',
    types: ['dingtalk', 'kpi', 'report', 'meeting', 'coffee', 'slack'],
    countPerType: 3,
    layers: 2,
    coverTightness: 0.35,
    freeShakes: 2,
    slotCapacity: SLOT_CAPACITY,
  },
  {
    id: 'c6',
    title: '',
    types: ['dingtalk', 'kpi', 'report', 'meeting', 'boss', 'coffee', 'takeout'],
    countPerType: 3,
    layers: 3,
    coverTightness: 0.55,
    freeShakes: 1,
    slotCapacity: SLOT_CAPACITY,
  },
  {
    id: 'c7',
    title: '',
    types: ['dingtalk', 'kpi', 'report', 'meeting', 'boss', 'coffee'],
    countPerType: 3,
    layers: 3,
    coverTightness: 0.58,
    freeShakes: 2,
    slotCapacity: SLOT_CAPACITY,
  },
  {
    id: 'c8',
    title: '',
    types: ['dingtalk', 'kpi', 'report', 'meeting', 'coffee', 'slack', 'takeout'],
    countPerType: 3,
    layers: 3,
    coverTightness: 0.48,
    freeShakes: 2,
    slotCapacity: SLOT_CAPACITY,
  },
]

for (const config of candidates) {
  let wins = 0
  const n = 50
  for (let i = 0; i < n; i++) {
    if (play(config, 2000 + i * 13) === 'won') wins += 1
  }
  let clickableSum = 0
  for (let i = 0; i < 10; i++) {
    const b = generateBoard(config, 3000 + i)
    clickableSum += b.filter((x) => isItemClickable(x, b)).length / b.length
  }
  console.log(
    JSON.stringify({
      id: config.id,
      types: config.types.length,
      countPerType: config.countPerType,
      layers: config.layers,
      cover: config.coverTightness,
      shakes: config.freeShakes,
      total: config.types.length * config.countPerType,
      winRate: +(wins / n).toFixed(3),
      startClickableRatio: +(clickableSum / 10).toFixed(3),
    }),
  )
}
