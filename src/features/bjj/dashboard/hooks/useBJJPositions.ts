/**
 * `useBJJPositions()` — the dashboard's `bjj_positions` lookup hook.
 *
 * Reads the 11 canonical rows from the `bjj_positions` table seeded in
 * PR 1's `20260612000002_bjj_positions.sql` migration. The hook:
 *  - calls `supabase.from('bjj_positions').select('*').order('display_order')`
 *  - uses `bjjDashboardKeys.positions()` as its query key so a single
 *    `invalidateQueries({ queryKey: bjjDashboardKeys.all })` refreshes
 *    the lookup alongside the dashboard data
 *  - sets `staleTime: 60 * 60 * 1000` (REQ-PV5: 1h — the lookup changes
 *    only on migration, so we cache aggressively and trust the user to
 *    refresh the page after a position migration lands)
 *  - surfaces PostgREST errors as a thrown `Error` so consumers can
 *    render the same error UX as the main dashboard
 *
 * Consumers (PR 6a+):
 *  - `TechniqueTypeWidget` — does NOT use this hook directly (the donut
 *    reads category labels from `categoryLabel()`); the hook is wired
 *    up here so PR 7's `RollReviewPanel` can plug it into the position
 *    selects without re-introducing a new query-key convention.
 *
 * Refs: REQ-PV5 (display labels), REQ-PV6 (RPC display lookup),
 * design.md §7.4.
 */
import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { bjjDashboardKeys } from './bjjDashboardKeys'
import type { BJJPositionKey } from '../../bjj.schema'

/**
 * Row shape returned by `select * from bjj_positions order by display_order`.
 * Mirrors the 4 columns of the `bjj_positions` table seeded in PR 1.
 */
export interface BJJPositionRow {
  /** Canonical key (FK target for `bjj_roll_events.position_from`). */
  key: BJJPositionKey
  /** English display label (NFR-07: dashboard renders English). */
  display_en: string
  /** Spanish display label (used by the blue-belt progression page). */
  display_es: string
  /** Render order in selects/lists (1-based, ascending). */
  display_order: number
}

/** 1-hour staleTime: the lookup changes only on migration. */
const POSITIONS_STALE_TIME_MS = 60 * 60 * 1000

/**
 * Fetch all `bjj_positions` rows in `display_order` ASC.
 *
 * Throws a plain `Error` on PostgREST failure so React Query marks the
 * query errored and consumers can render a graceful fallback.
 */
async function fetchBJJPositions(): Promise<BJJPositionRow[]> {
  const { data, error } = await supabase
    .from('bjj_positions')
    .select('*')
    .order('display_order', { ascending: true })

  if (error) {
    throw new Error(error.message || 'Failed to load bjj_positions lookup')
  }

  return (data ?? []) as BJJPositionRow[]
}

/**
 * Read the 11 canonical `bjj_positions` rows ordered by `display_order`.
 *
 * Returns the standard React Query result. Callers should pass the
 * `data` array to their renderer; failures render via the same error
 * boundary contract as `useBJJDashboard`.
 */
export function useBJJPositions(): UseQueryResult<BJJPositionRow[], Error> {
  return useQuery<BJJPositionRow[], Error>({
    queryKey: bjjDashboardKeys.positions(),
    queryFn: fetchBJJPositions,
    staleTime: POSITIONS_STALE_TIME_MS,
  })
}
