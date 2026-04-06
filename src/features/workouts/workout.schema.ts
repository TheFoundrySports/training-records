import { z } from 'zod'

/**
 * Normalizes a datetime-local input string (e.g. "2026-04-05T10:00" or "2026-04-05T10:00:00")
 * to a full ISO8601 string with timezone (e.g. "2026-04-05T10:00:00.000Z").
 * Already-complete ISO strings are passed through unchanged.
 */
export function normalizeDateTime(value: string): string {
  if (!value) return value
  // Already a full ISO8601 string (has timezone offset or Z)
  if (/[Z+-]\d*(\d{2}:\d{2})?$/.test(value)) return value
  // datetime-local format: YYYY-MM-DDTHH:mm or YYYY-MM-DDTHH:mm:ss
  const padded = value.length === 16 ? `${value}:00.000Z` : `${value}.000Z`
  return padded
}

export const workoutSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be 200 characters or less'),
  type: z.enum(['crossfit', 'functional']),
  performedAt: z
    .string()
    .transform((val) => normalizeDateTime(val))
    .pipe(z.string().datetime({ message: 'Invalid date' })),
  durationMinutes: z
    .number()
    .int('Duration must be a whole number')
    .min(1, 'Duration must be at least 1 minute')
    .max(300, 'Duration must be 300 minutes or less'),
  notes: z.string().max(2000, 'Notes must be 2000 characters or less').optional(),
  rpe: z
    .number()
    .int('RPE must be a whole number')
    .min(1, 'RPE must be between 1 and 10')
    .max(10, 'RPE must be between 1 and 10')
    .optional(),
})

export type WorkoutFormValues = z.infer<typeof workoutSchema>
