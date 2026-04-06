import type { Control } from 'react-hook-form'
import type { ZodType } from 'zod'
import type React from 'react'
import { WorkoutMovementSchema } from './formats/workout-movement.schema'

export type WodFormat = 'amrap' | 'for_time' | 'emom' | 'tabata' | 'ladder' | 'rft'

export type ScoreType = 'rounds' | 'time' | 'reps' | 'weight'

export interface Score {
  type: ScoreType
  value: number
  unit?: string
}

export interface WorkoutMovement {
  exerciseId: string
  exerciseName: string
  reps?: number
  weight?: number
  weightUnit?: 'kg' | 'lbs'
  distance?: number
  distanceUnit?: 'm' | 'km' | 'mi'
  durationSeconds?: number
  notes?: string
}

// TPayload is a phantom type parameter for type-safe handler composition
export interface WodFormSectionProps<
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  TPayload = unknown,
> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<any>
  name: string
  disabled?: boolean
}

export interface WodFormatHandler<TPayload = unknown> {
  id: WodFormat
  label: string
  scoreType: ScoreType
  defaultPayload: TPayload
  schema: ZodType<TPayload>
  FormSection: React.FC<WodFormSectionProps<TPayload>>
  normalizeScore?: (payload: TPayload) => Score
}

// Re-export shared schema for convenience
export { WorkoutMovementSchema }
