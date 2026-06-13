/**
 * RED tests for `topTransitions` — roll-flow top-N aggregation.
 *
 * The `bjj_dashboard_data` RPC returns a `roll_flow.edges[]` array. Per
 * REQ-BD3, each edge has `from`, `to`, `count`, `pct`, `color`. The
 * `pct` is **relative to the max edge in the set (100 = widest bar)**
 * per the spec comment in `dashboard.types.ts`.
 *
 * This helper is the client-side reducer: it takes a list of transitions
 * and returns the top N edges with `pct` normalized to the max.
 *
 * Failure mode: any of these failing means the normalization is wrong,
 * the top-N is off, or empty input crashes.
 *
 * Refs: REQ-BD3 (roll_flow shape), design §3.4 (pct normalization).
 */
import { describe, it, expect } from 'vitest'
import { topTransitions } from '../rollFlow'

interface RawTransition {
  from: string
  to: string
  count: number
}

describe('topTransitions — top-N edge aggregation (REQ-BD3)', () => {
  it('returns edges sorted by count desc with pct normalized to max', () => {
    const transitions: RawTransition[] = [
      { from: 'Standing', to: 'Closed guard', count: 10 },
      { from: 'Closed guard', to: 'Side control', count: 3 },
    ]
    const result = topTransitions(transitions, 7)
    expect(result).toEqual([
      { from: 'Standing', to: 'Closed guard', count: 10, pct: 100 },
      { from: 'Closed guard', to: 'Side control', count: 3, pct: 30 },
    ])
  })

  it('caps the result at topN', () => {
    const transitions: RawTransition[] = Array.from({ length: 12 }, (_, i) => ({
      from: `A${i}`,
      to: `B${i}`,
      count: 12 - i, // 12, 11, 10, ... 1
    }))
    const result = topTransitions(transitions, 5)
    expect(result).toHaveLength(5)
    expect(result[0]).toEqual({ from: 'A0', to: 'B0', count: 12, pct: 100 })
    // 5th element should be A4 with count=8; pct relative to max=12 → 8/12*100 ≈ 67
    expect(result[4].count).toBe(8)
    expect(result[4].pct).toBe(67)
  })

  it('returns an empty array for empty input (no crash)', () => {
    expect(topTransitions([], 7)).toEqual([])
  })

  it('returns pct=100 for a single edge', () => {
    const result = topTransitions([{ from: 'Mount', to: 'Back', count: 5 }], 7)
    expect(result).toEqual([{ from: 'Mount', to: 'Back', count: 5, pct: 100 }])
  })

  it('rounds pct to the nearest integer (no decimals in the UI)', () => {
    const result = topTransitions(
      [
        { from: 'A', to: 'B', count: 3 },
        { from: 'B', to: 'C', count: 1 },
      ],
      7,
    )
    // 1/3 * 100 = 33.33... → 33
    expect(result[1].pct).toBe(33)
  })
})
