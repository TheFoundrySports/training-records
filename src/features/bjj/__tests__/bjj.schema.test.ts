import { describe, it, expect } from 'vitest'
import { bjjTechniqueSchema, bjjSectionSchema, bjjWorkoutSchema } from '../bjj.schema'

// ── bjjTechniqueSchema ────────────────────────────────────────────────────────

describe('bjjTechniqueSchema', () => {
  const validTechnique = {
    name: 'Closed Guard Retention',
    category: 'guard' as const,
  }

  describe('valid inputs', () => {
    it('passes with required fields only', () => {
      const result = bjjTechniqueSchema.safeParse({ name: 'Single Leg X' })
      expect(result.success).toBe(true)
    })

    it('passes with all fields populated', () => {
      const result = bjjTechniqueSchema.safeParse({
        ...validTechnique,
        description: 'Focus on hip movement',
        youtubeUrl: 'https://www.youtube.com/watch?v=abc123',
      })
      expect(result.success).toBe(true)
    })

    it('passes with empty string for youtubeUrl (treated as blank optional)', () => {
      const result = bjjTechniqueSchema.safeParse({ ...validTechnique, youtubeUrl: '' })
      expect(result.success).toBe(true)
    })

    it('passes without category (optional)', () => {
      const result = bjjTechniqueSchema.safeParse({ name: 'Armbar' })
      expect(result.success).toBe(true)
    })

    it('accepts all valid categories', () => {
      const categories = [
        'guard',
        'takedown',
        'submission',
        'escape',
        'transition',
        'other',
      ] as const
      for (const category of categories) {
        const result = bjjTechniqueSchema.safeParse({ name: 'Test', category })
        expect(result.success).toBe(true)
      }
    })
  })

  describe('name validation', () => {
    it('fails when name is empty string', () => {
      const result = bjjTechniqueSchema.safeParse({ name: '' })
      expect(result.success).toBe(false)
      if (!result.success) {
        const nameError = result.error.issues.find((i) => i.path.includes('name'))
        expect(nameError?.message).toBe('Name is required')
      }
    })

    it('fails when name is missing', () => {
      const result = bjjTechniqueSchema.safeParse({})
      expect(result.success).toBe(false)
    })

    it('fails when name exceeds 200 characters', () => {
      const result = bjjTechniqueSchema.safeParse({ name: 'a'.repeat(201) })
      expect(result.success).toBe(false)
    })
  })

  describe('youtubeUrl validation', () => {
    it('fails when youtubeUrl is not a valid URL', () => {
      const result = bjjTechniqueSchema.safeParse({
        ...validTechnique,
        youtubeUrl: 'not-a-url',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        const urlError = result.error.issues.find((i) => i.path.includes('youtubeUrl'))
        expect(urlError?.message).toBe('Must be a valid URL')
      }
    })

    it('passes when youtubeUrl is a valid https URL', () => {
      const result = bjjTechniqueSchema.safeParse({
        ...validTechnique,
        youtubeUrl: 'https://youtube.com/watch?v=xyz',
      })
      expect(result.success).toBe(true)
    })
  })

  describe('category validation', () => {
    it('fails for unknown category value', () => {
      const result = bjjTechniqueSchema.safeParse({ name: 'Test', category: 'yoga' })
      expect(result.success).toBe(false)
    })
  })
})

// ── bjjSectionSchema ──────────────────────────────────────────────────────────

describe('bjjSectionSchema', () => {
  const validSection = {
    goal: 'Guard passing from half guard',
  }

  describe('valid inputs', () => {
    it('passes with only goal field', () => {
      const result = bjjSectionSchema.safeParse(validSection)
      expect(result.success).toBe(true)
    })

    it('passes with all fields populated', () => {
      const result = bjjSectionSchema.safeParse({
        goal: 'Drilling sweeps',
        rawDescription: 'Worked on scissor sweep to hip bump combo',
        durationMinutes: 15,
        techniqueIds: ['550e8400-e29b-41d4-a716-446655440000'],
      })
      expect(result.success).toBe(true)
    })

    it('defaults techniqueIds to empty array when not provided', () => {
      const result = bjjSectionSchema.safeParse(validSection)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.techniqueIds).toEqual([])
      }
    })

    it('passes with durationMinutes = 1 (lower bound)', () => {
      const result = bjjSectionSchema.safeParse({ ...validSection, durationMinutes: 1 })
      expect(result.success).toBe(true)
    })

    it('passes with durationMinutes = 300 (upper bound)', () => {
      const result = bjjSectionSchema.safeParse({ ...validSection, durationMinutes: 300 })
      expect(result.success).toBe(true)
    })
  })

  describe('goal validation — REQ-309', () => {
    it('fails when goal is empty string', () => {
      const result = bjjSectionSchema.safeParse({ goal: '' })
      expect(result.success).toBe(false)
      if (!result.success) {
        const goalError = result.error.issues.find((i) => i.path.includes('goal'))
        expect(goalError?.message).toBe('Goal is required')
      }
    })

    it('fails when goal is missing', () => {
      const result = bjjSectionSchema.safeParse({})
      expect(result.success).toBe(false)
    })

    it('fails when goal exceeds 300 characters', () => {
      const result = bjjSectionSchema.safeParse({ goal: 'a'.repeat(301) })
      expect(result.success).toBe(false)
    })
  })

  describe('durationMinutes validation', () => {
    it('fails when durationMinutes is 0', () => {
      const result = bjjSectionSchema.safeParse({ ...validSection, durationMinutes: 0 })
      expect(result.success).toBe(false)
    })

    it('fails when durationMinutes is 301', () => {
      const result = bjjSectionSchema.safeParse({ ...validSection, durationMinutes: 301 })
      expect(result.success).toBe(false)
    })

    it('fails when durationMinutes is negative', () => {
      const result = bjjSectionSchema.safeParse({ ...validSection, durationMinutes: -1 })
      expect(result.success).toBe(false)
    })

    it('fails when durationMinutes is not an integer', () => {
      const result = bjjSectionSchema.safeParse({ ...validSection, durationMinutes: 15.5 })
      expect(result.success).toBe(false)
    })
  })
})

// ── bjjWorkoutSchema ──────────────────────────────────────────────────────────

describe('bjjWorkoutSchema', () => {
  const validSection = { goal: 'Guard retention' }

  const validWorkout = {
    title: 'Morning BJJ',
    performedAt: '2026-04-05T08:00',
    durationMinutes: 60,
    sections: [validSection],
  }

  describe('valid inputs — REQ-308', () => {
    it('passes with required fields only', () => {
      const result = bjjWorkoutSchema.safeParse(validWorkout)
      expect(result.success).toBe(true)
    })

    it('passes with all optional fields', () => {
      const result = bjjWorkoutSchema.safeParse({
        ...validWorkout,
        notes: 'Good session',
        rpe: 7,
        sections: [
          {
            goal: 'Warmup',
            rawDescription: 'Light rolling',
            durationMinutes: 10,
            techniqueIds: [],
          },
          { goal: 'Guard work' },
        ],
      })
      expect(result.success).toBe(true)
    })

    it('passes with durationMinutes = 1 (lower bound)', () => {
      const result = bjjWorkoutSchema.safeParse({ ...validWorkout, durationMinutes: 1 })
      expect(result.success).toBe(true)
    })

    it('passes with durationMinutes = 300 (upper bound)', () => {
      const result = bjjWorkoutSchema.safeParse({ ...validWorkout, durationMinutes: 300 })
      expect(result.success).toBe(true)
    })

    it('normalizes performedAt from datetime-local format', () => {
      const result = bjjWorkoutSchema.safeParse({
        ...validWorkout,
        performedAt: '2026-04-05T08:00',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.performedAt).toMatch(/Z$/)
      }
    })

    it('passes when performedAt is already a full ISO datetime', () => {
      const result = bjjWorkoutSchema.safeParse({
        ...validWorkout,
        performedAt: '2026-04-05T08:00:00.000Z',
      })
      expect(result.success).toBe(true)
    })
  })

  describe('title validation — REQ-309', () => {
    it('fails when title is empty', () => {
      const result = bjjWorkoutSchema.safeParse({ ...validWorkout, title: '' })
      expect(result.success).toBe(false)
      if (!result.success) {
        const titleError = result.error.issues.find((i) => i.path.includes('title'))
        expect(titleError?.message).toBe('Title is required')
      }
    })

    it('fails when title is missing', () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { title: _t, ...rest } = validWorkout
      const result = bjjWorkoutSchema.safeParse(rest)
      expect(result.success).toBe(false)
    })
  })

  describe('sections validation — REQ-309', () => {
    it('fails when sections array is empty', () => {
      const result = bjjWorkoutSchema.safeParse({ ...validWorkout, sections: [] })
      expect(result.success).toBe(false)
      if (!result.success) {
        const sectionsError = result.error.issues.find((i) => i.path.includes('sections'))
        expect(sectionsError).toBeDefined()
      }
    })

    it('fails when sections is missing', () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { sections: _s, ...rest } = validWorkout
      const result = bjjWorkoutSchema.safeParse(rest)
      expect(result.success).toBe(false)
    })

    it('fails when a section has an empty goal', () => {
      const result = bjjWorkoutSchema.safeParse({
        ...validWorkout,
        sections: [{ goal: '' }],
      })
      expect(result.success).toBe(false)
    })

    it('passes with multiple sections', () => {
      const result = bjjWorkoutSchema.safeParse({
        ...validWorkout,
        sections: [{ goal: 'Section 1' }, { goal: 'Section 2' }, { goal: 'Section 3' }],
      })
      expect(result.success).toBe(true)
    })
  })

  describe('performedAt validation', () => {
    it('fails for invalid date string', () => {
      const result = bjjWorkoutSchema.safeParse({ ...validWorkout, performedAt: 'not-a-date' })
      expect(result.success).toBe(false)
      if (!result.success) {
        const dateError = result.error.issues.find((i) => i.path.includes('performedAt'))
        expect(dateError?.message).toBe('Enter a valid date and time')
      }
    })
  })

  describe('durationMinutes validation', () => {
    it('fails when durationMinutes is 0', () => {
      const result = bjjWorkoutSchema.safeParse({ ...validWorkout, durationMinutes: 0 })
      expect(result.success).toBe(false)
    })

    it('fails when durationMinutes is negative', () => {
      const result = bjjWorkoutSchema.safeParse({ ...validWorkout, durationMinutes: -10 })
      expect(result.success).toBe(false)
    })

    it('fails when durationMinutes is not an integer', () => {
      const result = bjjWorkoutSchema.safeParse({ ...validWorkout, durationMinutes: 30.5 })
      expect(result.success).toBe(false)
    })
  })
})
