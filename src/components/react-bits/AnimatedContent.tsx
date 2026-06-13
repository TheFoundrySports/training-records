/**
 * `AnimatedContent` \u2014 React Bits variant that animates open/close on a
 * `trigger` prop.
 *
 * Source: copy-paste from [reactbits.dev](https://reactbits.dev) TS-TW
 * variant, adapted to consume `usePrefersReducedMotion()` from this
 * folder. When reduced motion is set, the children are ALWAYS mounted
 * with full opacity (the trigger prop is a no-op for the wrapper, but
 * we still respect it for the public API contract).
 *
 * Used by: `RollFlowWidget` "View all" expand (PR 6b), empty-state
 * reveal animations.
 */
import { useEffect, useState, type ReactNode } from 'react'
import { usePrefersReducedMotion } from './usePrefersReducedMotion'

export interface AnimatedContentProps {
  children: ReactNode
  /** When true, the content is in the "open" state. */
  trigger: boolean
  /** Animation duration in ms. Defaults to 300. */
  duration?: number
  /** Optional className passed to the wrapper. */
  className?: string
}

const DEFAULT_DURATION = 300

export function AnimatedContent({
  children,
  trigger,
  duration = DEFAULT_DURATION,
  className,
}: AnimatedContentProps) {
  const reduced = usePrefersReducedMotion()
  // Initial state: in reduced motion we always mount; otherwise we
  // mirror the trigger so the first paint matches the parent's
  // intent.
  const [mounted, setMounted] = useState<boolean>(reduced ? true : trigger)
  const [closing, setClosing] = useState<boolean>(false)

  useEffect(() => {
    if (reduced) {
      // Reduced motion: the wrapper is permanently visible. Trigger
      // is still a public prop, but the animation is gone.
      setMounted(true)
      setClosing(false)
      return
    }

    if (trigger) {
      setMounted(true)
      setClosing(false)
    } else {
      setClosing(true)
      const t = setTimeout(() => {
        setMounted(false)
        setClosing(false)
      }, duration)
      return () => clearTimeout(t)
    }
  }, [trigger, duration, reduced])

  if (!mounted) return null

  return (
    <div
      className={className}
      style={{
        opacity: reduced ? 1 : closing && !trigger ? 0 : 1,
        transform: reduced
          ? 'none'
          : closing && !trigger
            ? 'translateY(8px)'
            : 'translateY(0)',
        transition: reduced
          ? undefined
          : `opacity ${duration}ms ease, transform ${duration}ms ease`,
      }}
    >
      {children}
    </div>
  )
}
