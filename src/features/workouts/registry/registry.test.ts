import { describe, it, expect, beforeAll } from 'vitest'

// Import all formats to trigger side-effect registration
import './formats/index'

import { getFormat, getAllFormats } from './index'

describe('Registry', () => {
  describe('getFormat', () => {
    it('returns the AMRAP handler with correct id and scoreType', () => {
      const handler = getFormat('amrap')
      expect(handler.id).toBe('amrap')
      expect(handler.scoreType).toBe('rounds')
      expect(handler.label).toBe('AMRAP')
    })

    it('returns the ForTime handler with correct id and scoreType', () => {
      const handler = getFormat('for_time')
      expect(handler.id).toBe('for_time')
      expect(handler.scoreType).toBe('time')
      expect(handler.label).toBe('For Time')
    })

    it('throws for an unknown format id', () => {
      expect(() => getFormat('unknown_type' as never)).toThrow(
        'WodFormatHandler not registered for format: unknown_type',
      )
    })
  })

  describe('getAllFormats', () => {
    it('returns exactly 6 formats', () => {
      const formats = getAllFormats()
      expect(formats).toHaveLength(6)
    })

    it('includes all expected format ids', () => {
      const ids = getAllFormats().map((f) => f.id)
      expect(ids).toContain('amrap')
      expect(ids).toContain('for_time')
      expect(ids).toContain('emom')
      expect(ids).toContain('tabata')
      expect(ids).toContain('ladder')
      expect(ids).toContain('rft')
    })
  })
})

describe('AMRAP schema', () => {
  let schema: ReturnType<typeof getFormat>['schema']

  beforeAll(() => {
    schema = getFormat('amrap').schema
  })

  it('validates a valid payload with movements', () => {
    const result = schema.safeParse({
      timeCap: 20,
      movements: [
        { exerciseId: '550e8400-e29b-41d4-a716-446655440000', exerciseName: 'Pull-up', reps: 10 },
      ],
    })
    expect(result.success).toBe(true)
  })

  it('validates { timeCap: 20, movements: [] } — empty movements is checked at schema level', () => {
    // The schema requires min(1) on movements, so this should fail
    const result = schema.safeParse({ timeCap: 20, movements: [] })
    expect(result.success).toBe(false)
    if (!result.success) {
      const movErr = result.error.issues.find((i) => i.path.includes('movements'))
      expect(movErr).toBeDefined()
    }
  })

  it('rejects payload with missing timeCap', () => {
    const result = schema.safeParse({
      movements: [
        { exerciseId: '550e8400-e29b-41d4-a716-446655440000', exerciseName: 'Thruster', reps: 21 },
      ],
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const timecapErr = result.error.issues.find((i) => i.path.includes('timeCap'))
      expect(timecapErr).toBeDefined()
    }
  })

  it('rejects payload with 0 movements', () => {
    const result = schema.safeParse({ timeCap: 15, movements: [] })
    expect(result.success).toBe(false)
  })

  it('rejects timeCap greater than 60', () => {
    const result = schema.safeParse({
      timeCap: 61,
      movements: [{ exerciseId: '550e8400-e29b-41d4-a716-446655440000', exerciseName: 'Box Jump' }],
    })
    expect(result.success).toBe(false)
  })
})

describe('ForTime schema', () => {
  let schema: ReturnType<typeof getFormat>['schema']

  beforeAll(() => {
    schema = getFormat('for_time').schema
  })

  it('validates a valid payload with movements', () => {
    const result = schema.safeParse({
      movements: [
        { exerciseId: '550e8400-e29b-41d4-a716-446655440000', exerciseName: 'Pull-up', reps: 10 },
      ],
    })
    expect(result.success).toBe(true)
  })

  it('validates payload with optional rounds', () => {
    const result = schema.safeParse({
      rounds: 3,
      movements: [
        { exerciseId: '550e8400-e29b-41d4-a716-446655440000', exerciseName: 'Burpee', reps: 15 },
      ],
    })
    expect(result.success).toBe(true)
  })

  it('rejects payload with missing movements', () => {
    const result = schema.safeParse({ rounds: 5 })
    expect(result.success).toBe(false)
  })

  it('rejects payload with empty movements array', () => {
    const result = schema.safeParse({ movements: [] })
    expect(result.success).toBe(false)
  })
})
