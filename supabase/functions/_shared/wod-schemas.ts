/**
 * Shared Zod-compatible schemas for Edge Function server-side validation.
 *
 * NOTE: Deno Edge Functions cannot import from src/, so these schemas are
 * duplicated here. Keep in sync with src/features/workouts/registry/.
 *
 * This file uses a minimal inline validation approach since importing
 * the npm:zod package in Deno requires specifier mapping.
 */

export const WOD_FORMATS = ['amrap', 'for_time', 'emom', 'tabata', 'ladder', 'rft'] as const
export type WodFormat = (typeof WOD_FORMATS)[number]

export function isValidWodFormat(value: unknown): value is WodFormat {
  return typeof value === 'string' && (WOD_FORMATS as readonly string[]).includes(value)
}

export interface WorkoutMovement {
  exerciseId: string
  exerciseName: string
  reps?: number
  weight?: number
  weightUnit?: 'kg' | 'lb'
  distance?: number
  distanceUnit?: 'm' | 'km' | 'mi'
  durationSeconds?: number
  notes?: string
}

export interface AmrapPayload {
  timeCap: number
  movements: WorkoutMovement[]
  roundsCompleted?: number
  partialReps?: number
}

export interface ForTimePayload {
  rounds?: number
  timeCap?: number
  movements: WorkoutMovement[]
  finishTime?: number
}

function isPositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && value > 0
}

function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value)
}

export type ValidationResult = { ok: true } | { ok: false; error: string }

export function validateAmrapPayload(payload: unknown): ValidationResult {
  if (typeof payload !== 'object' || payload === null) {
    return { ok: false, error: 'payload must be an object' }
  }
  const p = payload as Record<string, unknown>
  if (!isPositiveNumber(p.timeCap)) {
    return { ok: false, error: 'payload.timeCap must be a positive number' }
  }
  if (!isArray(p.movements)) {
    return { ok: false, error: 'payload.movements must be an array' }
  }
  return { ok: true }
}

export function validateForTimePayload(payload: unknown): ValidationResult {
  if (typeof payload !== 'object' || payload === null) {
    return { ok: false, error: 'payload must be an object' }
  }
  const p = payload as Record<string, unknown>
  if (!isArray(p.movements)) {
    return { ok: false, error: 'payload.movements must be an array' }
  }
  return { ok: true }
}

export function validateWodPayload(format: WodFormat, payload: unknown): ValidationResult {
  switch (format) {
    case 'amrap':
      return validateAmrapPayload(payload)
    case 'for_time':
      return validateForTimePayload(payload)
    default:
      // Stubs — accept any payload for non-implemented formats
      return { ok: true }
  }
}
