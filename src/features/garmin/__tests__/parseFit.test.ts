import { describe, it, expect } from 'vitest'
import { extractMetricsFromFitSession, deriveRecoveryHours, type FitSession } from '../garmin.utils'

// ── deriveRecoveryHours ──────────────────────────────────────────────────────

describe('deriveRecoveryHours', () => {
  it('returns null when TSS is null', () => {
    expect(deriveRecoveryHours(null)).toBeNull()
  })

  it('returns null when TSS is undefined', () => {
    expect(deriveRecoveryHours(undefined)).toBeNull()
  })

  it('returns 24 for TSS < 150 (light load)', () => {
    expect(deriveRecoveryHours(0)).toBe(24)
    expect(deriveRecoveryHours(100)).toBe(24)
    expect(deriveRecoveryHours(149)).toBe(24)
  })

  it('returns 48 for TSS 150–299 (moderate load)', () => {
    expect(deriveRecoveryHours(150)).toBe(48)
    expect(deriveRecoveryHours(200)).toBe(48)
    expect(deriveRecoveryHours(299)).toBe(48)
  })

  it('returns 72 for TSS >= 300 (heavy load)', () => {
    expect(deriveRecoveryHours(300)).toBe(72)
    expect(deriveRecoveryHours(400)).toBe(72)
    expect(deriveRecoveryHours(999)).toBe(72)
  })
})

// ── extractMetricsFromFitSession ─────────────────────────────────────────────

describe('extractMetricsFromFitSession', () => {
  const fullSession: FitSession = {
    total_elapsed_time: 3600,
    avg_heart_rate: 145,
    max_heart_rate: 178,
    training_stress_score: 120,
    total_calories: 650,
    estimated_vo2_max: 52.4,
    // time_in_hr_zone in milliseconds
    time_in_hr_zone: [600_000, 900_000, 1200_000, 600_000, 300_000],
  }

  it('maps a complete FIT session to correct GarminMetrics', () => {
    const metrics = extractMetricsFromFitSession(fullSession)

    expect(metrics.elapsedTimeSeconds).toBe(3600)
    expect(metrics.avgHeartRate).toBe(145)
    expect(metrics.maxHeartRate).toBe(178)
    expect(metrics.trainingLoad).toBe(120)
    expect(metrics.calories).toBe(650)
    expect(metrics.vo2max).toBe(52.4)
  })

  it('converts time_in_hr_zone from ms to seconds', () => {
    const metrics = extractMetricsFromFitSession(fullSession)

    expect(metrics.hrZone1Seconds).toBe(600) // 600_000 / 1000
    expect(metrics.hrZone2Seconds).toBe(900) // 900_000 / 1000
    expect(metrics.hrZone3Seconds).toBe(1200) // 1_200_000 / 1000
    expect(metrics.hrZone4Seconds).toBe(600) // 600_000 / 1000
    expect(metrics.hrZone5Seconds).toBe(300) // 300_000 / 1000
  })

  it('sets zone seconds to 0 when time_in_hr_zone is absent', () => {
    const session: FitSession = { total_elapsed_time: 1800 }
    const metrics = extractMetricsFromFitSession(session)

    expect(metrics.hrZone1Seconds).toBe(0)
    expect(metrics.hrZone2Seconds).toBe(0)
    expect(metrics.hrZone3Seconds).toBe(0)
    expect(metrics.hrZone4Seconds).toBe(0)
    expect(metrics.hrZone5Seconds).toBe(0)
  })

  it('sets avgHeartRate to null when absent', () => {
    const session: FitSession = { total_elapsed_time: 1800, max_heart_rate: 160 }
    const metrics = extractMetricsFromFitSession(session)
    expect(metrics.avgHeartRate).toBeNull()
  })

  it('sets vo2max to null when estimated_vo2_max is absent', () => {
    const session: FitSession = { total_elapsed_time: 1800 }
    const metrics = extractMetricsFromFitSession(session)
    expect(metrics.vo2max).toBeNull()
  })

  it('derives recoveryTimeHours = 24 for TSS < 150', () => {
    const session: FitSession = { total_elapsed_time: 1800, training_stress_score: 100 }
    expect(extractMetricsFromFitSession(session).recoveryTimeHours).toBe(24)
  })

  it('derives recoveryTimeHours = 48 for TSS 150–299', () => {
    const session: FitSession = { total_elapsed_time: 1800, training_stress_score: 200 }
    expect(extractMetricsFromFitSession(session).recoveryTimeHours).toBe(48)
  })

  it('derives recoveryTimeHours = 72 for TSS >= 300', () => {
    const session: FitSession = { total_elapsed_time: 1800, training_stress_score: 350 }
    expect(extractMetricsFromFitSession(session).recoveryTimeHours).toBe(72)
  })

  it('sets recoveryTimeHours to null when TSS is absent', () => {
    const session: FitSession = { total_elapsed_time: 1800 }
    expect(extractMetricsFromFitSession(session).recoveryTimeHours).toBeNull()
  })

  it('sets elapsedTimeSeconds to 0 when total_elapsed_time is absent', () => {
    const session: FitSession = {}
    expect(extractMetricsFromFitSession(session).elapsedTimeSeconds).toBe(0)
  })
})
