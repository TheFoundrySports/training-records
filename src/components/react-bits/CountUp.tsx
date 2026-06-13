/**
 * `CountUp` \u2014 React Bits variant that animates a numeric value from 0 to
 * `value` over `duration` ms.
 *
 * Source: copy-paste from [reactbits.dev](https://reactbits.dev) TS-TW
 * variant, adapted to:
 *  - consume `usePrefersReducedMotion()` from this folder (no inline
 *    matchMedia so the test surface is single);
 *  - render the final value with no layout shift when motion is reduced;
 *  - round to integer so the dashboard's tabular-nums style doesn't
 *    show fractional values mid-animation.
 *
 * Used by: `LastTechniquesWidget` hero stat (PR 5/6a), `OutcomesWidget`
 * tile values (PR 6b).
 */
import { useEffect, useRef, useState } from 'react'
import { usePrefersReducedMotion } from './usePrefersReducedMotion'

export interface CountUpProps {
  /** The target value to animate to. */
  value: number
  /** Animation duration in ms. Defaults to 1000. */
  duration?: number
  /** Optional className passed to the rendered span. */
  className?: string
}

const DEFAULT_DURATION = 1000

export function CountUp({ value, duration = DEFAULT_DURATION, className }: CountUpProps) {
  const reduced = usePrefersReducedMotion()
  const [display, setDisplay] = useState(reduced ? value : 0)
  const rafRef = useRef<number | null>(null)
  const startRef = useRef<number | null>(null)

  useEffect(() => {
    if (reduced) {
      setDisplay(value)
      return
    }
    if (duration <= 0) {
      setDisplay(value)
      return
    }

    const tick = (now: number) => {
      if (startRef.current == null) startRef.current = now
      const elapsed = now - startRef.current
      const t = Math.min(1, elapsed / duration)
      // easeOutCubic for a softer landing
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(Math.round(value * eased))
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        setDisplay(value)
        rafRef.current = null
      }
    }
    rafRef.current = requestAnimationFrame(tick)

    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
      startRef.current = null
    }
  }, [value, duration, reduced])

  return <span className={className}>{display}</span>
}
