/**
 * RED tests for `bjjDashboardKeys` — typed React Query key factory.
 *
 * Per TanStack Query convention, the factory groups all keys under a
 * `['bjj-dashboard', ...]` namespace so a single `invalidateQueries({
 * queryKey: bjjDashboardKeys.all })` invalidates every dependent query
 * (dashboard widgets, unconfirmed-sparring-count banner, etc.).
 *
 * Contract (REQ-BD3):
 *   bjjDashboardKeys.all             -> ['bjj-dashboard']
 *   bjjDashboardKeys.lists()         -> ['bjj-dashboard', 'list']
 *   bjjDashboardKeys.list('30d')     -> ['bjj-dashboard', 'list', '30d']
 *   bjjDashboardKeys.list('10r')     -> ['bjj-dashboard', 'list', '10r']
 *
 * The factory is the single source of truth for query keys — `useBJJDashboard`
 * and the future `useUnconfirmedSparringCount` (PR 8) both import it.
 */
import { describe, it, expect } from 'vitest'
import { bjjDashboardKeys } from '../../hooks/bjjDashboardKeys'

describe('bjjDashboardKeys \u2014 typed query key factory (REQ-BD3)', () => {
  it('all is the root namespace', () => {
    expect(bjjDashboardKeys.all).toEqual(['bjj-dashboard'])
  })

  it('lists() is the lists branch without a specific window', () => {
    expect(bjjDashboardKeys.lists()).toEqual(['bjj-dashboard', 'list'])
  })

  it('list(window) appends the window to the lists branch', () => {
    expect(bjjDashboardKeys.list('7d')).toEqual(['bjj-dashboard', 'list', '7d'])
    expect(bjjDashboardKeys.list('30d')).toEqual(['bjj-dashboard', 'list', '30d'])
    expect(bjjDashboardKeys.list('90d')).toEqual(['bjj-dashboard', 'list', '90d'])
    expect(bjjDashboardKeys.list('10r')).toEqual(['bjj-dashboard', 'list', '10r'])
  })

  it('list(window) keys are children of lists() (prefix match for invalidation)', () => {
    const listKey = bjjDashboardKeys.list('30d')
    const listsKey = bjjDashboardKeys.lists()
    // TanStack's default `queryKeyFilter` matches by exact array equality.
    // The factory's contract is that `list(...)` keys start with `lists()`
    // so an invalidate-by-prefix hits them.
    expect(listKey.slice(0, listsKey.length)).toEqual(listsKey)
  })

  it('list(window) keys are children of all (full invalidation scope)', () => {
    expect(bjjDashboardKeys.list('30d')[0]).toBe(bjjDashboardKeys.all[0])
  })
})