import type { ItemTypeId } from './types.ts'
import { ITEM_CATALOG } from './items.ts'

export const FAIL_LINES = [
  '你的周报比锅先糊了',
  '老板隔空点了个赞（嘲讽）',
  '差一对就自由，自由取消了',
  '钉钉：检测到你还活着',
  '这口锅比你绩效还满',
  '同事已经在第二关合影了',
  '系统提示：建议明天再摸',
  '房租说：再来一把？',
  '会议邀请：爆锅复盘会',
  'KPI已读不回你的挣扎',
  '摸鱼失败，变煎鱼了',
  '今日自由进度：0%',
]

export const WIN_LINES = [
  '今日摸鱼合格，KPI暂时假死',
  '你把加班炖化了',
  '锅已空，人还在工位',
  '老板以为你在开会，其实你在通关',
]

const PICK_LINES: Partial<Record<ItemTypeId, string[]>> = {
  dingtalk: ['叮！又来了', '已读，心情已死', '红点比你勤奋'],
  kpi: ['进度条嘲笑你', '目标又远了一截', '数字在施压'],
  boss: ['背后凉飕飕', '老板出现了…', '笑着说“不急”'],
  meeting: ['这个会本可以邮件', '议程：浪费生命', '静音键在哪'],
  report: ['又到了编故事的时候', '本周工作：存活', '复制上上周'],
  coffee: ['续命成功半口', '苦，但有效', '这杯算报销吗'],
  takeout: ['外卖小哥是光', '干饭人不卷', '汤洒了也幸福'],
  slack: ['专业摸鱼启动', '自由的味道', '老板看不到就行'],
}

export function pickFailLine(seed = Date.now()): string {
  return FAIL_LINES[seed % FAIL_LINES.length]!
}

export function pickWinLine(seed = Date.now()): string {
  return WIN_LINES[seed % WIN_LINES.length]!
}

export function pickToast(type: ItemTypeId, seed = Date.now()): string {
  const lines = PICK_LINES[type]
  if (!lines?.length) return `${ITEM_CATALOG[type].emoji} ${ITEM_CATALOG[type].name}`
  return lines[seed % lines.length]!
}
