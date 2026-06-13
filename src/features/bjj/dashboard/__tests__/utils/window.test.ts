/**
 * RED tests for `windowToRange` — preset → date range resolver.
 *
 * PRD §6.2: time-window filter (4 presets). The dashboard sends the
 * `BJJDashboardWindow` (`'7d' | '30d' | '90d' | '10r'`) to the RPC; this
 * pure helper is what the client uses to compute the explicit
 * `{ start, end, workoutLimit }` for the RPC. The RPC itself also resolves
 * the window, but having a client-side helper means the dashboard can show
 * "Today - 7d" in the subtitle without an extra round trip.
 *
 * Failure mode: any of these failing means the resolver returns the wrong
 * shape, throws on a valid window, or accepts an invalid window.
 *
 * Refs: REQ-BD2 (time window filter), design §3.4 (window resolution).
 */
import { describe, it, expect } from 'vitest'
import { windowToRange } from '../window'

// Fixed "now" to make date math deterministic across CI timezones
const NOW = new Date('2026-06-12T12:00:00.000Z')

function daysAgo(n: number, from: Date = NOW): Date {
  const d = new Date(from)
  d.setUTCDate(d.getUTCDate() - n)
  // Truncate to midnight UTC for date-range semantics
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

function todayUtc(from: Date = NOW): Date {
  return new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()))
}

describe('windowToRange — preset → date range resolver (REQ-BD2)', () => {
  it('resolves "7d" to a 7-day window ending today', () => {
    const result = windowToRange('7d', NOW)
    expect(result).toEqual({
      start: daysAgo(7),
      end: todayUtc(),
      workoutLimit: undefined,
    })
  })

  it('resolves "30d" to a 30-day window ending today (default)', () => {
    const result = windowToRange('30d', NOW)
    expect(result).toEqual({
      start: daysAgo(30),
      end: todayUtc(),
      workoutLimit: undefined,
    })
  })

  it('resolves "90d" to a 90-day window ending today', () => {
    const result = windowToRange('90d', NOW)
    expect(result).toEqual({
      start: daysAgo(90),
      end: todayUtc(),
      workoutLimit: undefined,
    })
  })

  it('resolves "10r" to a last-10-workouts window with no date range', () => {
    const result = windowToRange('10r', NOW)
    expect(result).toEqual({
      start: null,
      end: null,
      workoutLimit: 10,
    })
  })

  it('throws on an unknown window string', () => {
    expect(() => windowToRange('invalid' as never, NOW)).toThrow(/invalid|window/i)
    expect(() => windowToRange('' as never, NOW)).toThrow()
  })
})
