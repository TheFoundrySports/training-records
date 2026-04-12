/**
 * Shared schemas for Garmin import Edge Functions.
 *
 * NOTE: Deno Edge Functions cannot import from src/, so types are defined here.
 */

// GarminMetrics — shape returned by garmin-import
export interface GarminMetrics {
  elapsedTimeSeconds: number
  avgHeartRate: number | null
  maxHeartRate: number | null
  trainingLoad: number | null
  recoveryTimeHours: number | null
  calories: number | null
  vo2max: number | null
  hrZone1Seconds: number
  hrZone2Seconds: number
  hrZone3Seconds: number
  hrZone4Seconds: number
  hrZone5Seconds: number
}

// EvaluationResponse — shape expected from LLM
export interface EvaluationResponse {
  summary: string
  readiness_level: 'excellent' | 'good' | 'moderate' | 'low' | 'rest'
  next_session_suggestion: string
  adaptation_warning: string | null
}

const VALID_READINESS_LEVELS = ['excellent', 'good', 'moderate', 'low', 'rest'] as const

export function isValidEvaluationResponse(val: unknown): val is EvaluationResponse {
  if (typeof val !== 'object' || val === null) return false
  const v = val as Record<string, unknown>

  if (typeof v.summary !== 'string' || v.summary.trim() === '') return false
  if (typeof v.next_session_suggestion !== 'string' || v.next_session_suggestion.trim() === '')
    return false
  if (!(VALID_READINESS_LEVELS as readonly string[]).includes(v.readiness_level as string))
    return false
  if (v.adaptation_warning !== null && typeof v.adaptation_warning !== 'string') return false

  return true
}
