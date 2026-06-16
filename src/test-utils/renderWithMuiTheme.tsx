/**
 * \`renderWithMuiTheme\` \u2014 the SINGLE entry point for theme-aware RTL
 * renders in the dashboard test suite (PR 5+ widget tests).
 *
 * Wraps \`@testing-library/react\`'s \`render\` in
 * \`<ThemeProvider theme={createDashboardTheme(mode)}>\` and installs
 * a \`matchMedia\` stub for the prefers-reduced-motion and
 * prefers-color-scheme media queries so hooks like
 * \`usePrefersReducedMotion\` and \`useDashboardColorScheme\` don't fire
 * real listeners during a test.
 *
 * Usage:
 *
 *   import { renderWithMuiTheme, cleanup } from '@/test-utils/renderWithMuiTheme'
 *
 *   it('renders the widget', () => {
 *     renderWithMuiTheme(<MyWidget />, { mode: 'dark' })
 *     expect(screen.getByText('...')).toBeInTheDocument()
 *   })
 *
 *   afterEach(() => {
 *     cleanup() // RTL's \`cleanup\` \u2014 unmounts the last render
 *   })
 *
 * The \`cleanup\` re-export lets a test file import both \`renderWithMuiTheme\`
 * and \`cleanup\` from the same path. RTL's \`cleanup\` is a no-op outside
 * a test that called \`render\`, so it's safe to call unconditionally in
 * \`afterEach\`.
 *
 * Why a per-render matchMedia stub (and not a module-level singleton):
 *  - The \`mode\` and \`prefersReducedMotion\` options change the stub's
 *    behavior, so the stub must be installed per-call.
 *  - A module-level singleton would force a single mode across all
 *    tests in the worker, which breaks the dark-mode + light-mode
 *    test files.
 *  - Tests that need a different stub (e.g. the
 *    \`useDashboardColorScheme\` tests that drive \`change\` events)
 *    can \`vi.spyOn(window, 'matchMedia').mockImplementation(...)\` to
 *    override \u2014 \`vi.spyOn\` replaces the function reference and so
 *    wins regardless of what we installed here.
 *
 * Refs: design.md \u00a78 (MUI coexistence \u2014 the dashboard subtree is
 * the only place MUI's ThemeProvider mounts; tests need the same
 * wiring), \u00a79 (theme shim).
 */
import type { ReactElement } from 'react'
import { ThemeProvider } from '@mui/material/styles'
import { render, cleanup, type RenderResult } from '@testing-library/react'

import { createDashboardTheme } from '@/features/bjj/dashboard/theme/mui-dashboard-theme'

export interface RenderWithMuiThemeOptions {
  /** Palette mode passed to \`createDashboardTheme\`. Default: 'light'. */
  mode?: 'light' | 'dark'
  /**
   * If true, the \`(prefers-reduced-motion: reduce)\` query reports
   * \`matches: true\` so the React Bits components render their static
   * fallback (and the \`usePrefersReducedMotion\` hook returns true).
   * Default: false.
   */
  prefersReducedMotion?: boolean
}

const PREFERS_REDUCED_MOTION = '(prefers-reduced-motion: reduce)'
const PREFERS_COLOR_SCHEME_DARK = '(prefers-color-scheme: dark)'

/**
 * Build a default `MediaQueryList` for a given query. The `matches`
 * value is `false` for unknown queries; the reduce / color-scheme
 * queries are answered from the explicit flags.
 */
function buildDefaultMql(
  query: string,
  prefersReducedMotion: boolean,
  mode: 'light' | 'dark',
): MediaQueryList {
  let matches = false
  if (query === PREFERS_REDUCED_MOTION) {
    matches = prefersReducedMotion
  } else if (query === PREFERS_COLOR_SCHEME_DARK) {
    matches = mode === 'dark'
  }
  return {
    matches,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  } as MediaQueryList
}

// Module-eval: install a default `window.matchMedia` if the host
// doesn't have one. jsdom does not implement `matchMedia` by default,
// so a test that does `vi.spyOn(window, 'matchMedia')` would fail
// with "can only spy on a function. Received undefined." The default
// is a stable baseline: tests can still override it via `vi.spyOn`,
// and non-MUI tests are unaffected (the default just returns a
// valid no-op MediaQueryList for any query).
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  window.matchMedia = (query: string): MediaQueryList =>
    buildDefaultMql(query, false, 'light')
}

/**
 * Render a React element inside a ThemeProvider with the dashboard
 * theme, with a \`matchMedia\` stub in place for the two media queries
 * the dashboard hooks listen to. Returns the standard
 * \`@testing-library/react\` \`RenderResult\`.
 */
export function renderWithMuiTheme(
  ui: ReactElement,
  options: RenderWithMuiThemeOptions = {},
): RenderResult {
  const { mode = 'light', prefersReducedMotion = false } = options

  // Install a matchMedia stub. We WRAP the existing function (rather
  // than replace it) so a test's `vi.spyOn(window, 'matchMedia')` still
  // records calls and returns its own implementation. If the existing
  // function returns a valid MediaQueryList (the test's stub), we use
  // it. Otherwise (the default installed at module-eval), we build a
  // per-call default with the right `matches` for the two media queries
  // the dashboard hooks listen to.
  const originalMatchMedia = window.matchMedia
  window.matchMedia = (query: string): MediaQueryList => {
    const result = originalMatchMedia.call(window, query) as MediaQueryList | undefined
    if (result && typeof result.addEventListener === 'function') {
      return result
    }
    return buildDefaultMql(query, prefersReducedMotion, mode)
  }

  try {
    // Pre-warm the stub: explicitly query the two media queries the
    // dashboard hooks listen to, so tests that `vi.spyOn(window, 'matchMedia')`
    // can observe the util registering them. The dashboard components
    // (e.g. `useDashboardColorScheme`, `usePrefersReducedMotion`) will
    // also call these at render time; the pre-warm just makes the
    // stub's contract visible to spies on the plain `<div />` case.
    void window.matchMedia(PREFERS_REDUCED_MOTION)
    void window.matchMedia(PREFERS_COLOR_SCHEME_DARK)

    const theme = createDashboardTheme(mode)
    return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>)
  } finally {
    // Restore after render returns. RTL's render is synchronous; any
    // useEffect that reads matchMedia fires inside the `act` that
    // wraps the render, so the stub is in place for the entire mount.
    window.matchMedia = originalMatchMedia
  }
}

// Re-export \`cleanup\` from @testing-library/react so a test can do:
//   import { renderWithMuiTheme, cleanup } from '@/test-utils/renderWithMuiTheme'
// without a second import.
export { cleanup }
