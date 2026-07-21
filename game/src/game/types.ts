export type ItemTypeId =
  | 'dingtalk'
  | 'kpi'
  | 'report'
  | 'meeting'
  | 'boss'
  | 'coffee'
  | 'takeout'
  | 'slack'
  | 'overtime'
  | 'perf'
  | 'rent'
  | 'marriage'

export type GamePhase = 'home' | 'playing' | 'ad' | 'fail' | 'win'

export interface ItemDef {
  id: ItemTypeId
  name: string
  emoji: string
  color: string
  accent: string
  /** stress 增加热锅；relief 消除时有奖励 */
  vibe: 'stress' | 'relief' | 'neutral'
}

export interface BoardItem {
  uid: string
  type: ItemTypeId
  x: number
  y: number
  layer: number
  w: number
  h: number
  removed: boolean
}

export interface LevelConfig {
  id: string
  title: string
  types: ItemTypeId[]
  /** 每种出现次数，必须能被 3 整除 */
  countPerType: number
  layers: number
  coverTightness: number
  freeShakes: number
  slotCapacity: number
}

export interface LevelRuntime {
  config: LevelConfig
  items: BoardItem[]
  slot: ItemTypeId[]
  shakesLeft: number
  failCount: number
  status: 'playing' | 'won' | 'lost'
  hintText: string
  /** 连续消除次数 */
  combo: number
  /** 0–5，乱点会糊锅 */
  heat: number
  toast: string
}

export interface AdRequest {
  reason: 'revive' | 'extra_shake' | 'hint'
  durationMs: number
}
