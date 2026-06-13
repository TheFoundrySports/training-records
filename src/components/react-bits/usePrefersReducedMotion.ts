/**
 * `usePrefersReducedMotion` \u2014 single source of truth for the
 * `prefers-reduced-motion: reduce` media query.
 *
 * Consumed by every React Bits component on the dashboard
 * (CountUp, FadeContent, AnimatedContent). When the user has
 * reduced motion set, the components render their static fallback
 * (no animation, no layout shift \u2014 REQ-BD9).
 *
 * Why a single shared hook:
 *  - The `matchMedia` subscription is a side effect; centralizing it
 *    here keeps the React Bits components pure (just a boolean
 *    check at the top of the body).
 *  - Tests can stub `window.matchMedia` once and exercise all 3
 *    components without per-test boilerplate.
 */
import { useEffect, useState } from 'react'

function readInitial(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Returns `true` when the user has reduced motion set.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(readInitial)

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return
    }
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  return reduced
}
