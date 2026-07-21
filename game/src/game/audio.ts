/** 轻量 WebAudio 音效：无资源文件，点击即响 */

type Sfx =
  | 'tap'
  | 'block'
  | 'match'
  | 'combo'
  | 'shake'
  | 'heat'
  | 'fail'
  | 'win'
  | 'bonus'

let ctx: AudioContext | null = null

function ac(): AudioContext | null {
  const w = window as Window & { webkitAudioContext?: typeof AudioContext }
  const Ctor = window.AudioContext || w.webkitAudioContext
  if (!Ctor) return null
  if (!ctx) ctx = new Ctor()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function beep(
  freq: number,
  duration: number,
  type: OscillatorType,
  gain = 0.05,
  when = 0,
): void {
  const audio = ac()
  if (!audio) return
  const t0 = audio.currentTime + when
  const osc = audio.createOscillator()
  const g = audio.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t0)
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration)
  osc.connect(g)
  g.connect(audio.destination)
  osc.start(t0)
  osc.stop(t0 + duration + 0.02)
}

export function playSfx(kind: Sfx, combo = 1): void {
  switch (kind) {
    case 'tap':
      beep(420, 0.05, 'triangle', 0.04)
      break
    case 'block':
      beep(140, 0.08, 'square', 0.03)
      break
    case 'match':
      beep(520, 0.07, 'sine', 0.06)
      beep(780, 0.1, 'sine', 0.05, 0.05)
      break
    case 'combo': {
      const base = 500 + Math.min(combo, 6) * 70
      beep(base, 0.08, 'sine', 0.06)
      beep(base * 1.25, 0.12, 'triangle', 0.05, 0.06)
      beep(base * 1.5, 0.14, 'sine', 0.04, 0.12)
      break
    }
    case 'shake':
      beep(180, 0.05, 'sawtooth', 0.03)
      beep(160, 0.05, 'sawtooth', 0.03, 0.05)
      beep(200, 0.08, 'sawtooth', 0.025, 0.1)
      break
    case 'heat':
      beep(220, 0.12, 'sawtooth', 0.04)
      beep(180, 0.16, 'square', 0.03, 0.08)
      break
    case 'fail':
      beep(300, 0.12, 'triangle', 0.05)
      beep(180, 0.2, 'sine', 0.05, 0.1)
      break
    case 'win':
      beep(523, 0.1, 'sine', 0.05)
      beep(659, 0.1, 'sine', 0.05, 0.1)
      beep(784, 0.18, 'sine', 0.05, 0.2)
      break
    case 'bonus':
      beep(660, 0.08, 'triangle', 0.05)
      beep(990, 0.12, 'sine', 0.045, 0.07)
      break
  }
}

/** 首次用户手势时解锁音频（浏览器策略） */
export function unlockAudio(): void {
  const audio = ac()
  if (!audio) return
  void audio.resume()
}
