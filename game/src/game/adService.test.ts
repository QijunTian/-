import { describe, expect, it } from 'vitest'
import { AdService } from './adService.ts'

describe('AdService', () => {
  it('waits at least the requested duration before resolving', async () => {
    const ads = new AdService()
    const t0 = Date.now()
    const ok = await ads.watchRewarded({ reason: 'extra_shake', durationMs: 2500 })
    const elapsed = Date.now() - t0
    expect(ok).toBe(true)
    expect(elapsed).toBeGreaterThanOrEqual(2500)
  })
})
