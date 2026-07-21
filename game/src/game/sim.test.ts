import { describe, expect, it } from 'vitest'
import { LEVEL_SHIFT } from './catalog.ts'
import {
  beginDrag,
  createSim,
  endDrag,
  hitItem,
  POT,
  startShift,
  tapPot,
  tick,
} from './sim.ts'

describe('stew catharsis loop', () => {
  it('can throw a desk item into the pot', () => {
    const state = startShift(42)
    const target = state.items.find((i) => i.place === 'desk')
    expect(target).toBeTruthy()
    const dragged = beginDrag(state, target!.uid)
    const res = endDrag(dragged, POT.cx, POT.cy, 0, 0.5)
    expect(res.event).toBe('throw-in')
    expect(res.state.items.some((i) => i.uid === target!.uid && i.place === 'pot')).toBe(true)
  })

  it('cooking then bursting increases calm and clear count', () => {
    let s = createSim(
      { ...LEVEL_SHIFT, totalStress: 6, deskCap: 6, spawnEveryMs: 99999, burstNeed: 2 },
      7,
    )
    for (const it of [...s.items]) {
      if (it.place !== 'desk') continue
      s = beginDrag(s, it.uid)
      s = endDrag(s, POT.cx, POT.cy, 0, 1).state
    }
    expect(s.items.some((i) => i.place === 'pot')).toBe(true)
    const beforeCalm = s.calm
    for (let i = 0; i < 12; i++) s = tapPot(s)
    expect(s.bursts).toBeGreaterThan(0)
    expect(s.cleared).toBeGreaterThan(0)
    expect(s.calm).toBeGreaterThan(beforeCalm)
  })

  it('hit test only selects desk items', () => {
    const s = startShift(3)
    const desk = s.items.find((i) => i.place === 'desk')!
    expect(hitItem(s, desk.x, desk.y)?.uid).toBe(desk.uid)
  })

  it('auto simmer progresses cook without input', () => {
    let s = startShift(9)
    const one = s.items[0]!
    s = beginDrag(s, one.uid)
    s = endDrag(s, POT.cx, POT.cy, 0, 1).state
    const pot = s.items.find((i) => i.place === 'pot')!
    const cook0 = pot.cook
    s = tick(s, 0.5)
    const pot2 = s.items.find((i) => i.uid === pot.uid)
    expect(pot2).toBeTruthy()
    expect(pot2!.cook).toBeGreaterThan(cook0)
  })
})
