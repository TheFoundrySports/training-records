import type { Workout } from '../workout.types'

export function mapRow(row: {
  id: string
  user_id: string
  title: string
  type: string
  performed_at: string
  duration_minutes: number
  notes: string | null
  rpe: number | null
  wod_text: string | null
  wod_format: string | null
  payload: Record<string, unknown> | null
  created_at: string
  updated_at: string
}): Workout {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    type: row.type as Workout['type'],
    performedAt: row.performed_at,
    durationMinutes: row.duration_minutes,
    notes: row.notes ?? undefined,
    rpe: row.rpe ?? undefined,
    wodText: row.wod_text ?? undefined,
    wodFormat: row.wod_format ?? undefined,
    payload: row.payload ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
