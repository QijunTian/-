import type { ItemDef, ItemTypeId } from './types.ts'

export const ITEM_CATALOG: Record<ItemTypeId, ItemDef> = {
  dingtalk: {
    id: 'dingtalk',
    name: '钉钉',
    emoji: '🔔',
    color: '#2f7cf6',
    accent: '#ff4d4f',
    vibe: 'stress',
  },
  kpi: {
    id: 'kpi',
    name: 'KPI',
    emoji: '📉',
    color: '#ef4444',
    accent: '#fecaca',
    vibe: 'stress',
  },
  report: {
    id: 'report',
    name: '周报',
    emoji: '📄',
    color: '#a78bfa',
    accent: '#ede9fe',
    vibe: 'stress',
  },
  meeting: {
    id: 'meeting',
    name: '会议',
    emoji: '📅',
    color: '#f59e0b',
    accent: '#fef3c7',
    vibe: 'stress',
  },
  boss: {
    id: 'boss',
    name: '老板',
    emoji: '🕶️',
    color: '#111827',
    accent: '#9ca3af',
    vibe: 'stress',
  },
  coffee: {
    id: 'coffee',
    name: '咖啡',
    emoji: '☕',
    color: '#92400e',
    accent: '#fdba74',
    vibe: 'relief',
  },
  takeout: {
    id: 'takeout',
    name: '外卖',
    emoji: '🍜',
    color: '#10b981',
    accent: '#d1fae5',
    vibe: 'relief',
  },
  slack: {
    id: 'slack',
    name: '摸鱼',
    emoji: '🐟',
    color: '#06b6d4',
    accent: '#cffafe',
    vibe: 'relief',
  },
  overtime: {
    id: 'overtime',
    name: '加班',
    emoji: '🌙',
    color: '#312e81',
    accent: '#c7d2fe',
    vibe: 'stress',
  },
  perf: {
    id: 'perf',
    name: '绩效',
    emoji: '📊',
    color: '#db2777',
    accent: '#fbcfe8',
    vibe: 'stress',
  },
  rent: {
    id: 'rent',
    name: '房租',
    emoji: '🔑',
    color: '#64748b',
    accent: '#e2e8f0',
    vibe: 'stress',
  },
  marriage: {
    id: 'marriage',
    name: '催婚',
    emoji: '💍',
    color: '#be123c',
    accent: '#fecdd3',
    vibe: 'stress',
  },
}

export const ALL_TYPES = Object.keys(ITEM_CATALOG) as ItemTypeId[]

export const STRESS_TYPES: ItemTypeId[] = ALL_TYPES.filter(
  (id) => ITEM_CATALOG[id].vibe === 'stress',
)
