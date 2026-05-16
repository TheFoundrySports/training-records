import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import type { TechniqueLearningStatus, WorkoutHistoryEntry, TechniqueSuggestion } from '../types/technique-tracking.types'

// ── TechniqueLearningStatus schema ─────────────────────────────────────────────

const techniqueLearningStatusSchema = z.object({
  user_id: z.string().uuid(),
  technique_id: z.string().uuid(),
  name: z.string().min(1),
  name_es: z.string().nullable(),
  category: z.string().nullable(),
  total_practices: z.number().int().min(0),
  required_practices: z.number().int().min(1),
  is_learned: z.boolean(),
  first_practiced_at: z.string().datetime(),
  last_practiced_at: z.string().datetime(),
})

describe('TechniqueLearningStatus', () => {
  describe('schema validation', () => {
    it('passes with all fields populated', () => {
      const valid: TechniqueLearningStatus = {
        user_id: '550e8400-e29b-41d4-a716-446655440000',
        technique_id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Knee Slide Pass',
        name_es: 'Pasaje de Rodilla',
        category: 'guard_pass',
        total_practices: 12,
        required_practices: 10,
        is_learned: true,
        first_practiced_at: '2026-03-01T10:00:00.000Z',
        last_practiced_at: '2026-04-15T14:30:00.000Z',
      }
      const result = techniqueLearningStatusSchema.safeParse(valid)
      expect(result.success).toBe(true)
    })

    it('passes with minimal fields (nullables omitted)', () => {
      const minimal: TechniqueLearningStatus = {
        user_id: '550e8400-e29b-41d4-a716-446655440000',
        technique_id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Armbar',
        name_es: null,
        category: null,
        total_practices: 0,
        required_practices: 10,
        is_learned: false,
        first_practiced_at: '2026-03-01T10:00:00.000Z',
        last_practiced_at: '2026-03-01T10:00:00.000Z',
      }
      const result = techniqueLearningStatusSchema.safeParse(minimal)
      expect(result.success).toBe(true)
    })

    it('fails when user_id is not a uuid', () => {
      const result = techniqueLearningStatusSchema.safeParse({
        user_id: 'not-a-uuid',
        technique_id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Test',
        name_es: null,
        category: null,
        total_practices: 1,
        required_practices: 10,
        is_learned: false,
        first_practiced_at: '2026-01-01T00:00:00.000Z',
        last_practiced_at: '2026-01-01T00:00:00.000Z',
      })
      expect(result.success).toBe(false)
    })

    it('fails when total_practices is negative', () => {
      const result = techniqueLearningStatusSchema.safeParse({
        user_id: '550e8400-e29b-41d4-a716-446655440000',
        technique_id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Test',
        name_es: null,
        category: null,
        total_practices: -1,
        required_practices: 10,
        is_learned: false,
        first_practiced_at: '2026-01-01T00:00:00.000Z',
        last_practiced_at: '2026-01-01T00:00:00.000Z',
      })
      expect(result.success).toBe(false)
    })

    it('fails when required_practices is less than 1', () => {
      const result = techniqueLearningStatusSchema.safeParse({
        user_id: '550e8400-e29b-41d4-a716-446655440000',
        technique_id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Test',
        name_es: null,
        category: null,
        total_practices: 5,
        required_practices: 0,
        is_learned: false,
        first_practiced_at: '2026-01-01T00:00:00.000Z',
        last_practiced_at: '2026-01-01T00:00:00.000Z',
      })
      expect(result.success).toBe(false)
    })

    it('fails when first_practiced_at is not a valid datetime', () => {
      const result = techniqueLearningStatusSchema.safeParse({
        user_id: '550e8400-e29b-41d4-a716-446655440000',
        technique_id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Test',
        name_es: null,
        category: null,
        total_practices: 1,
        required_practices: 10,
        is_learned: false,
        first_practiced_at: 'not-a-date',
        last_practiced_at: '2026-01-01T00:00:00.000Z',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('TypeScript assignment', () => {
    it('accepts a fully populated object as TechniqueLearningStatus', () => {
      const item: TechniqueLearningStatus = {
        user_id: '550e8400-e29b-41d4-a716-446655440000',
        technique_id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Closed Guard Retention',
        name_es: 'Retención de Guardia Cerrada',
        category: 'guard',
        total_practices: 8,
        required_practices: 10,
        is_learned: false,
        first_practiced_at: '2026-02-01T09:00:00.000Z',
        last_practiced_at: '2026-05-10T16:00:00.000Z',
      }
      expect(item.name).toBe('Closed Guard Retention')
      expect(item.is_learned).toBe(false)
    })
  })
})

// ── WorkoutHistoryEntry schema ──────────────────────────────────────────────────

const workoutHistoryEntrySchema = z.object({
  workout_id: z.string().uuid(),
  performed_at: z.string().datetime(),
  section_number: z.number().int().min(1),
  goal: z.string().min(1),
  ai_description: z.string(),
})

describe('WorkoutHistoryEntry', () => {
  describe('schema validation', () => {
    it('passes with all fields populated', () => {
      const valid: WorkoutHistoryEntry = {
        workout_id: '550e8400-e29b-41d4-a716-446655440000',
        performed_at: '2026-04-10T10:00:00.000Z',
        section_number: 2,
        goal: 'Guard passing',
        ai_description: 'Worked on knee slide pass [Knee Slide Pass] and toreador [Toreador Pass].',
      }
      const result = workoutHistoryEntrySchema.safeParse(valid)
      expect(result.success).toBe(true)
    })

    it('passes with empty ai_description', () => {
      const valid: WorkoutHistoryEntry = {
        workout_id: '550e8400-e29b-41d4-a716-446655440000',
        performed_at: '2026-04-10T10:00:00.000Z',
        section_number: 1,
        goal: 'Warmup',
        ai_description: '',
      }
      const result = workoutHistoryEntrySchema.safeParse(valid)
      expect(result.success).toBe(true)
    })

    it('fails when workout_id is not a uuid', () => {
      const result = workoutHistoryEntrySchema.safeParse({
        workout_id: 'invalid',
        performed_at: '2026-04-10T10:00:00.000Z',
        section_number: 1,
        goal: 'Test',
        ai_description: 'Test description',
      })
      expect(result.success).toBe(false)
    })

    it('fails when section_number is 0', () => {
      const result = workoutHistoryEntrySchema.safeParse({
        workout_id: '550e8400-e29b-41d4-a716-446655440000',
        performed_at: '2026-04-10T10:00:00.000Z',
        section_number: 0,
        goal: 'Test',
        ai_description: 'Test',
      })
      expect(result.success).toBe(false)
    })

    it('fails when goal is empty string', () => {
      const result = workoutHistoryEntrySchema.safeParse({
        workout_id: '550e8400-e29b-41d4-a716-446655440000',
        performed_at: '2026-04-10T10:00:00.000Z',
        section_number: 1,
        goal: '',
        ai_description: 'Test',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('TypeScript assignment', () => {
    it('accepts a valid WorkoutHistoryEntry', () => {
      const entry: WorkoutHistoryEntry = {
        workout_id: '550e8400-e29b-41d4-a716-446655440099',
        performed_at: '2026-05-01T08:00:00.000Z',
        section_number: 3,
        goal: 'Submissions',
        ai_description: 'Focused on triangle choke [Triangle Choke] setup.',
      }
      expect(entry.section_number).toBe(3)
    })
  })
})

// ── TechniqueSuggestion schema ─────────────────────────────────────────────────

const techniqueSuggestionSchema = z.object({
  technique_id: z.string().uuid(),
  name: z.string().min(1),
  name_es: z.string().nullable(),
  total_practices: z.number().int().min(0),
  last_practiced_at: z.string().datetime(),
})

describe('TechniqueSuggestion', () => {
  describe('schema validation', () => {
    it('passes with all fields populated', () => {
      const valid: TechniqueSuggestion = {
        technique_id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Knee Slide Pass',
        name_es: 'Pasaje de Rodilla',
        total_practices: 7,
        last_practiced_at: '2026-05-10T14:00:00.000Z',
      }
      const result = techniqueSuggestionSchema.safeParse(valid)
      expect(result.success).toBe(true)
    })

    it('passes with null name_es', () => {
      const valid: TechniqueSuggestion = {
        technique_id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Armbar',
        name_es: null,
        total_practices: 3,
        last_practiced_at: '2026-05-01T10:00:00.000Z',
      }
      const result = techniqueSuggestionSchema.safeParse(valid)
      expect(result.success).toBe(true)
    })

    it('fails when technique_id is not a uuid', () => {
      const result = techniqueSuggestionSchema.safeParse({
        technique_id: 'bad-id',
        name: 'Test',
        name_es: null,
        total_practices: 1,
        last_practiced_at: '2026-01-01T00:00:00.000Z',
      })
      expect(result.success).toBe(false)
    })

    it('fails when name is empty', () => {
      const result = techniqueSuggestionSchema.safeParse({
        technique_id: '550e8400-e29b-41d4-a716-446655440000',
        name: '',
        name_es: null,
        total_practices: 1,
        last_practiced_at: '2026-01-01T00:00:00.000Z',
      })
      expect(result.success).toBe(false)
    })

    it('fails when total_practices is negative', () => {
      const result = techniqueSuggestionSchema.safeParse({
        technique_id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Test',
        name_es: null,
        total_practices: -5,
        last_practiced_at: '2026-01-01T00:00:00.000Z',
      })
      expect(result.success).toBe(false)
    })

    it('fails when last_practiced_at is not a valid datetime', () => {
      const result = techniqueSuggestionSchema.safeParse({
        technique_id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Test',
        name_es: null,
        total_practices: 1,
        last_practiced_at: 'yesterday',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('TypeScript assignment', () => {
    it('accepts a valid TechniqueSuggestion', () => {
      const suggestion: TechniqueSuggestion = {
        technique_id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Scissor Sweep',
        name_es: 'Barrido de Tijera',
        total_practices: 4,
        last_practiced_at: '2026-05-14T11:00:00.000Z',
      }
      expect(suggestion.total_practices).toBe(4)
    })
  })
})