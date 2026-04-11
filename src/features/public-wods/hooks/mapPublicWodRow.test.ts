import { describe, it, expect } from 'vitest'
import { mapPublicWodRow } from './mapPublicWodRow'

describe('mapPublicWodRow', () => {
  it('maps snake_case DB row to camelCase PublicWod', () => {
    const row = {
      id: 'hhhhhhhh-0000-0000-0000-000000000001',
      title: 'Murph',
      type: 'crossfit',
      duration_minutes: 60,
      wod_format: 'for_time',
      wod_text: 'For time: Run 1 mile...',
      payload: { rounds: 1, timeCap: 60, movements: [] },
      category: 'Hero',
      created_at: '2023-09-01T00:00:00Z',
    }

    const result = mapPublicWodRow(row)

    expect(result).toEqual({
      id: 'hhhhhhhh-0000-0000-0000-000000000001',
      title: 'Murph',
      type: 'crossfit',
      durationMinutes: 60,
      wodFormat: 'for_time',
      wodText: 'For time: Run 1 mile...',
      payload: { rounds: 1, timeCap: 60, movements: [] },
      category: 'Hero',
      createdAt: '2023-09-01T00:00:00Z',
    })
  })

  it('maps nullable fields correctly when null', () => {
    const row = {
      id: 'bbbbbbbb-0000-0000-0000-000000000001',
      title: 'Full Body Strength',
      type: 'functional',
      duration_minutes: null,
      wod_format: null,
      wod_text: null,
      payload: null,
      category: null,
      created_at: '2023-10-01T00:00:00Z',
    }

    const result = mapPublicWodRow(row)

    expect(result.durationMinutes).toBeNull()
    expect(result.wodFormat).toBeNull()
    expect(result.wodText).toBeNull()
    expect(result.payload).toBeNull()
    expect(result.category).toBeNull()
  })

  it('preserves all category values without modification', () => {
    const categories = ['Hero', 'Girl', 'Benchmark', 'General'] as const
    for (const category of categories) {
      const row = {
        id: 'test-id',
        title: 'Test',
        type: 'crossfit',
        duration_minutes: null,
        wod_format: null,
        wod_text: null,
        payload: null,
        category,
        created_at: '2024-01-01T00:00:00Z',
      }
      expect(mapPublicWodRow(row).category).toBe(category)
    }
  })
})
