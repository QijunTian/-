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

export function pickFailLine(seed = Date.now()): string {
  return FAIL_LINES[seed % FAIL_LINES.length]!
}

export function pickWinLine(seed = Date.now()): string {
  return WIN_LINES[seed % WIN_LINES.length]!
}
