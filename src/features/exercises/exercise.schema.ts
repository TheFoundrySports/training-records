import { z } from 'zod'

export const exerciseSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200, 'Name must be 200 characters or less'),
  description: z.string().max(2000).optional(),
  categoryId: z.string().uuid('Invalid category').optional(),
  movementType: z.enum(['Gymnastics', 'Weightlifting', 'Monostructural', 'Mixed'], {
    message: 'Movement type is required',
  }),
  measurementType: z.enum(['Reps', 'Weight', 'Distance', 'Time', 'Reps/Weight'], {
    message: 'Measurement type is required',
  }),
  difficultyLevel: z.enum(['Beginner', 'Intermediate', 'Advanced', 'Elite'], {
    message: 'Difficulty level is required',
  }),
  equipment: z.array(z.string()).optional(),
  isBenchmark: z.boolean().optional(),
  videoUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
  scalingOptions: z.string().max(2000).optional(),
})

export type ExerciseFormValues = z.infer<typeof exerciseSchema>
