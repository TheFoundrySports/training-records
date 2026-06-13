/**
 * `FadeContent` \u2014 React Bits variant that fades its children in on mount.
 *
 * Source: copy-paste from [reactbits.dev](https://reactbits.dev) TS-TW
 * variant, adapted to consume `usePrefersReducedMotion()` from this
 * folder. When reduced motion is set, the wrapper is rendered at full
 * opacity from the first frame (no fade, no layout shift).
 *
 * Used by: `DashboardWidgetShell` mount (PR 5), per-widget enter
 * animations.
 */
import { useEffect, useState, type ReactNode } from 'react'
import { usePrefersReducedMotion } from './usePrefersReducedMotion'

export interface FadeContentProps {
  children: ReactNode
  /** Fade duration in ms. Defaults to 400. */
  duration?: number
  /** Optional className passed to the wrapper div. */
  className?: string
}

const DEFAULT_DURATION = 400

export function FadeContent({ children, duration = DEFAULT_DURATION, className }: FadeContentProps) {
  const reduced = usePrefersReducedMotion()
  const [opacity, setOpacity] = useState(reduced ? 1 : 0)

  useEffect(() => {
    if (reduced) {
      setOpacity(1)
      return
    }
    // requestAnimationFrame so the browser paints the 0 state first,
    // then transitions to 1 (avoids the "snap" if we set both in the
    // same tick).
    const raf = requestAnimationFrame(() => setOpacity(1))
    return () => cancelAnimationFrame(raf)
  }, [reduced, duration])

  return (
    <div
      className={className}
      style={{
        opacity,
        transition: reduced ? undefined : `opacity ${duration}ms ease`,
      }}
    >
      {children}
    </div>
  )
}
