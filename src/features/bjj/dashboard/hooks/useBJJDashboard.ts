/**
 * `useBJJDashboard(window)` \u2014 the dashboard's single data hook.
 *
 * Wraps `bjj_dashboard_data(p_window)` RPC (PR 1, migration
 * `20260612000004_bjj_dashboard_rpc.sql`) with React Query. The hook:
 *  - calls `supabase.rpc('bjj_dashboard_data', { p_window: window })`
 *  - uses `bjjDashboardKeys.list(window)` as its query key so
 *    `invalidateQueries({ queryKey: bjjDashboardKeys.lists() })` from
 *    PR 7's `useConfirmRolls` and PR 8's banner refresh hit it
 *  - sets `staleTime: 60_000` (REQ: 60s \u2014 the global queryClient default
 *    is 5min, but the dashboard refreshes more eagerly because the
 *    user's rolls change every workout)
 *  - normalizes the RPC payload via `normalizeBJJDashboardData` so widgets
 *    always receive `{ rows }`, `role`, `outcome`, and position keys even
 *    when an older migration revision returns legacy field names
 *
 * Why no Zod parse at the hook boundary:
 *  - The RPC is the source of truth; if a future PR tightens the SQL
 *    response, this hook returns the raw payload unchanged and the
 *    widget tests (which own the consumer contract) catch drift.
 *  - Per design \u00a77, the dashboard widget tests assert on structural
 *    shape; a Zod layer here would only duplicate the DB's contract.
 *
 * Refs: REQ-BD3 (response shape), REQ-BD5 (empty/loading states),
 * design \u00a77 (data fetching).
 */
import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { BJJDashboardData } from '../types/dashboard.types'
import { normalizeBJJDashboardData } from '../utils/normalizeBJJDashboardData'
import { bjjDashboardKeys } from './bjjDashboardKeys'

/** 60-second staleTime: dashboard reflects workout activity within a minute. */
const DASHBOARD_STALE_TIME_MS = 60_000

/**
 * Fetch the full BJJDashboardData payload for the given window preset.
 *
 * Throws a plain `Error` on PostgREST failure so React Query marks the
 * query errored and the widget's ErrorBoundary can render the failure
 * state with the message.
 */
async function fetchBJJDashboard(window: BJJDashboardData['window']): Promise<BJJDashboardData> {
  const { data, error } = await supabase.rpc('bjj_dashboard_data', {
    p_window: window,
  })

  if (error) {
    throw new Error(error.message || 'Failed to load dashboard data')
  }

  return normalizeBJJDashboardData(data)
}

/**
 * Read the dashboard data for the given window preset.
 *
 * Returns the standard React Query result: `data`, `isLoading`, `error`,
 * `refetch`. Widgets pass the `data` prop to their renderer; the page
 * wires `refetch` to the Refresh button via `invalidateQueries`.
 */
export function useBJJDashboard(
  window: BJJDashboardData['window'],
): UseQueryResult<BJJDashboardData, Error> {
  return useQuery<BJJDashboardData, Error>({
    queryKey: bjjDashboardKeys.list(window),
    queryFn: () => fetchBJJDashboard(window),
    staleTime: DASHBOARD_STALE_TIME_MS,
  })
}