export interface Workout {
  id: string
  userId: string
  title: string
  type: 'crossfit' | 'functional'
  performedAt: string // ISO8601
  durationMinutes: number
  notes?: string
  rpe?: number
  createdAt: string
  updatedAt: string
}

export interface ApiError {
  error: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
}

export type UserRole = 'athlete' | 'admin'

export interface UserProfile {
  id: string
  role: UserRole
}
