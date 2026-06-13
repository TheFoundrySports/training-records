/**
 * RED tests for `useDashboardColorScheme`.
 *
 * The hook is the **seam** the deferred `theme-context-unified` follow-up
 * will swap (design \u00a79). For the MVP, it follows
 * `prefers-color-scheme: dark` via `matchMedia` and returns
 * `'light' | 'dark'`. PR 4's `createDashboardTheme(mode)` consumes the
 * hook's return value.
 *
 * Refs: REQ-BD7 (system color scheme only for MVP), design \u00a79 (shim).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDashboardColorScheme } from '../../useDashboardColorScheme'

// Minimal matchMedia shim that satisfies the hook's contract.
// The setup file already provides a default no-op matchMedia, but we
// need control over `matches` and the change-event dispatch for tests.
type Listener = (e: { matches: boolean; media: string }) => void

interface FakeMediaQueryList {
  matches: boolean
  media: string
  onchange: null
  addEventListener: (event: 'change', cb: Listener) => void
  removeEventListener: (event: 'change', cb: Listener) => void
  dispatchEvent: (event: { matches: boolean }) => void
  addListener: (cb: Listener) => void
  removeListener: (cb: Listener) => void
}

function installMatchMedia(initialMatches: boolean) {
  const listeners = new Set<Listener>()
  const mql: FakeMediaQueryList = {
    matches: initialMatches,
    media: '(prefers-color-scheme: dark)',
    onchange: null,
    addEventListener: (_event, cb) => listeners.add(cb),
    removeEventListener: (_event, cb) => listeners.delete(cb),
    dispatchEvent: (event) => {
      mql.matches = event.matches
      listeners.forEach((l) => l({ matches: event.matches, media: mql.media }))
    },
    addListener: (cb) => listeners.add(cb),
    removeListener: (cb) => listeners.delete(cb),
  }
  // The hook calls window.matchMedia on mount. We need to set the global
  // BEFORE renderHook \u2014 so we wrap renderHook in a helper.
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation(() => mql),
  })
  return mql
}

describe('useDashboardColorScheme \u2014 the deferred-theme-context seam (REQ-BD7)', () => {
  let mql: FakeMediaQueryList
  beforeEach(() => {
    mql = installMatchMedia(false)
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns "light" when prefers-color-scheme is light', () => {
    mql.matches = false
    const { result } = renderHook(() => useDashboardColorScheme())
    expect(result.current).toBe('light')
  })

  it('returns "dark" when prefers-color-scheme is dark', () => {
    mql.matches = true
    const { result } = renderHook(() => useDashboardColorScheme())
    expect(result.current).toBe('dark')
  })

  it('updates when the matchMedia change event fires', () => {
    const { result } = renderHook(() => useDashboardColorScheme())
    expect(result.current).toBe('light')
    act(() => {
      mql.dispatchEvent({ matches: true })
    })
    expect(result.current).toBe('dark')
    act(() => {
      mql.dispatchEvent({ matches: false })
    })
    expect(result.current).toBe('light')
  })

  it('subscribes exactly once on mount and unsubscribes on unmount', () => {
    const addSpy = vi.spyOn(mql, 'addEventListener')
    const removeSpy = vi.spyOn(mql, 'removeEventListener')
    const { unmount } = renderHook(() => useDashboardColorScheme())
    expect(addSpy).toHaveBeenCalledTimes(1)
    unmount()
    expect(removeSpy).toHaveBeenCalledTimes(1)
  })
})
