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
  place: 'desk' | 'flying' | 'pot'
  cook: number
  wobble: number
  /** 外壳：1=要先甩裂，0=可直接进锅 */
  shell: number
  /** 是否会在桌面乱爬（中后期） */
  roam: boolean
  /** boss 更耐煮 */
  boss: boolean
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
  totalStress: number
  deskCap: number
  /** 基础生成间隔，会随波次缩短 */
  spawnEveryMs: number
  burstNeed: number
  /** 锅内同时最多几份，满了必须先炖 */
  potCap: number
}

/** 1早班轻松 2下午加速 3临近下班高压 */
export type Wave = 1 | 2 | 3

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
  fullAcc: number
  wave: Wave
  sameTypeStreak: number
}
