/**
 * Pure helper: `windowToRange` resolves a `BJJDashboardWindow` preset to the
 * explicit `{ start, end, workoutLimit }` the dashboard sends to the RPC.
 *
 * PRD \u00a76.2: 4 presets \u2014 `7d` / `30d` / `90d` / `10r`. The first three are
 * date ranges; `10r` is a "last N workouts with \u22651 confirmed roll" window
 * (resolved server-side in `bjj_dashboard_data`, no date range needed).
 *
 * The helper is the client-side mirror of the SQL resolution; it lets the
 * dashboard render a subtitle like "May 13 \u2013 Jun 12" without an extra
 * round trip. The RPC still re-validates the window.
 *
 * Refs: REQ-BD2 (time window filter), design \u00a73.4 (window resolution).
 */

import type { BJJPositionKey } from '../../bjj.schema'

/** The 4 time-window presets the dashboard exposes. */
export type BJJDashboardWindow = '7d' | '30d' | '90d' | '10r'

export interface DashboardWindowRange {
  /** Start date (UTC midnight), or null for the "10r" workout-limit window. */
  start: Date | null
  /** End date (UTC midnight, today), or null for "10r". */
  end: Date | null
  /** Number of workouts to look back (only set for "10r"). */
  workoutLimit?: number
}

const DAY_MS = 24 * 60 * 60 * 1000

function toUtcMidnight(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

function daysAgoFromNow(n: number, now: Date): Date {
  return toUtcMidnight(new Date(now.getTime() - n * DAY_MS))
}

/**
 * Resolves a window preset to an explicit range.
 *
 * Throws on an unknown window \u2014 the caller (DashboardTimeFilter) only ever
 * passes the 4 typed presets, but the helper is strict so that any drift
 * from the RPC's window vocabulary surfaces as a test failure, not a
 * silent UI bug.
 */
export function windowToRange(
  window: BJJDashboardWindow,
  now: Date,
): DashboardWindowRange {
  switch (window) {
    case '7d':
      return { start: daysAgoFromNow(7, now), end: toUtcMidnight(now) }
    case '30d':
      return { start: daysAgoFromNow(30, now), end: toUtcMidnight(now) }
    case '90d':
      return { start: daysAgoFromNow(90, now), end: toUtcMidnight(now) }
    case '10r':
      return { start: null, end: null, workoutLimit: 10 }
    default: {
      // Exhaustiveness guard. If a new preset is added to BJJDashboardWindow
      // the switch above must be updated; TS will fail the build here.
      const _exhaustive: never = window
      throw new Error(`Unknown dashboard window preset: ${_exhaustive as string}`)
    }
  }
}

/**
 * Re-export the position-key type from the bjj schema so consumers can
 * import everything dashboard-related from one place if they want.
 *
 * The re-export is intentional: the dashboard folder is a "screaming
 * architecture" surface (its name announces the domain), and consumers
 * of the helper benefit from a single import line.
 */
export type { BJJPositionKey }
