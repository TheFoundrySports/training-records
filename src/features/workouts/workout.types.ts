export type WorkoutType = 'crossfit' | 'functional'

export interface Workout {
  id: string
  userId: string
  title: string
  type: WorkoutType
  performedAt: string // ISO8601
  durationMinutes: number
  rpe?: number // 1–10
  notes?: string
  wodText?: string
  wodFormat?: string
  payload?: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface CreateWorkoutInput {
  title: string
  type: WorkoutType
  performedAt: string
  durationMinutes: number
  rpe?: number
  notes?: string
  wodText?: string
  wodFormat?: string
  payload?: Record<string, unknown>
}

export interface UpdateWorkoutInput extends Partial<CreateWorkoutInput> {
  id: string
}
