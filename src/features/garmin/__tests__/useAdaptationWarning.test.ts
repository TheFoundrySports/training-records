import { describe, it, expect } from 'vitest'
import { addHours } from 'date-fns'
import { useAdaptationWarning } from '../hooks/useAdaptationWarning'

/**
 * useAdaptationWarning is a pure function (no React state) — tested directly.
 */

const BASE_DATE = '2026-04-10T08:00:00.000Z'

describe('useAdaptationWarning', () => {
  it('returns null when recoveryTimeHours is null', () => {
    const result = useAdaptationWarning(null, BASE_DATE, '2026-04-11T08:00:00.000Z')
    expect(result).toBeNull()
  })

  it('returns null when nextWorkoutPerformedAt is null', () => {
    const result = useAdaptationWarning(24, BASE_DATE, null)
    expect(result).toBeNull()
  })

  it('returns a warning string when next workout is within the recovery window', () => {
    // Recovery ends 24h after BASE_DATE → 2026-04-11T08:00:00.000Z
    // Next workout is 12h later → still within window
    const nextWorkout = addHours(new Date(BASE_DATE), 12).toISOString()
    const result = useAdaptationWarning(24, BASE_DATE, nextWorkout)
    expect(result).not.toBeNull()
    expect(typeof result).toBe('string')
    expect(result!.length).toBeGreaterThan(0)
  })

  it('returns null when next workout is exactly at the recovery end boundary', () => {
    // Recovery ends exactly 24h after BASE_DATE
    const nextWorkout = addHours(new Date(BASE_DATE), 24).toISOString()
    const result = useAdaptationWarning(24, BASE_DATE, nextWorkout)
    // nextWorkoutDate === recoveryEndsAt → NOT strictly less than → no warning
    expect(result).toBeNull()
  })

  it('returns null when next workout is after the recovery window ends', () => {
    // Recovery ends 24h after BASE_DATE; next workout is 48h later
    const nextWorkout = addHours(new Date(BASE_DATE), 48).toISOString()
    const result = useAdaptationWarning(24, BASE_DATE, nextWorkout)
    expect(result).toBeNull()
  })

  it('returns a warning for a very large recovery time when next workout is 24h away', () => {
    // 168h (1 week) recovery window, next workout only 24h later → inside window
    const nextWorkout = addHours(new Date(BASE_DATE), 24).toISOString()
    const result = useAdaptationWarning(168, BASE_DATE, nextWorkout)
    expect(result).not.toBeNull()
  })

  it('returns null when both recoveryTimeHours and nextWorkoutPerformedAt are null', () => {
    const result = useAdaptationWarning(null, BASE_DATE, null)
    expect(result).toBeNull()
  })

  it('returns warning message matching the expected text', () => {
    const nextWorkout = addHours(new Date(BASE_DATE), 1).toISOString()
    const result = useAdaptationWarning(48, BASE_DATE, nextWorkout)
    expect(result).toMatch(/recovery window/i)
  })
})
