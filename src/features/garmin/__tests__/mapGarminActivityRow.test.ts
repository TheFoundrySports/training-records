import { describe, it, expect } from 'vitest'
import { mapGarminActivityRow } from '../hooks/useGarminActivity'

const baseRow = {
  id: 'act-1',
  workout_id: 'wk-1',
  user_id: 'usr-1',
  file_path: 'uploads/1234.fit',
  elapsed_time_seconds: 3600,
  avg_heart_rate: 145,
  max_heart_rate: 178,
  training_load: 120,
  recovery_time_hours: 24,
  calories: 650,
  vo2max: 52.4,
  hr_zone_1_seconds: 600,
  hr_zone_2_seconds: 900,
  hr_zone_3_seconds: 1200,
  hr_zone_4_seconds: 600,
  hr_zone_5_seconds: 300,
  created_at: '2026-04-14T10:00:00.000Z',
  updated_at: '2026-04-14T10:05:00.000Z',
}

describe('mapGarminActivityRow', () => {
  it('maps a complete row to the correct GarminActivity shape', () => {
    const result = mapGarminActivityRow(baseRow)

    expect(result.id).toBe('act-1')
    expect(result.workoutId).toBe('wk-1')
    expect(result.userId).toBe('usr-1')
    expect(result.filePath).toBe('uploads/1234.fit')
    expect(result.createdAt).toBe('2026-04-14T10:00:00.000Z')
    expect(result.updatedAt).toBe('2026-04-14T10:05:00.000Z')

    expect(result.metrics.elapsedTimeSeconds).toBe(3600)
    expect(result.metrics.avgHeartRate).toBe(145)
    expect(result.metrics.maxHeartRate).toBe(178)
    expect(result.metrics.trainingLoad).toBe(120)
    expect(result.metrics.recoveryTimeHours).toBe(24)
    expect(result.metrics.calories).toBe(650)
    expect(result.metrics.vo2max).toBe(52.4)
    expect(result.metrics.hrZone1Seconds).toBe(600)
    expect(result.metrics.hrZone2Seconds).toBe(900)
    expect(result.metrics.hrZone3Seconds).toBe(1200)
    expect(result.metrics.hrZone4Seconds).toBe(600)
    expect(result.metrics.hrZone5Seconds).toBe(300)
  })

  it('maps recovery_time_hours: null to metrics.recoveryTimeHours: null', () => {
    const row = { ...baseRow, recovery_time_hours: null }
    const result = mapGarminActivityRow(row)
    expect(result.metrics.recoveryTimeHours).toBeNull()
  })

  it('defaults hr zone seconds to 0 when null (via ?? 0)', () => {
    const row = {
      ...baseRow,
      hr_zone_1_seconds: null as unknown as number,
      hr_zone_2_seconds: null as unknown as number,
      hr_zone_3_seconds: null as unknown as number,
      hr_zone_4_seconds: null as unknown as number,
      hr_zone_5_seconds: null as unknown as number,
    }
    const result = mapGarminActivityRow(row)
    expect(result.metrics.hrZone1Seconds).toBe(0)
    expect(result.metrics.hrZone2Seconds).toBe(0)
    expect(result.metrics.hrZone3Seconds).toBe(0)
    expect(result.metrics.hrZone4Seconds).toBe(0)
    expect(result.metrics.hrZone5Seconds).toBe(0)
  })

  it('passes created_at and updated_at strings through unchanged', () => {
    const result = mapGarminActivityRow(baseRow)
    expect(result.createdAt).toBe(baseRow.created_at)
    expect(result.updatedAt).toBe(baseRow.updated_at)
  })
})
