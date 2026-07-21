import type { LevelSpec, StressDef, StressId } from './types.ts'

export const STRESS_CATALOG: Record<StressId, StressDef> = {
  dingtalk: { id: 'dingtalk', name: '钉钉', emoji: '🔔', color: '#3b82f6', toughness: 1 },
  kpi: { id: 'kpi', name: 'KPI', emoji: '📉', color: '#ef4444', toughness: 1.2 },
  meeting: { id: 'meeting', name: '会议', emoji: '📅', color: '#f59e0b', toughness: 1.1 },
  boss: { id: 'boss', name: '老板', emoji: '🕶️', color: '#111827', toughness: 1.4 },
  report: { id: 'report', name: '周报', emoji: '📄', color: '#a78bfa', toughness: 1 },
  overtime: { id: 'overtime', name: '加班', emoji: '🌙', color: '#6366f1', toughness: 1.3 },
  email: { id: 'email', name: '邮件', emoji: '📧', color: '#14b8a6', toughness: 0.9 },
  rent: { id: 'rent', name: '房租', emoji: '🔑', color: '#78716c', toughness: 1.15 },
}

export const STRESS_ORDER: StressId[] = [
  'dingtalk',
  'kpi',
  'meeting',
  'email',
  'report',
  'boss',
  'overtime',
  'rent',
]

export const LEVEL_SHIFT: LevelSpec = {
  id: 'shift',
  title: '这一班·摸鱼锅',
  totalStress: 18,
  deskCap: 8,
  spawnEveryMs: 1600,
  burstNeed: 3,
}

export const LEVEL_OVERTIME: LevelSpec = {
  id: 'overtime',
  title: '加班局·多炖一会',
  totalStress: 28,
  deskCap: 10,
  spawnEveryMs: 1300,
  burstNeed: 4,
}

export const TOAST_THROW: Record<StressId, string> = {
  dingtalk: '红点，下去吧',
  kpi: '指标进锅，心情起飞',
  meeting: '这会，我请它吃火锅',
  boss: '老板？红烧的',
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
  '加班潮把锅淹了',
  '会议叠罗汉，今日输给工位',
]
