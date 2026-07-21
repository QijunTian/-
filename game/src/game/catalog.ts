import type { LevelSpec, StressDef, StressId } from './types.ts'

export const STRESS_CATALOG: Record<StressId, StressDef> = {
  dingtalk: { id: 'dingtalk', name: '钉钉', emoji: '🔔', color: '#3b82f6', toughness: 1 },
  kpi: { id: 'kpi', name: 'KPI', emoji: '📉', color: '#ef4444', toughness: 1.15 },
  meeting: { id: 'meeting', name: '会议', emoji: '📅', color: '#f59e0b', toughness: 1.1 },
  boss: { id: 'boss', name: '老板', emoji: '🕶️', color: '#111827', toughness: 1.55 },
  report: { id: 'report', name: '周报', emoji: '📄', color: '#a78bfa', toughness: 1 },
  overtime: { id: 'overtime', name: '加班', emoji: '🌙', color: '#6366f1', toughness: 1.25 },
  email: { id: 'email', name: '邮件', emoji: '📧', color: '#14b8a6', toughness: 0.9 },
  rent: { id: 'rent', name: '房租', emoji: '🔑', color: '#78716c', toughness: 1.1 },
}

/** 波次解锁的压力池：越后越难炖、越烦人 */
export const WAVE_POOL: Record<1 | 2 | 3, StressId[]> = {
  1: ['email', 'dingtalk', 'report', 'meeting'],
  2: ['email', 'dingtalk', 'report', 'meeting', 'kpi', 'rent'],
  3: ['dingtalk', 'meeting', 'kpi', 'rent', 'overtime', 'boss'],
}

export const LEVEL_SHIFT: LevelSpec = {
  id: 'shift',
  title: '这一班·摸鱼锅',
  totalStress: 24,
  deskCap: 7,
  spawnEveryMs: 1700,
  burstNeed: 3,
  potCap: 4,
}

export const LEVEL_OVERTIME: LevelSpec = {
  id: 'overtime',
  title: '加班局·高压灶',
  totalStress: 36,
  deskCap: 8,
  spawnEveryMs: 1400,
  burstNeed: 3,
  potCap: 3,
}

export const TOAST_THROW: Record<StressId, string> = {
  dingtalk: '红点，下去吧',
  kpi: '指标进锅，心情起飞',
  meeting: '这会，我请它吃火锅',
  boss: '老板？得大火收汁',
  report: '周报变残页了',
  overtime: '加班也怕开水',
  email: '未读清零的声音真香',
  rent: '房租先泡着',
}

export const CLEAR_LINES = [
  '下班！桌面比心情干净',
  '这一锅，KPI溶了',
  '摸鱼成功，锅也空了',
  '压力成汤，人还在',
]

export const FAIL_LINES = [
  '桌面被钉钉淹没了…',
  '锅满了还硬塞，翻了',
  '加班潮把工位淹了',
]

export const WAVE_HINT: Record<1 | 2 | 3, string> = {
  1: '早班：随便甩也好过',
  2: '下午：乱炖会夹生，半熟会占锅',
  3: '收官：锅更小，诱饵更毒，差一点最难受',
}
