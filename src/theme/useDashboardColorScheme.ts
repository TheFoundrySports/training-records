/**
 * `useDashboardColorScheme` \u2014 MVP theme shim.
 *
 * The deferred `theme-context-unified` follow-up will REPLACE this hook's
 * body with a `useContext(ThemeContext)` call returning the resolved
 * `'light' | 'dark'`. This file is the **single seam** the follow-up
 * touches; every consumer (`BJJDashboardPage` \u2192 `createDashboardTheme(mode)`)
 * stays unchanged.
 *
 * For the MVP we follow the user's `prefers-color-scheme` setting via
 * `matchMedia`. There is no in-app toggle, no `localStorage` `theme` key,
 * and no shadcn `<html class="dark">` write \u2014 those are all in
 * `theme-context-unified` (design \u00a79, tasks \u00a7"Out-of-scope: theme-context-unified").
 *
 * The hook:
 *  - reads `matchMedia('(prefers-color-scheme: dark)')` synchronously on
 *    first render so the dashboard doesn't flash the wrong palette;
 *  - subscribes to `change` events and updates state;
 *  - cleans up the listener on unmount.
 *
 * Refs: REQ-BD7 (system color scheme only for MVP), design \u00a79 (shim).
 */
import { useEffect, useState } from 'react'

export type DashboardColorScheme = 'light' | 'dark'

function readInitialScheme(): DashboardColorScheme {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'light'
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/**
 * Returns the active dashboard color scheme as `'light' | 'dark'`.
 *
 * MVP: derives from `prefers-color-scheme` only.
 * Follow-up: replaced with `useContext(ThemeContext)` in
 * `theme-context-unified`. See `docs/adr/0007-bjj-dashboard-mui-scoping.md`.
 */
export function useDashboardColorScheme(): DashboardColorScheme {
  const [scheme, setScheme] = useState<DashboardColorScheme>(readInitialScheme)

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return
    }
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => {
      setScheme(e.matches ? 'dark' : 'light')
    }
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  return scheme
}
