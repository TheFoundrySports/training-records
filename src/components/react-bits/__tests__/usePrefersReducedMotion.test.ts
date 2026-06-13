/**
 * RED tests for `usePrefersReducedMotion`.
 *
 * The hook is consumed by all 3 React Bits components
 * (CountUp / FadeContent / AnimatedContent). When the user has
 * `prefers-reduced-motion: reduce` set, the components render the
 * static fallback (no animation, no layout shift \u2014 REQ-BD9).
 *
 * The hook follows the same pattern as `useDashboardColorScheme`:
 * matchMedia on mount, subscribe to change events, return boolean.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePrefersReducedMotion } from '../usePrefersReducedMotion'

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
    media: '(prefers-reduced-motion: reduce)',
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
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation(() => mql),
  })
  return mql
}

describe('usePrefersReducedMotion (REQ-BD9)', () => {
  let mql: FakeMediaQueryList
  beforeEach(() => {
    mql = installMatchMedia(false)
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns false when reduced-motion is not preferred', () => {
    mql.matches = false
    const { result } = renderHook(() => usePrefersReducedMotion())
    expect(result.current).toBe(false)
  })

  it('returns true when reduced-motion is preferred', () => {
    mql.matches = true
    const { result } = renderHook(() => usePrefersReducedMotion())
    expect(result.current).toBe(true)
  })

  it('updates when the matchMedia change event fires', () => {
    const { result } = renderHook(() => usePrefersReducedMotion())
    expect(result.current).toBe(false)
    act(() => {
      mql.dispatchEvent({ matches: true })
    })
    expect(result.current).toBe(true)
    act(() => {
      mql.dispatchEvent({ matches: false })
    })
    expect(result.current).toBe(false)
  })

  it('subscribes once and unsubscribes on unmount', () => {
    const addSpy = vi.spyOn(mql, 'addEventListener')
    const removeSpy = vi.spyOn(mql, 'removeEventListener')
    const { unmount } = renderHook(() => usePrefersReducedMotion())
    expect(addSpy).toHaveBeenCalledTimes(1)
    unmount()
    expect(removeSpy).toHaveBeenCalledTimes(1)
  })
})
