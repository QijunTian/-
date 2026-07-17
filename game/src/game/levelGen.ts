import type { BoardItem, ItemTypeId, LevelConfig } from './types.ts'

export const SLOT_CAPACITY = 7

export const LEVEL_TUTORIAL: LevelConfig = {
  id: 'tutorial',
  title: '试锅·摸鱼局',
  types: ['dingtalk', 'kpi', 'coffee', 'slack'],
  countPerType: 3,
  layers: 2,
  coverTightness: 0.25,
  freeShakes: 3,
  slotCapacity: SLOT_CAPACITY,
}

export const LEVEL_CHALLENGE: LevelConfig = {
  id: 'challenge',
  title: '今日挑战',
  types: ['dingtalk', 'kpi', 'report', 'meeting', 'boss', 'coffee', 'takeout', 'slack'],
  countPerType: 6,
  layers: 4,
  coverTightness: 0.62,
  freeShakes: 1,
  slotCapacity: SLOT_CAPACITY,
}

/** 可复现的简易 PRNG */
export function mulberry32(seed: number): () => number {
  let t = seed >>> 0
  return () => {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

function assertDivisibleByThree(config: LevelConfig): void {
  if (config.countPerType % 3 !== 0) {
    throw new Error(`countPerType must be divisible by 3, got ${config.countPerType}`)
  }
}

/**
 * 生成可解偏好的堆叠布局：
 * - 每种数量被 3 整除
 * - 按层放置，高层与低层有重叠制造遮挡
 */
export function generateBoard(config: LevelConfig, seed = 1): BoardItem[] {
  assertDivisibleByThree(config)
  const rand = mulberry32(seed)
  const itemSize = 64
  const potCx = 195
  const potCy = 310
  const potR = 150

  const bag: ItemTypeId[] = []
  for (const type of config.types) {
    for (let i = 0; i < config.countPerType; i++) bag.push(type)
  }
  // Fisher–Yates
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    const tmp = bag[i]!
    bag[i] = bag[j]!
    bag[j] = tmp
  }

  const perLayer = Math.ceil(bag.length / config.layers)
  const items: BoardItem[] = []
  let idx = 0

  for (let layer = 0; layer < config.layers; layer++) {
    const count = Math.min(perLayer, bag.length - idx)
    const cols = Math.ceil(Math.sqrt(count))
    const rows = Math.ceil(count / cols)
    const gap = itemSize * (0.72 - config.coverTightness * 0.25)

    for (let n = 0; n < count; n++) {
      const type = bag[idx++]!
      const col = n % cols
      const row = Math.floor(n / cols)
      const jitterX = (rand() - 0.5) * itemSize * config.coverTightness
      const jitterY = (rand() - 0.5) * itemSize * config.coverTightness
      const baseX = potCx - ((cols - 1) * gap) / 2 + col * gap + jitterX
      const baseY = potCy - ((rows - 1) * gap) / 2 + row * gap + jitterY - layer * 8

      // 夹进锅的大致范围
      const dx = baseX - potCx
      const dy = baseY - potCy
      const dist = Math.hypot(dx, dy)
      const maxDist = potR - itemSize * 0.35
      let x = baseX
      let y = baseY
      if (dist > maxDist && dist > 0) {
        const s = maxDist / dist
        x = potCx + dx * s
        y = potCy + dy * s
      }

      items.push({
        uid: `i-${layer}-${n}-${type}`,
        type,
        x,
        y,
        layer,
        w: itemSize,
        h: itemSize,
        removed: false,
      })
    }
  }

  return items
}

export function rectsOverlap(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
  pad = 8,
): boolean {
  return !(
    a.x + a.w - pad <= b.x + pad ||
    b.x + b.w - pad <= a.x + pad ||
    a.y + a.h - pad <= b.y + pad ||
    b.y + b.h - pad <= a.y + pad
  )
}

/** 更高层且矩形重叠 → 被遮挡，不可点 */
export function isItemCovered(item: BoardItem, all: BoardItem[]): boolean {
  if (item.removed) return true
  for (const other of all) {
    if (other.removed || other.uid === item.uid) continue
    if (other.layer <= item.layer) continue
    if (rectsOverlap(item, other)) return true
  }
  return false
}

export function isItemClickable(item: BoardItem, all: BoardItem[]): boolean {
  return !item.removed && !isItemCovered(item, all)
}
