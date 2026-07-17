import { adService } from './adService.ts'
import { pickFailLine } from './copy.ts'
import {
  addShakes,
  reviveClearSlot,
  shakePot,
  startChallenge,
  startTutorial,
  tryPick,
} from './engine.ts'
import { drawFrame, hitTest, logicalSize } from './renderer.ts'
import type { GamePhase, LevelRuntime } from './types.ts'

const STICKER_KEY = 'moyuguod_stickers'

export class GameApp {
  private root: HTMLElement
  private canvas!: HTMLCanvasElement
  private ctx!: CanvasRenderingContext2D
  private overlay!: HTMLElement
  private runtime: LevelRuntime | null = null
  private phase: GamePhase = 'home'
  private blockedFlashUid: string | null = null
  shakePulse = 0
  private failStreak = 0
  private lastFailLine = ''
  private lastWinLine = ''
  private adLabel = ''
  private raf = 0
  private mode: 'tutorial' | 'challenge' = 'tutorial'

  constructor(root: HTMLElement) {
    this.root = root
    this.mountShell()
    this.showHome()
    this.loop()
  }

  private mountShell(): void {
    this.root.innerHTML = `
      <div class="phone">
        <canvas id="game-canvas" width="390" height="720" aria-label="摸鱼锅游戏画布"></canvas>
        <div class="controls" id="controls"></div>
        <div class="overlay hidden" id="overlay"></div>
      </div>
    `
    this.canvas = this.root.querySelector('#game-canvas')!
    this.ctx = this.canvas.getContext('2d')!
    this.overlay = this.root.querySelector('#overlay')!
    this.canvas.addEventListener('pointerdown', (e) => this.onPointer(e))
    window.addEventListener('resize', () => this.fitCanvas())
    this.fitCanvas()
  }

  private fitCanvas(): void {
    const { w, h } = logicalSize()
    const phone = this.root.querySelector('.phone') as HTMLElement
    const maxW = Math.min(390, window.innerWidth - 24)
    const scale = maxW / w
    phone.style.width = `${w * scale}px`
    phone.style.height = `${h * scale}px`
    this.canvas.style.width = '100%'
    this.canvas.style.height = '100%'
  }

  private setControls(html: string): void {
    const el = this.root.querySelector('#controls')!
    el.innerHTML = html
    el.querySelectorAll('[data-action]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const action = (btn as HTMLElement).dataset.action
        void this.onAction(action ?? '')
      })
    })
  }

  private showHome(): void {
    this.phase = 'home'
    this.runtime = null
    this.overlay.classList.add('hidden')
    this.overlay.innerHTML = ''
    this.setControls(`
      <div class="home-panel">
        <h1>摸鱼锅</h1>
        <p>三消堆叠 · 职场压力炖一锅<br/>点三个相同，颠锅露出下层</p>
        <button data-action="start-tutorial" class="btn primary">开始试锅</button>
        <button data-action="start-challenge" class="btn ghost">直接今日挑战</button>
        <p class="meta">锅贴收集：${this.stickerCount()} 张</p>
      </div>
    `)
  }

  private stickerCount(): number {
    try {
      const raw = localStorage.getItem(STICKER_KEY)
      if (!raw) return 0
      return (JSON.parse(raw) as string[]).length
    } catch {
      return 0
    }
  }

  private unlockSticker(id: string): void {
    try {
      const raw = localStorage.getItem(STICKER_KEY)
      const list: string[] = raw ? (JSON.parse(raw) as string[]) : []
      if (!list.includes(id)) {
        list.push(id)
        localStorage.setItem(STICKER_KEY, JSON.stringify(list))
      }
    } catch {
      /* ignore */
    }
  }

  private begin(mode: 'tutorial' | 'challenge'): void {
    this.mode = mode
    this.phase = 'playing'
    this.runtime =
      mode === 'tutorial'
        ? startTutorial(Date.now(), this.failStreak)
        : startChallenge(Date.now() + 7, this.failStreak)
    this.overlay.classList.add('hidden')
    this.renderPlayingControls()
  }

  private renderPlayingControls(): void {
    this.setControls(`
      <button data-action="shake" class="btn primary">颠锅 (${this.runtime?.shakesLeft ?? 0})</button>
      <button data-action="ad-shake" class="btn ghost">看广告+2颠锅</button>
      <button data-action="home" class="btn tiny">回首页</button>
    `)
  }

  private async onAction(action: string): Promise<void> {
    if (action === 'start-tutorial') {
      this.begin('tutorial')
      return
    }
    if (action === 'start-challenge') {
      this.begin('challenge')
      return
    }
    if (action === 'home') {
      this.showHome()
      return
    }
    if (action === 'retry') {
      this.begin(this.mode)
      return
    }
    if (action === 'next-challenge') {
      this.begin('challenge')
      return
    }
    if (action === 'shake') {
      this.doShake()
      return
    }
    if (action === 'ad-shake') {
      await this.watchAd('extra_shake')
      return
    }
    if (action === 'revive') {
      await this.watchAd('revive')
      return
    }
  }

  private doShake(): void {
    if (!this.runtime || this.phase !== 'playing') return
    if (this.runtime.shakesLeft <= 0) {
      this.runtime = {
        ...this.runtime,
        hintText: '颠锅次数用尽，可看广告补充',
      }
      this.renderPlayingControls()
      return
    }
    const { runtime, event } = shakePot(this.runtime, Date.now())
    this.runtime = runtime
    this.shakePulse = 1
    if (event.type === 'shaken') {
      this.runtime.hintText =
        event.revealed > 0 ? `颠出 ${event.revealed} 个新目标` : '锅晃了'
    }
    this.renderPlayingControls()
  }

  private async watchAd(reason: 'revive' | 'extra_shake'): Promise<void> {
    if (adService.isBusy()) return
    this.phase = 'ad'
    this.adLabel = reason === 'revive' ? '激励广告：复活续命' : '激励广告：补充颠锅'
    this.showAdOverlay(0)

    const ok = await adService.watchRewarded(
      { reason, durationMs: 2800 },
      ({ progress }) => this.showAdOverlay(progress),
    )

    if (!ok || !this.runtime) {
      this.phase = this.runtime?.status === 'lost' ? 'fail' : 'playing'
      return
    }

    if (reason === 'extra_shake') {
      this.runtime = addShakes(this.runtime, 2)
      this.phase = 'playing'
      this.hideOverlay()
      this.renderPlayingControls()
      return
    }

    // revive
    const result = reviveClearSlot(this.runtime)
    this.runtime = result.runtime
    this.phase = 'playing'
    this.hideOverlay()
    this.renderPlayingControls()
  }

  private hideOverlay(): void {
    this.overlay.classList.add('hidden')
    this.overlay.innerHTML = ''
  }

  private showAdOverlay(progress: number): void {
    this.overlay.classList.remove('hidden')
    const pct = Math.floor(progress * 100)
    this.overlay.innerHTML = `
      <div class="card ad-card">
        <h2>${this.adLabel}</h2>
        <p>真实等待中，不可跳过…… ${pct}%</p>
        <div class="bar"><i style="width:${pct}%"></i></div>
      </div>
    `
  }

  private onPointer(e: PointerEvent): void {
    if (!this.runtime || this.phase !== 'playing') return
    const rect = this.canvas.getBoundingClientRect()
    const { w, h } = logicalSize()
    const lx = ((e.clientX - rect.left) / rect.width) * w
    const ly = ((e.clientY - rect.top) / rect.height) * h
    const uid = hitTest(this.runtime, lx, ly)
    if (!uid) return

    const { runtime, event } = tryPick(this.runtime, uid)
    this.runtime = runtime

    if (event.type === 'blocked') {
      this.blockedFlashUid = uid
      this.runtime.hintText = '被压住了，先消上层或颠锅'
      window.setTimeout(() => {
        this.blockedFlashUid = null
      }, 180)
      return
    }

    if (event.type === 'lost') {
      this.failStreak += 1
      this.lastFailLine = event.line || pickFailLine()
      this.phase = 'fail'
      this.showFail()
      return
    }

    if (event.type === 'won') {
      this.failStreak = 0
      this.lastWinLine = event.line
      this.unlockSticker(`${this.mode}-${new Date().toISOString().slice(0, 10)}`)
      this.phase = 'win'
      this.showWin()
      return
    }

    this.renderPlayingControls()
  }

  private showFail(): void {
    this.overlay.classList.remove('hidden')
    this.overlay.innerHTML = `
      <div class="card fail-card">
        <p class="eyebrow">爆锅</p>
        <h2>${this.lastFailLine}</h2>
        <button data-action="revive" class="btn primary">看广告复活（清空餐盘）</button>
        <button data-action="retry" class="btn ghost">重开本关</button>
        <button data-action="home" class="btn tiny">回首页</button>
      </div>
    `
    this.overlay.querySelectorAll('[data-action]').forEach((btn) => {
      btn.addEventListener('click', () => {
        void this.onAction((btn as HTMLElement).dataset.action ?? '')
      })
    })
    this.setControls('')
  }

  private showWin(): void {
    this.overlay.classList.remove('hidden')
    const next =
      this.mode === 'tutorial'
        ? `<button data-action="next-challenge" class="btn primary">进入今日挑战</button>`
        : `<button data-action="retry" class="btn primary">再炖一锅</button>`
    this.overlay.innerHTML = `
      <div class="card win-card">
        <p class="eyebrow">通关</p>
        <h2>${this.lastWinLine}</h2>
        <p class="meta">已收入锅贴 · 当前 ${this.stickerCount()} 张</p>
        ${next}
        <button data-action="home" class="btn ghost">回首页</button>
      </div>
    `
    this.overlay.querySelectorAll('[data-action]').forEach((btn) => {
      btn.addEventListener('click', () => {
        void this.onAction((btn as HTMLElement).dataset.action ?? '')
      })
    })
    this.setControls('')
  }

  private loop = (): void => {
    if (this.shakePulse > 0) {
      this.shakePulse = Math.max(0, this.shakePulse - 0.04)
    }

    if (this.phase === 'home') {
      this.drawHomeBackdrop()
    } else if (this.runtime) {
      drawFrame(this.ctx, this.runtime, this.blockedFlashUid, this.shakePulse)
    }

    this.raf = requestAnimationFrame(this.loop)
  }

  private drawHomeBackdrop(): void {
    const { w, h } = logicalSize()
    const ctx = this.ctx
    const g = ctx.createLinearGradient(0, 0, 0, h)
    g.addColorStop(0, '#2b1810')
    g.addColorStop(1, '#0f0a07')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = '#fbbf24'
    ctx.beginPath()
    ctx.ellipse(195, 340, 140, 100, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#fff7ed'
    ctx.font = 'bold 36px "Segoe UI", "PingFang SC", sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('摸鱼锅', 195, 200)
    ctx.font = '14px sans-serif'
    ctx.fillStyle = '#fde68a'
    ctx.fillText('把KPI炖了再上班', 195, 232)
  }

  destroy(): void {
    cancelAnimationFrame(this.raf)
  }
}
