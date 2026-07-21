import type { AdRequest } from './types.ts'

export type AdProgressHandler = (payload: {
  reason: AdRequest['reason']
  progress: number
  done: boolean
}) => void

/**
 * 激励视频模拟：必须真实等待，禁止瞬时发奖。
 * 后续接抖音/微信 SDK 时只替换本文件实现。
 */
export class AdService {
  private busy = false

  isBusy(): boolean {
    return this.busy
  }

  async watchRewarded(
    request: AdRequest,
    onProgress?: AdProgressHandler,
  ): Promise<boolean> {
    if (this.busy) return false
    this.busy = true
    // 真实等待；用 setTimeout 而非仅依赖 rAF（无头/后台页 rAF 可能不推进）
    const duration = Math.max(2500, request.durationMs)
    const started = Date.now()

    try {
      await new Promise<void>((resolve) => {
        const tick = () => {
          const elapsed = Date.now() - started
          const progress = Math.min(1, elapsed / duration)
          onProgress?.({ reason: request.reason, progress, done: progress >= 1 })
          if (progress >= 1) resolve()
          else setTimeout(tick, 50)
        }
        setTimeout(tick, 50)
      })
      return true
    } finally {
      this.busy = false
    }
  }
}

export const adService = new AdService()
