/**
 * RED tests for `bjjDashboardKeys.positions()` — the query-key factory
 * branch for the `bjj_positions` lookup query used by the dashboard.
 *
 * Contract:
 *   bjjDashboardKeys.positions()  -> ['bjj-dashboard', 'positions']
 *
 * Why a sibling branch under `bjjDashboardKeys` (not a separate factory):
 *   - The dashboard subtree is the only consumer of `bjj_positions` today;
 *     `useConfirmRolls` (PR 7) and `RollReviewPanel` (PR 7) read positions
 *     for their form selects. Putting `positions()` under the same `all`
 *     namespace means a single `invalidateQueries({ queryKey:
 *     bjjDashboardKeys.all })` refreshes the dashboard + position lookup
 *     together — no orphan stale cache.
 *   - This matches the design.md §7.4 contract literally (the design calls
 *     `bjjDashboardKeys.positions()` directly).
 */
import { describe, it, expect } from 'vitest'
import { bjjDashboardKeys } from '../../hooks/bjjDashboardKeys'

describe('bjjDashboardKeys.positions() — bjj_positions lookup branch (REQ-PV5, REQ-PV6)', () => {
  it('positions() returns the static lookup key (no args)', () => {
    expect(bjjDashboardKeys.positions()).toEqual(['bjj-dashboard', 'positions'])
  })

  it('positions() is a child of all (full invalidation scope)', () => {
    expect(bjjDashboardKeys.positions()[0]).toBe(bjjDashboardKeys.all[0])
  })

  it('positions() is a sibling of lists() (independent query slot)', () => {
    // The two branches must NOT overlap — list(window) keys are distinct
    // from positions() keys, so per-query invalidation doesn't cross-fire.
    expect(bjjDashboardKeys.positions()).not.toEqual(bjjDashboardKeys.lists())
    expect(bjjDashboardKeys.positions()).not.toEqual(['bjj-dashboard', 'list'])
  })
})
