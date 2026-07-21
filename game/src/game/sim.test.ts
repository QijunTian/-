import { describe, expect, it } from 'vitest'
import { LEVEL_SHIFT } from './catalog.ts'
import {
  beginDrag,
  createSim,
  endDrag,
  POT,
  startShift,
  tapPot,
  waveOf,
} from './sim.ts'

describe('difficulty progression', () => {
  it('wave rises with clear progress', () => {
    expect(waveOf(0, 24)).toBe(1)
    expect(waveOf(9, 24)).toBe(2)
    expect(waveOf(18, 24)).toBe(3)
  })

  it('rejects throw when pot is full', () => {
    let s = createSim({ ...LEVEL_SHIFT, potCap: 2, spawnEveryMs: 99999 }, 11)
    const desk = s.items.filter((i) => i.place === 'desk').slice(0, 3)
    for (const it of desk.slice(0, 2)) {
      // 确保无壳
      s = {
        ...s,
        items: s.items.map((x) => (x.uid === it.uid ? { ...x, shell: 0 } : x)),
      }
      s = beginDrag(s, it.uid)
      const res = endDrag(s, POT.cx, POT.cy, 0, 1)
      expect(res.event).toBe('throw-in')
      s = res.state
    }
    expect(s.items.filter((i) => i.place === 'pot').length).toBe(2)
    const next = desk[2]!
    s = {
      ...s,
      items: s.items.map((x) => (x.uid === next.uid ? { ...x, shell: 0 } : x)),
    }
    s = beginDrag(s, next.uid)
    const blocked = endDrag(s, POT.cx, POT.cy, 0, 1)
    expect(blocked.event).toBe('pot-full')
    expect(blocked.state.items.find((i) => i.uid === next.uid)?.place).toBe('desk')
  })

  it('shell requires two throws to enter pot', () => {
    let s = startShift(5)
    const target = s.items[0]!
    s = {
      ...s,
      items: s.items.map((x) =>
        x.uid === target.uid ? { ...x, shell: 1, place: 'desk', roam: false } : x,
      ),
    }
    s = beginDrag(s, target.uid)
    const crack = endDrag(s, POT.cx, POT.cy, 0, 1)
    expect(crack.event).toBe('crack')
    expect(crack.state.items.find((i) => i.uid === target.uid)?.shell).toBe(0)
    expect(crack.state.items.find((i) => i.uid === target.uid)?.place).toBe('desk')

    s = beginDrag(crack.state, target.uid)
    const inn = endDrag(s, POT.cx, POT.cy, 0, 1)
    expect(inn.event).toBe('throw-in')
    expect(inn.state.items.find((i) => i.uid === target.uid)?.place).toBe('pot')
  })

  it('same-type in pot cooks faster than mixed', () => {
    let mixed = createSim({ ...LEVEL_SHIFT, potCap: 4, spawnEveryMs: 99999 }, 2)
    // 手工两锅：一类两同，一类不同
    mixed.items = [
      {
        uid: 'a1',
        type: 'dingtalk',
        x: POT.cx,
        y: POT.cy,
        vx: 0,
        vy: 0,
        r: 28,
        place: 'pot',
        cook: 0.1,
        wobble: 0,
        shell: 0,
        roam: false,
        boss: false,
      },
      {
        uid: 'a2',
        type: 'dingtalk',
        x: POT.cx,
        y: POT.cy,
        vx: 0,
        vy: 0,
        r: 28,
        place: 'pot',
        cook: 0.1,
        wobble: 0,
        shell: 0,
        roam: false,
        boss: false,
      },
    ]
    const afterSame = tapPot(mixed)
    const sameCook = afterSame.items.find((i) => i.uid === 'a1')!.cook

    let diff = createSim({ ...LEVEL_SHIFT, potCap: 4, spawnEveryMs: 99999 }, 3)
    diff.items = [
      {
        uid: 'b1',
        type: 'dingtalk',
        x: POT.cx,
        y: POT.cy,
        vx: 0,
        vy: 0,
        r: 28,
        place: 'pot',
        cook: 0.1,
        wobble: 0,
        shell: 0,
        roam: false,
        boss: false,
      },
      {
        uid: 'b2',
        type: 'kpi',
        x: POT.cx,
        y: POT.cy,
        vx: 0,
        vy: 0,
        r: 28,
        place: 'pot',
        cook: 0.1,
        wobble: 0,
        shell: 0,
        roam: false,
        boss: false,
      },
    ]
    const afterDiff = tapPot(diff)
    const diffCook = afterDiff.items.find((i) => i.uid === 'b1')!.cook
    expect(sameCook).toBeGreaterThan(diffCook)
  })
})
