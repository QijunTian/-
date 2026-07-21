/** 解压向音效：偏软、短、确定 */

type Sfx = 'grab' | 'splash' | 'stir' | 'burst' | 'spawn' | 'miss' | 'win' | 'fail'

let ctx: AudioContext | null = null

function ac(): AudioContext | null {
  const w = window as Window & { webkitAudioContext?: typeof AudioContext }
  const Ctor = window.AudioContext || w.webkitAudioContext
  if (!Ctor) return null
  if (!ctx) ctx = new Ctor()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function tone(
  freq: number,
  dur: number,
  type: OscillatorType,
  gain = 0.04,
  when = 0,
  slideTo?: number,
): void {
  const audio = ac()
  if (!audio) return
  const t0 = audio.currentTime + when
  const osc = audio.createOscillator()
  const g = audio.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t0)
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur)
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  osc.connect(g)
  g.connect(audio.destination)
  osc.start(t0)
  osc.stop(t0 + dur + 0.02)
}

export function unlockAudio(): void {
  const audio = ac()
  if (audio) void audio.resume()
}

export function playSfx(kind: Sfx): void {
  switch (kind) {
    case 'grab':
      tone(320, 0.04, 'sine', 0.03)
      break
    case 'splash':
      tone(240, 0.06, 'triangle', 0.045)
      tone(180, 0.1, 'sine', 0.03, 0.04)
      break
    case 'stir':
      tone(400, 0.05, 'triangle', 0.035, 0, 520)
      break
    case 'burst':
      tone(480, 0.08, 'sine', 0.05)
      tone(640, 0.1, 'triangle', 0.04, 0.06)
      tone(820, 0.14, 'sine', 0.035, 0.12)
      break
    case 'spawn':
      tone(260, 0.05, 'sine', 0.02)
      break
    case 'miss':
      tone(160, 0.07, 'square', 0.02)
      break
    case 'win':
      tone(523, 0.1, 'sine', 0.045)
      tone(659, 0.12, 'sine', 0.04, 0.1)
      tone(784, 0.16, 'sine', 0.04, 0.2)
      break
    case 'fail':
      tone(280, 0.1, 'triangle', 0.04)
      tone(170, 0.16, 'sine', 0.035, 0.08)
      break
  }
}
