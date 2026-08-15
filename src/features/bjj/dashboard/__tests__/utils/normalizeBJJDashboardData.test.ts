import { describe, it, expect } from 'vitest'
import { normalizeBJJDashboardData } from '../../utils/normalizeBJJDashboardData'

describe('normalizeBJJDashboardData — RPC → widget contract', () => {
  it('wraps a bare last_techniques array into { rows } with renamed fields', () => {
    const result = normalizeBJJDashboardData({
      window: '30d',
      last_techniques: [
        {
          name: 'Armbar',
          category: 'submission',
          count: 5,
          last_practiced_at: '2026-06-10T12:00:00Z',
        },
      ],
    })

    expect(result.last_techniques).toEqual({
      rows: [
        {
          technique_id: '',
          technique_name: 'Armbar',
          category: 'submission',
          last_practiced_at: '2026-06-10T12:00:00Z',
          practice_count: 5,
        },
      ],
    })
  })

  it('maps legacy role_balance and outcomes field names', () => {
    const result = normalizeBJJDashboardData({
      role_balance: {
        segments: [{ label: 'attacking', pct: 60 }],
      },
      outcomes: {
        tiles: [{ label: 'submission', pct: 40, n: 4 }],
      },
    })

    expect(result.role_balance.segments[0]).toMatchObject({
      role: 'attacking',
      pct: 60,
      count: 0,
    })
    expect(result.outcomes.tiles[0]).toMatchObject({
      outcome: 'submission',
      pct: 40,
      count: 4,
    })
  })

  it('keeps roll_flow position keys for widget label resolution', () => {
    const result = normalizeBJJDashboardData({
      total_rolls: 50,
      roll_flow: {
        total_rolls: 12,
        edges: [{ from: 'closed_guard', to: 'mount', count: 7, pct: 100 }],
      },
    })

    expect(result.roll_flow.edges[0]).toMatchObject({
      from: 'closed_guard',
      to: 'mount',
      count: 7,
      pct: 100,
      color: '#1a73e8',
    })
    expect(result.roll_flow.total_transitions).toBe(7)
    expect(result.roll_flow.total_rolls).toBe(50)
    expect(result.roll_flow.top_n).toBe(7)
  })

  it('assigns Open Design roll_flow colors by from→to pair', () => {
    const result = normalizeBJJDashboardData({
      total_rolls: 50,
      roll_flow: {
        edges: [
          { from: 'standing', to: 'closed_guard', count: 24, pct: 100 },
          { from: 'closed_guard', to: 'side_control', count: 18, pct: 75 },
          { from: 'side_control', to: 'back_control', count: 14, pct: 58 },
          { from: 'back_control', to: 'mount', count: 12, pct: 50 },
          { from: 'closed_guard', to: 'open_guard', count: 10, pct: 42 },
          { from: 'half_guard', to: 'mount', count: 9, pct: 38 },
          { from: 'side_control', to: 'mount', count: 7, pct: 29 },
        ],
      },
    })

    expect(result.roll_flow.edges.map((edge) => edge.color)).toEqual([
      '#1a73e8',
      '#1a73e8',
      '#7c3aed',
      '#188038',
      '#dc2626',
      '#d97706',
      '#7c3aed',
    ])
  })

  it('defaults missing widget arrays to empty collections', () => {
    const result = normalizeBJJDashboardData({
      window: '30d',
      last_techniques: { rows: undefined },
      technique_types: {},
      role_balance: {},
      outcomes: {},
      roll_flow: {},
    })

    expect(result.last_techniques.rows).toEqual([])
    expect(result.technique_types.segments).toEqual([])
    expect(result.role_balance.segments).toEqual([])
    expect(result.outcomes.tiles).toEqual([])
    expect(result.roll_flow.edges).toEqual([])
  })
})
