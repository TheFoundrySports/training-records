import { z } from 'zod'

export const WorkoutMovementSchema = z.object({
  exerciseId: z.string().uuid(),
  exerciseName: z.string().min(1),
  reps: z.number().int().positive().optional(),
  weight: z.number().positive().optional(),
  weightUnit: z.enum(['kg', 'lbs']).optional(),
  distance: z.number().positive().optional(),
  distanceUnit: z.enum(['m', 'km', 'mi']).optional(),
  durationSeconds: z.number().int().positive().optional(),
  notes: z.string().max(200).optional(),
})

export type WorkoutMovementInput = z.infer<typeof WorkoutMovementSchema>
