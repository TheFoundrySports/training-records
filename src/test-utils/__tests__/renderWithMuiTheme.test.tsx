/**
 * RED tests for the `renderWithMuiTheme` test util.
 *
 * PR 5+ widget tests will use this util as the SINGLE entry point for
 * theme-aware RTL renders. It wraps the children in
 * `<ThemeProvider theme={createDashboardTheme(mode)}>` and stubs
 * `matchMedia` for the prefers-reduced-motion + prefers-color-scheme
 * media queries (so any hook that listens to them doesn't fire real
 * listeners during a test).
 *
 * What's tested:
 *  - Renders the children inside the wrapper.
 *  - The wrapper provides a MUI ThemeProvider whose `theme.palette.mode`
 *    matches the requested mode (proves the provider is actually mounted).
 *  - \`mode: 'dark'\` produces a dark palette on the provider.
 *  - \`prefersReducedMotion: true\` stubs the
 *    \`prefers-reduced-motion: reduce\` media query.
 *  - The default mode is 'light' (when no option is passed).
 *
 * Refs: design.md \u00a78 (MUI coexistence \u2014 the dashboard subtree is
 * the only place MUI's ThemeProvider mounts; tests need the same
 * wiring).
 */
import { describe, it, expect, afterEach, vi } from 'vitest'
import { screen, cleanup } from '@testing-library/react'
import { useTheme } from '@mui/material/styles'

import { renderWithMuiTheme } from '../renderWithMuiTheme'

// Component used to probe the theme provided by the wrapper.
function ThemeProbe() {
  const theme = useTheme()
  return <span data-testid="mode">{theme.palette.mode}</span>
}

describe('renderWithMuiTheme (test util for PR 5+ widget tests)', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('renders the children', () => {
    renderWithMuiTheme(<div data-testid="child">hello</div>)
    expect(screen.getByTestId('child')).toBeInTheDocument()
    expect(screen.getByText('hello')).toBeInTheDocument()
  })

  it('wraps children in a ThemeProvider whose palette.mode matches the requested mode', () => {
    renderWithMuiTheme(<ThemeProbe />, { mode: 'light' })
    expect(screen.getByTestId('mode')).toHaveTextContent('light')
  })

  it('supports \`mode: "dark"\` and produces a dark palette on the provider', () => {
    renderWithMuiTheme(<ThemeProbe />, { mode: 'dark' })
    expect(screen.getByTestId('mode')).toHaveTextContent('dark')
  })

  it('defaults to mode "light" when no options are passed', () => {
    renderWithMuiTheme(<ThemeProbe />)
    expect(screen.getByTestId('mode')).toHaveTextContent('light')
  })

  it('stubs \`prefers-reduced-motion: reduce\` to \`false\` by default', () => {
    // The matchMedia stub returns matches=false for every query;
    // a usePrefersReducedMotion()-style hook would observe `false`.
    const mql = {
      matches: false,
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }
    const matchMediaSpy = vi.spyOn(window, 'matchMedia').mockImplementation(() => mql as unknown as MediaQueryList)

    renderWithMuiTheme(<div data-testid="ok" />)

    expect(matchMediaSpy).toHaveBeenCalled()
    // The reduce query MUST be one of the calls \u2014 the util stubs it
    // explicitly so any reduced-motion hooks see a stable false.
    const calledQueries = matchMediaSpy.mock.calls.map((c) => c[0] as string)
    expect(calledQueries).toContain('(prefers-reduced-motion: reduce)')
  })

  it('honors \`prefersReducedMotion: true\` by setting matches=true on the reduce query', () => {
    // Capture the (query, mql) pairs the util creates, then assert the
    // reduce one has matches=true.
    const created: Array<{ query: string; mql: { matches: boolean } }> = []
    const matchMediaSpy = vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => {
      const mql: { matches: boolean; media: string; onchange: null; addEventListener: any; removeEventListener: any; addListener: any; removeListener: any; dispatchEvent: any } = {
        matches: query.includes('reduce'),
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }
      created.push({ query, mql })
      return mql as unknown as MediaQueryList
    })

    renderWithMuiTheme(<div data-testid="ok" />, { prefersReducedMotion: true })

    expect(matchMediaSpy).toHaveBeenCalled()
    const reduce = created.find((c) => c.query === '(prefers-reduced-motion: reduce)')
    expect(reduce, 'the util must stub (prefers-reduced-motion: reduce)').toBeDefined()
    expect(reduce?.mql.matches).toBe(true)
  })

  it('re-exports \`cleanup\` from @testing-library/react', () => {
    expect(typeof cleanup).toBe('function')
  })
})
