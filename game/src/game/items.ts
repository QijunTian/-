import type { ItemDef, ItemTypeId } from './types.ts'

export const ITEM_CATALOG: Record<ItemTypeId, ItemDef> = {
  dingtalk: { id: 'dingtalk', name: '钉钉', color: '#2f7cf6', accent: '#ff4d4f' },
  kpi: { id: 'kpi', name: 'KPI', color: '#ef4444', accent: '#fecaca' },
  report: { id: 'report', name: '周报', color: '#a78bfa', accent: '#ede9fe' },
  meeting: { id: 'meeting', name: '会议', color: '#f59e0b', accent: '#fef3c7' },
  boss: { id: 'boss', name: '老板', color: '#111827', accent: '#9ca3af' },
  coffee: { id: 'coffee', name: '咖啡', color: '#92400e', accent: '#fdba74' },
  takeout: { id: 'takeout', name: '外卖', color: '#10b981', accent: '#d1fae5' },
  slack: { id: 'slack', name: '摸鱼', color: '#06b6d4', accent: '#cffafe' },
  overtime: { id: 'overtime', name: '加班', color: '#312e81', accent: '#c7d2fe' },
  perf: { id: 'perf', name: '绩效', color: '#db2777', accent: '#fbcfe8' },
  rent: { id: 'rent', name: '房租', color: '#64748b', accent: '#e2e8f0' },
  marriage: { id: 'marriage', name: '催婚', color: '#be123c', accent: '#fecdd3' },
}

export const ALL_TYPES = Object.keys(ITEM_CATALOG) as ItemTypeId[]
