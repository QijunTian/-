import { describe, expect, it } from 'vitest'
import { LEVEL_SHIFT } from './catalog.ts'
import {
  beginDrag,
  createSim,
  effectivePotCap,
  endDrag,
  isClaggy,
  POT,
  startShift,
  tapPot,
  waveOf,
} from './sim.ts'

describe('looks-easy traps', () => {
  it('wave and endgame pot shrink', () => {
    expect(waveOf(0, 24)).toBe(1)
    expect(waveOf(18, 24)).toBe(3)
    const early = createSim(LEVEL_SHIFT, 1)
    expect(effectivePotCap(early)).toBe(LEVEL_SHIFT.potCap)
    const late = { ...early, cleared: Math.ceil(LEVEL_SHIFT.totalStress * 0.8) }
    expect(effectivePotCap(late)).toBe(LEVEL_SHIFT.potCap - 1)
  })

  it('rejects throw when pot is full', () => {
    let s = createSim({ ...LEVEL_SHIFT, potCap: 2, spawnEveryMs: 99999 }, 11)
    const desk = s.items.filter((i) => i.place === 'desk').slice(0, 3)
    for (const it of desk.slice(0, 2)) {
      s = {
        ...s,
        items: s.items.map((x) => (x.uid === it.uid ? { ...x, shell: 0, bait: false } : x)),
      }
      s = beginDrag(s, it.uid)
      const res = endDrag(s, POT.cx, POT.cy, 0, 1)
      expect(res.event).toBe('throw-in')
      s = res.state
    }
    const next = desk[2]!
    s = {
      ...s,
      items: s.items.map((x) => (x.uid === next.uid ? { ...x, shell: 0, bait: false } : x)),
    }
    s = beginDrag(s, next.uid)
    expect(endDrag(s, POT.cx, POT.cy, 0, 1).event).toBe('pot-full')
  })

  it('shell requires two throws', () => {
    let s = startShift(5)
    const target = s.items[0]!
    s = {
      ...s,
      items: s.items.map((x) =>
        x.uid === target.uid
          ? { ...x, shell: 1, place: 'desk', roam: false, bait: false }
          : x,
      ),
    }
    s = beginDrag(s, target.uid)
    const crack = endDrag(s, POT.cx, POT.cy, 0, 1)
    expect(crack.event).toBe('crack')
    s = beginDrag(crack.state, target.uid)
    expect(endDrag(s, POT.cx, POT.cy, 0, 1).event).toBe('throw-in')
  })

  it('claggy pot when three different singles', () => {
    let s = createSim({ ...LEVEL_SHIFT, potCap: 4, spawnEveryMs: 99999 }, 2)
    s = {
      ...s,
      items: [potItem('a', 'dingtalk', 0.2), potItem('b', 'kpi', 0.2), potItem('c', 'meeting', 0.2)],
    }
    expect(isClaggy(s)).toBe(true)
    const after = tapPot(s)
    expect(after.items[0]!.cook).toBeLessThan(0.35)
  })

  it('partial burst leaves uncooked occupying pot', () => {
    let s = createSim({ ...LEVEL_SHIFT, potCap: 4, burstNeed: 2, spawnEveryMs: 99999 }, 4)
    s = {
      ...s,
      items: [potItem('c1', 'dingtalk', 1), potItem('c2', 'dingtalk', 1), potItem('r1', 'kpi', 0.4)],
    }
    const after = tapPot(s)
    expect(after.bursts).toBeGreaterThan(0)
    expect(after.items.some((i) => i.uid === 'r1' && i.place === 'pot')).toBe(true)
    expect(after.toast.includes('半熟') || after.hint.includes('半熟')).toBe(true)
  })

  it('bait throw spawns extra desk pressure', () => {
    let s = createSim({ ...LEVEL_SHIFT, potCap: 4, deskCap: 8, spawnEveryMs: 99999 }, 8)
    s = {
      ...s,
      items: [
        {
          uid: 'bait1',
          type: 'email',
          x: 120,
          y: 200,
          vx: 0,
          vy: 0,
          r: 30,
          place: 'desk',
          cook: 0,
          wobble: 0,
          shell: 0,
          roam: false,
          boss: false,
          bait: true,
        },
      ],
      spawnLeft: 10,
    }
    const beforeDesk = s.items.filter((i) => i.place === 'desk').length
    s = beginDrag(s, 'bait1')
    const res = endDrag(s, POT.cx, POT.cy, 0, 1)
    expect(res.event).toBe('throw-in')
    const deskAfter = res.state.items.filter((i) => i.place === 'desk').length
    expect(deskAfter).toBeGreaterThanOrEqual(beforeDesk - 1 + 2)
    expect(res.state.toast.includes('加班') || res.state.hint.includes('诱饵')).toBe(true)
  })
})

function potItem(uid: string, type: 'dingtalk' | 'kpi' | 'meeting', cook: number) {
  return {
    uid,
    type,
    x: POT.cx,
    y: POT.cy,
    vx: 0,
    vy: 0,
    r: 28,
    place: 'pot' as const,
    cook,
    wobble: 0,
    shell: 0,
    roam: false,
    boss: false,
    bait: false,
  }
}
