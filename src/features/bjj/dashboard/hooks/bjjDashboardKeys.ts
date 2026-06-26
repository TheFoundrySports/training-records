/**
 * `bjjDashboardKeys` \u2014 typed React Query key factory for the BJJ dashboard.
 *
 * Per TanStack Query convention (https://tkdodo.eu/blog/effective-react-query-keys),
 * the factory groups every query under a `['bjj-dashboard', ...]` namespace
 * so a single `invalidateQueries({ queryKey: bjjDashboardKeys.all })` hits
 * every dependent query. The `lists()` branch is the prefix for any
 * list-shaped query (today only `list(window)`; PR 8 adds the
 * `unconfirmed-sparring-count` branch as a sibling under `all`).
 *
 * Why a factory (not inline arrays):
 *  - Centralizes the namespace string so a typo surfaces as a TS error,
 *    not as a silent cache miss in production.
 *  - Makes `invalidateQueries` calls in `useConfirmRolls` (PR 7) and
 *    `useUnconfirmedSparringCount` (PR 8) trivial: `queryKey: bjjDashboardKeys.lists()`.
 *  - The structure (`all` \u2192 `lists()` \u2192 `list(args)`) is the same
 *    pattern used by `useBJJTechniques` / `useBJJSections` elsewhere in
 *    this codebase, so reviewers see a familiar shape.
 *
 * Refs: REQ-BD3 (response shape), REQ-RE8 (roll-review invalidation),
 * design \u00a77.3 (query-key convention).
 */
import type { DashboardWindow } from '../types/dashboard.types'

export const bjjDashboardKeys = {
  /** Root namespace \u2014 invalidate-everything scope. */
  all: ['bjj-dashboard'] as const,

  /** Prefix for every list-shaped query (today: just `list(window)`). */
  lists: () => [...bjjDashboardKeys.all, 'list'] as const,

  /** The dashboard data query for a given window preset. */
  list: (window: DashboardWindow) => [...bjjDashboardKeys.lists(), window] as const,
} as const