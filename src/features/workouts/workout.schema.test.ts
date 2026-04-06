import { describe, it, expect } from 'vitest'
import { workoutSchema } from './workout.schema'

const validWorkout = {
  title: 'Morning WOD',
  type: 'crossfit' as const,
  performedAt: '2026-04-05T08:00:00.000Z',
  durationMinutes: 45,
}

describe('workoutSchema', () => {
  describe('valid data', () => {
    it('passes with all required fields', () => {
      const result = workoutSchema.safeParse(validWorkout)
      expect(result.success).toBe(true)
    })

    it('passes with all optional fields', () => {
      const result = workoutSchema.safeParse({
        ...validWorkout,
        notes: 'Great session',
        rpe: 8,
      })
      expect(result.success).toBe(true)
    })

    it('passes for functional type', () => {
      const result = workoutSchema.safeParse({ ...validWorkout, type: 'functional' })
      expect(result.success).toBe(true)
    })

    it('passes with durationMinutes = 1 (lower bound)', () => {
      const result = workoutSchema.safeParse({ ...validWorkout, durationMinutes: 1 })
      expect(result.success).toBe(true)
    })

    it('passes with durationMinutes = 300 (upper bound)', () => {
      const result = workoutSchema.safeParse({ ...validWorkout, durationMinutes: 300 })
      expect(result.success).toBe(true)
    })

    it('passes with rpe = 1 (lower bound)', () => {
      const result = workoutSchema.safeParse({ ...validWorkout, rpe: 1 })
      expect(result.success).toBe(true)
    })

    it('passes with rpe = 10 (upper bound)', () => {
      const result = workoutSchema.safeParse({ ...validWorkout, rpe: 10 })
      expect(result.success).toBe(true)
    })

    it('passes without optional rpe', () => {
      const result = workoutSchema.safeParse(validWorkout)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.rpe).toBeUndefined()
      }
    })
  })

  describe('title validation', () => {
    it('fails when title is empty string', () => {
      const result = workoutSchema.safeParse({ ...validWorkout, title: '' })
      expect(result.success).toBe(false)
      if (!result.success) {
        const titleError = result.error.issues.find((i) => i.path.includes('title'))
        expect(titleError?.message).toBe('Title is required')
      }
    })

    it('fails when title is missing', () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { title: _t, ...rest } = validWorkout
      const result = workoutSchema.safeParse(rest)
      expect(result.success).toBe(false)
    })

    it('fails when title exceeds 200 characters', () => {
      const result = workoutSchema.safeParse({ ...validWorkout, title: 'a'.repeat(201) })
      expect(result.success).toBe(false)
    })
  })

  describe('type validation', () => {
    it('fails for unknown type', () => {
      const result = workoutSchema.safeParse({ ...validWorkout, type: 'yoga' })
      expect(result.success).toBe(false)
      if (!result.success) {
        const typeError = result.error.issues.find((i) => i.path.includes('type'))
        expect(typeError).toBeDefined()
        // In Zod v4, enum errors include the invalid value description
        expect(typeError?.message).toMatch(/crossfit|functional/i)
      }
    })

    it('fails when type is missing', () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { type: _t, ...rest } = validWorkout
      const result = workoutSchema.safeParse(rest)
      expect(result.success).toBe(false)
    })
  })

  describe('performedAt validation', () => {
    it('fails for invalid date string', () => {
      const result = workoutSchema.safeParse({ ...validWorkout, performedAt: 'not-a-date' })
      expect(result.success).toBe(false)
      if (!result.success) {
        const dateError = result.error.issues.find((i) => i.path.includes('performedAt'))
        expect(dateError?.message).toBe('Invalid date')
      }
    })

    it('fails for date-only string (not ISO8601 datetime)', () => {
      const result = workoutSchema.safeParse({ ...validWorkout, performedAt: '2026-04-05' })
      expect(result.success).toBe(false)
    })
  })

  describe('durationMinutes validation', () => {
    it('fails when durationMinutes is 0', () => {
      const result = workoutSchema.safeParse({ ...validWorkout, durationMinutes: 0 })
      expect(result.success).toBe(false)
    })

    it('fails when durationMinutes is 301', () => {
      const result = workoutSchema.safeParse({ ...validWorkout, durationMinutes: 301 })
      expect(result.success).toBe(false)
    })

    it('fails when durationMinutes is negative', () => {
      const result = workoutSchema.safeParse({ ...validWorkout, durationMinutes: -5 })
      expect(result.success).toBe(false)
    })

    it('fails when durationMinutes is not an integer', () => {
      const result = workoutSchema.safeParse({ ...validWorkout, durationMinutes: 30.5 })
      expect(result.success).toBe(false)
    })

    it('fails when durationMinutes is missing', () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { durationMinutes: _d, ...rest } = validWorkout
      const result = workoutSchema.safeParse(rest)
      expect(result.success).toBe(false)
    })
  })

  describe('rpe validation', () => {
    it('fails when rpe is 0', () => {
      const result = workoutSchema.safeParse({ ...validWorkout, rpe: 0 })
      expect(result.success).toBe(false)
    })

    it('fails when rpe is 11', () => {
      const result = workoutSchema.safeParse({ ...validWorkout, rpe: 11 })
      expect(result.success).toBe(false)
      if (!result.success) {
        const rpeError = result.error.issues.find((i) => i.path.includes('rpe'))
        expect(rpeError?.message).toBe('RPE must be between 1 and 10')
      }
    })

    it('fails when rpe is not an integer', () => {
      const result = workoutSchema.safeParse({ ...validWorkout, rpe: 7.5 })
      expect(result.success).toBe(false)
    })
  })

  describe('notes validation', () => {
    it('fails when notes exceed 2000 characters', () => {
      const result = workoutSchema.safeParse({ ...validWorkout, notes: 'a'.repeat(2001) })
      expect(result.success).toBe(false)
    })

    it('passes when notes is exactly 2000 characters', () => {
      const result = workoutSchema.safeParse({ ...validWorkout, notes: 'a'.repeat(2000) })
      expect(result.success).toBe(true)
    })
  })
})
