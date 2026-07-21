import { playSfx, unlockAudio } from './audio.ts'
import { adService } from './adService.ts'
import {
  beginDrag,
  endDrag,
  hitItem,
  H,
  moveDrag,
  POT,
  startOvertime,
  startShift,
  tapPot,
  tick,
  W,
  watchAdClearDesk,
} from './sim.ts'
import { drawSim } from './render.ts'
import type { Phase, SimState } from './types.ts'

export class GameApp {
  private root: HTMLElement
  private canvas!: HTMLCanvasElement
  private ctx!: CanvasRenderingContext2D
  private overlay!: HTMLElement
  private controls!: HTMLElement
  private state: SimState | null = null
  private phase: Phase = 'home'
  private last = 0
  private lastPos: { x: number; y: number; t: number } | null = null
  private mode: 'shift' | 'overtime' = 'shift'

  constructor(root: HTMLElement) {
    this.root = root
    this.mount()
    this.showHome()
    this.last = performance.now()
    this.loop(this.last)
  }

  private mount(): void {
    this.root.innerHTML = `
      <div class="phone">
        <canvas id="game-canvas" width="${W}" height="${H}" aria-label="摸鱼锅"></canvas>
        <div class="controls controls-home" id="controls"></div>
        <div class="overlay hidden" id="overlay"></div>
      </div>
    `
    this.canvas = this.root.querySelector('#game-canvas')!
    this.ctx = this.canvas.getContext('2d')!
    this.controls = this.root.querySelector('#controls')!
    this.overlay = this.root.querySelector('#overlay')!
    this.canvas.addEventListener('pointerdown', (e) => this.onDown(e))
    this.canvas.addEventListener('pointermove', (e) => this.onMove(e))
    this.canvas.addEventListener('pointerup', (e) => this.onUp(e))
    this.canvas.addEventListener('pointercancel', (e) => this.onUp(e))
    window.addEventListener('resize', () => this.fit())
    this.fit()
  }

  private fit(): void {
    const phone = this.root.querySelector('.phone') as HTMLElement
    const maxW = Math.min(390, window.innerWidth - 24)
    const scale = maxW / W
    phone.style.width = `${W * scale}px`
    phone.style.height = `${H * scale}px`
    this.canvas.style.width = '100%'
    this.canvas.style.height = '100%'
  }

  private setControls(html: string, mode: 'home' | 'play' | 'none'): void {
    this.controls.className = `controls controls-${mode}`
    this.controls.innerHTML = html
    this.controls.querySelectorAll('[data-action]').forEach((btn) => {
      btn.addEventListener('click', () => {
        void this.onAction((btn as HTMLElement).dataset.action ?? '')
      })
    })
  }

  private showHome(): void {
    this.phase = 'home'
    this.state = null
    this.hideOverlay()
    this.setControls(
      `
      <div class="home-panel">
        <p>别消方块了。<br/>把上班压力<strong>甩进锅里炖掉</strong>，看桌面变干净。</p>
        <button class="btn primary" data-action="start-shift">开始这一班</button>
        <button class="btn ghost" data-action="start-overtime">加班局</button>
        <p class="meta">学爆款的解压感：扔出去 · 变整洁 · 有完成感</p>
      </div>
    `,
      'home',
    )
  }

  private begin(mode: 'shift' | 'overtime'): void {
    this.mode = mode
    this.phase = 'playing'
    this.state = mode === 'shift' ? startShift(Date.now()) : startOvertime(Date.now() + 3)
    this.hideOverlay()
    this.setControls(
      `
      <button class="btn primary" data-action="stir">点锅加速炖</button>
      <button class="btn ghost" data-action="home">回首页</button>
    `,
      'play',
    )
  }

  private async onAction(action: string): Promise<void> {
    unlockAudio()
    if (action === 'start-shift') {
      this.begin('shift')
      return
    }
    if (action === 'start-overtime') {
      this.begin('overtime')
      return
    }
    if (action === 'home') {
      this.showHome()
      return
    }
    if (action === 'stir' && this.state) {
      this.state = tapPot(this.state)
      playSfx('stir')
      if (this.state.toast.includes('化了') || this.state.toast.includes('清蒸')) playSfx('burst')
      this.afterSim()
      return
    }
    if (action === 'retry') {
      this.begin(this.mode)
      return
    }
    if (action === 'revive') {
      await this.adRevive()
    }
  }

  private async adRevive(): Promise<void> {
    if (!this.state || adService.isBusy()) return
    this.phase = 'ad'
    this.overlay.classList.remove('hidden')
    const ok = await adService.watchRewarded({ reason: 'revive', durationMs: 2800 }, ({ progress }) => {
      const pct = Math.floor(progress * 100)
      this.overlay.innerHTML = `
        <div class="card ad-card">
          <h2>激励广告：桌面减负</h2>
          <p>真实等待中… ${pct}%</p>
          <div class="bar"><i style="width:${pct}%"></i></div>
        </div>`
    })
    if (!ok || !this.state) {
      this.phase = 'fail'
      return
    }
    this.state = watchAdClearDesk(this.state)
    this.phase = 'playing'
    this.hideOverlay()
    this.setControls(
      `
      <button class="btn primary" data-action="stir">点锅加速炖</button>
      <button class="btn ghost" data-action="home">回首页</button>
    `,
      'play',
    )
    playSfx('splash')
  }

  private hideOverlay(): void {
    this.overlay.classList.add('hidden')
    this.overlay.innerHTML = ''
  }

  private toLocal(e: PointerEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect()
    return {
      x: ((e.clientX - rect.left) / rect.width) * W,
      y: ((e.clientY - rect.top) / rect.height) * H,
    }
  }

  private onDown(e: PointerEvent): void {
    if (!this.state || this.phase !== 'playing') return
    unlockAudio()
    this.canvas.setPointerCapture(e.pointerId)
    const { x, y } = this.toLocal(e)
    // 点锅
    if (inPotTouch(x, y)) {
      this.state = tapPot(this.state)
      playSfx('stir')
      if (this.state.toast.includes('化了') || this.state.toast.includes('清蒸')) playSfx('burst')
      this.afterSim()
      return
    }
    const item = hitItem(this.state, x, y)
    if (!item) return
    this.state = beginDrag(this.state, item.uid)
    this.lastPos = { x, y, t: performance.now() }
    playSfx('grab')
  }

  private onMove(e: PointerEvent): void {
    if (!this.state || !this.state.dragUid) return
    const { x, y } = this.toLocal(e)
    this.state = moveDrag(this.state, x, y)
    this.lastPos = { x, y, t: performance.now() }
  }

  private onUp(e: PointerEvent): void {
    if (!this.state || !this.state.dragUid) return
    const { x, y } = this.toLocal(e)
    const prev = this.lastPos ?? { x, y, t: performance.now() }
    const dt = Math.max(16, performance.now() - prev.t)
    const vx = ((x - prev.x) / dt) * 0.8
    const vy = ((y - prev.y) / dt) * 0.8
    const { state, event } = endDrag(this.state, x, y, vx, vy)
    this.state = state
    this.lastPos = null
    if (event === 'throw-in') playSfx('splash')
    else if (event === 'throw-miss') playSfx('miss')
    this.afterSim()
  }

  private afterSim(): void {
    if (!this.state) return
    if (this.state.status === 'won') {
      this.phase = 'clear'
      playSfx('win')
      this.showEnd(true)
    } else if (this.state.status === 'lost') {
      this.phase = 'fail'
      playSfx('fail')
      this.showEnd(false)
    }
  }

  private showEnd(won: boolean): void {
    this.overlay.classList.remove('hidden')
    this.overlay.innerHTML = won
      ? `<div class="card win-card">
          <p class="eyebrow">下班</p>
          <h2>${this.state?.toast ?? '清爽了'}</h2>
          <p class="meta">爆发 ${this.state?.bursts ?? 0} 次 · 炖掉 ${this.state?.cleared ?? 0} 份压力</p>
          <button class="btn primary" data-action="retry">再来一班</button>
          <button class="btn ghost" data-action="home">回首页</button>
        </div>`
      : `<div class="card fail-card">
          <p class="eyebrow">被淹没</p>
          <h2>${this.state?.toast ?? '桌面炸了'}</h2>
          <button class="btn primary" data-action="revive">看广告减负续命</button>
          <button class="btn ghost" data-action="retry">重开</button>
          <button class="btn tiny" data-action="home">回首页</button>
        </div>`
    this.overlay.querySelectorAll('[data-action]').forEach((btn) => {
      btn.addEventListener('click', () => {
        void this.onAction((btn as HTMLElement).dataset.action ?? '')
      })
    })
    this.setControls('', 'none')
  }

  private loop = (now: number): void => {
    const dt = Math.min(0.033, (now - this.last) / 1000)
    this.last = now
    if (this.phase === 'playing' && this.state) {
      const before = this.state.bursts
      const beforeSpawned = this.state.spawned
      this.state = tick(this.state, dt)
      if (this.state.bursts > before) playSfx('burst')
      if (this.state.spawned > beforeSpawned) playSfx('spawn')
      this.afterSim()
    }

    if (this.phase === 'home') this.drawHome()
    else if (this.state) drawSim(this.ctx, this.state)

    requestAnimationFrame(this.loop)
  }

  private drawHome(): void {
    const ctx = this.ctx
    const g = ctx.createLinearGradient(0, 0, 0, H)
    g.addColorStop(0, '#2b1810')
    g.addColorStop(1, '#0f0a07')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
    ctx.fillStyle = '#fbbf24'
    ctx.beginPath()
    ctx.ellipse(POT.cx, 360, 130, 90, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#fff7ed'
    ctx.font = 'bold 40px "PingFang SC", sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('摸鱼锅', W / 2, 190)
    ctx.font = '14px "PingFang SC", sans-serif'
    ctx.fillStyle = '#fde68a'
    ctx.fillText('把压力炖了，不是把方块消了', W / 2, 228)
  }
}

function inPotTouch(x: number, y: number): boolean {
  const dx = (x - POT.cx) / (POT.rx + 10)
  const dy = (y - POT.cy) / (POT.ry + 10)
  return dx * dx + dy * dy <= 1
}
