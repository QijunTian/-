export type StressId =
  | 'dingtalk'
  | 'kpi'
  | 'meeting'
  | 'boss'
  | 'report'
  | 'overtime'
  | 'email'
  | 'rent'

export type Phase = 'home' | 'playing' | 'clear' | 'fail' | 'ad'

export interface AdRequest {
  reason: 'revive' | 'extra_shake' | 'hint'
  durationMs: number
}

export interface StressDef {
  id: StressId
  name: string
  emoji: string
  color: string
  /** 炖化所需“火候”，越小越好炖 */
  toughness: number
}

export interface DeskItem {
  uid: string
  type: StressId
  x: number
  y: number
  vx: number
  vy: number
  r: number
  /** desk | flying | pot */
  place: 'desk' | 'flying' | 'pot'
  /** 0–1 锅内炖化进度 */
  cook: number
  wobble: number
}

export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  color: string
  size: number
}

export interface LevelSpec {
  id: string
  title: string
  /** 本关总共要处理的压力数 */
  totalStress: number
  /** 桌面同时存在上限 */
  deskCap: number
  /** 生成间隔 ms */
  spawnEveryMs: number
  /** 锅内爆发所需已炖化个数 */
  burstNeed: number
}

export interface SimState {
  spec: LevelSpec
  items: DeskItem[]
  particles: Particle[]
  spawnLeft: number
  spawned: number
  cleared: number
  bursts: number
  potHeat: number
  status: 'playing' | 'won' | 'lost'
  toast: string
  hint: string
  elapsed: number
  spawnAcc: number
  dragUid: string | null
  calm: number
  /** 桌面顶满持续时间，用于柔和失败 */
  fullAcc: number
}
