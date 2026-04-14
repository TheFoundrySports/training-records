/**
 * Client-side utilities for Garmin data processing.
 *
 * These functions mirror logic from the Edge Functions so they can be
 * tested in Vitest (which can't import Deno modules).
 */

import type { GarminMetrics } from './garmin.types'

// ── EvaluationResponse (mirrors _shared/garmin-schemas.ts) ──────────────────

export interface EvaluationResponse {
  summary: string
  readiness_level: 'excellent' | 'good' | 'moderate' | 'low' | 'rest'
  next_session_suggestion: string
  adaptation_warning: string | null
}

const VALID_READINESS_LEVELS = ['excellent', 'good', 'moderate', 'low', 'rest'] as const

/**
 * Type guard for EvaluationResponse — mirrors isValidEvaluationResponse in
 * supabase/functions/_shared/garmin-schemas.ts.
 */
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

// ── FIT session extraction (mirrors extractMetrics in garmin-import/index.ts) ─

/**
 * Raw FIT session shape as emitted by fit-file-parser in cascade mode.
 * Only the fields we actually use are typed; the rest are unknown.
 */
export interface FitSession {
  total_elapsed_time?: number
  avg_heart_rate?: number
  max_heart_rate?: number
  training_stress_score?: number
  total_training_effect?: number
  total_calories?: number
  estimated_vo2_max?: number
  time_in_hr_zone?: number[]
  [key: string]: unknown
}

/**
 * Derive recovery time from TSS (Training Stress Score).
 * Mirrors deriveRecoveryHours in supabase/functions/garmin-import/index.ts.
 */
export function deriveRecoveryHours(tss: number | null | undefined): number | null {
  if (tss == null) return null
  if (tss < 150) return 24
  if (tss < 300) return 48
  return 72
}

/**
 * Derive recovery time from Training Effect (TE, scale 1.0–5.0).
 * Used as fallback when training_stress_score is absent (e.g. CrossFit).
 * Mirrors logic in supabase/functions/garmin-import/index.ts.
 *
 * TE < 1.0         → null   (invalid / absent)
 * TE 1.0–1.9       → 12h   (Recovery / Easy)
 * TE 2.0–2.9       → 24h   (Aerobic)
 * TE 3.0–3.9       → 36h   (Tempo)
 * TE 4.0–4.9       → 48h   (Threshold)
 * TE ≥ 5.0         → 60h   (Overreaching)
 */
export function deriveRecoveryHoursFromTrainingEffect(
  effect: number | null | undefined,
): number | null {
  if (effect == null || effect < 1.0) return null
  if (effect < 2.0) return 12
  if (effect < 3.0) return 24
  if (effect < 4.0) return 36
  if (effect < 5.0) return 48
  return 60
}

/**
 * Extract GarminMetrics from a parsed FIT session object.
 * Mirrors extractMetrics in supabase/functions/garmin-import/index.ts.
 *
 * NOTE: time_in_hr_zone values are in milliseconds, so they are divided by 1000.
 */
export function extractMetricsFromFitSession(session: FitSession): GarminMetrics {
  const hrZones = Array.isArray(session.time_in_hr_zone) ? session.time_in_hr_zone : []

  const zoneSeconds = (idx: number): number =>
    hrZones[idx] != null ? Math.round(hrZones[idx] / 1000) : 0

  const tss = session.training_stress_score ?? null
  const te = session.total_training_effect ?? null

  return {
    elapsedTimeSeconds: session.total_elapsed_time ?? 0,
    avgHeartRate: session.avg_heart_rate ?? null,
    maxHeartRate: session.max_heart_rate ?? null,
    trainingLoad: tss,
    recoveryTimeHours: deriveRecoveryHours(tss) ?? deriveRecoveryHoursFromTrainingEffect(te),
    calories: session.total_calories ?? null,
    vo2max: session.estimated_vo2_max ?? null,
    hrZone1Seconds: zoneSeconds(0),
    hrZone2Seconds: zoneSeconds(1),
    hrZone3Seconds: zoneSeconds(2),
    hrZone4Seconds: zoneSeconds(3),
    hrZone5Seconds: zoneSeconds(4),
  }
}
