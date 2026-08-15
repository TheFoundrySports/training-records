import { describe, it, expect } from 'vitest'
import {
  FLOW_LANE_LIMIT,
  FLOW_STEPS,
  buildRollFlowLanes,
  composeRollFlowSummary,
  composeRollFlowTag,
} from '../../utils/buildRollFlowLanes'
import type { RollFlowData } from '../../types/dashboard.types'

const sampleData = (): RollFlowData => ({
  edges: [
    { from: 'closed_guard', to: 'mount', count: 24, pct: 100 },
    { from: 'half_guard', to: 'side_control', count: 18, pct: 75 },
    { from: 'standing', to: 'closed_guard', count: 14, pct: 58 },
    { from: 'side_control', to: 'back_control', count: 12, pct: 50 },
    { from: 'closed_guard', to: 'open_guard', count: 10, pct: 42 },
    { from: 'turtle', to: 'knee_on_belly', count: 4, pct: 17 },
  ],
  total_transitions: 6,
  total_rolls: 82,
  top_n: 7,
})

describe('buildRollFlowLanes — mat-bjj-app sequence lanes', () => {
  it('caps lanes at 5 and keeps six nodes per lane', () => {
    const lanes = buildRollFlowLanes(sampleData())
    expect(FLOW_STEPS).toHaveLength(6)
    expect(lanes).toHaveLength(FLOW_LANE_LIMIT)
    for (const lane of lanes) {
      expect(lane.nodes).toHaveLength(6)
    }
  })

  it('uses share of total rolls for the left pct and edge.pct for the bar', () => {
    const [first] = buildRollFlowLanes(sampleData())
    expect(first.pctOfRolls).toBe(29)
    expect(first.barPct).toBe(100)
    expect(first.tone).toBe('win')
    expect(first.nodes[0]).toMatchObject({ code: 'CG', label: 'Closed guard' })
    expect(first.nodes[3]).toMatchObject({ code: 'MT', kind: 'peak' })
    expect(first.nodes[4]).toMatchObject({ code: 'SUB', kind: 'peak' })
    expect(first.nodes[5]).toMatchObject({ code: 'W', kind: 'end' })
  })

  it('marks standing → guard as a mixed reset (no finish)', () => {
    const lanes = buildRollFlowLanes(sampleData())
    const standing = lanes[2]
    expect(standing.tone).toBe('mixed')
    expect(standing.nodes[4].code).toBe('RST')
    expect(standing.nodes[5].code).toBe('—')
  })

  it('returns no lanes when edges is empty', () => {
    expect(
      buildRollFlowLanes({
        edges: [],
        total_transitions: 0,
        total_rolls: 0,
        top_n: 7,
      }),
    ).toEqual([])
  })
})

describe('composeRollFlowTag / composeRollFlowSummary', () => {
  it('formats the window pill like mat-bjj-app.html', () => {
    expect(composeRollFlowTag('30d', 47)).toBe('30 días · 47 rollos')
    expect(composeRollFlowTag('10r', 10)).toBe('últimos 10 rollos')
  })

  it('summarizes the top lane as the most common finish', () => {
    const [first] = buildRollFlowLanes(sampleData())
    expect(composeRollFlowSummary(first, '30d')).toBe(
      'Mount desde Closed guard · 29% de los rollos en los últimos 30 días · tu secuencia de finalización más fuerte',
    )
  })
})
