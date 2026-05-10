import { describe, it, expect } from 'vitest'
import { mapTechniqueRow, mapSectionRow } from '../hooks/mapRow'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const techniqueRowFull = {
  id: 'tech-1',
  name: 'Closed Guard',
  description: 'Control from bottom closed guard',
  category: 'guard',
  youtube_url: 'https://youtube.com/watch?v=abc',
  created_at: '2026-04-01T10:00:00.000Z',
  updated_at: '2026-04-02T11:00:00.000Z',
  name_es: null,
}

const techniqueRowNulls = {
  id: 'tech-2',
  name: 'Hip Escape',
  description: null,
  category: null,
  youtube_url: null,
  created_at: '2026-04-01T10:00:00.000Z',
  updated_at: '2026-04-02T11:00:00.000Z',
  name_es: null,
}

const sectionRowFull = {
  id: 'sec-1',
  workout_id: 'workout-1',
  section_number: 1,
  goal: 'Guard passing',
  raw_description: 'Worked on knee slice',
  ai_description: 'Focused drilling of knee slice pass entry',
  duration_minutes: 15,
  created_at: '2026-04-01T10:00:00.000Z',
  bjj_section_techniques: [
    { bjj_techniques: techniqueRowFull },
    { bjj_techniques: techniqueRowNulls },
  ],
}

const sectionRowNulls = {
  id: 'sec-2',
  workout_id: 'workout-2',
  section_number: 2,
  goal: 'Takedowns',
  raw_description: null,
  ai_description: null,
  duration_minutes: null,
  created_at: '2026-04-01T10:00:00.000Z',
  bjj_section_techniques: [],
}

// ── mapTechniqueRow ───────────────────────────────────────────────────────────

describe('mapTechniqueRow', () => {
  describe('snake_case → camelCase mapping — REQ-113', () => {
    it('maps id, name, createdAt, updatedAt correctly', () => {
      const result = mapTechniqueRow(techniqueRowFull)
      expect(result.id).toBe('tech-1')
      expect(result.name).toBe('Closed Guard')
      expect(result.createdAt).toBe('2026-04-01T10:00:00.000Z')
      expect(result.updatedAt).toBe('2026-04-02T11:00:00.000Z')
    })

    it('maps youtube_url → youtubeUrl', () => {
      const result = mapTechniqueRow(techniqueRowFull)
      expect(result.youtubeUrl).toBe('https://youtube.com/watch?v=abc')
    })

    it('maps description and category', () => {
      const result = mapTechniqueRow(techniqueRowFull)
      expect(result.description).toBe('Control from bottom closed guard')
      expect(result.category).toBe('guard')
    })
  })

  describe('null → undefined mapping', () => {
    it('maps null description → undefined', () => {
      const result = mapTechniqueRow(techniqueRowNulls)
      expect(result.description).toBeUndefined()
    })

    it('maps null category → undefined', () => {
      const result = mapTechniqueRow(techniqueRowNulls)
      expect(result.category).toBeUndefined()
    })

    it('maps null youtube_url → undefined youtubeUrl', () => {
      const result = mapTechniqueRow(techniqueRowNulls)
      expect(result.youtubeUrl).toBeUndefined()
    })
  })
})

// ── mapSectionRow ─────────────────────────────────────────────────────────────

describe('mapSectionRow', () => {
  describe('snake_case → camelCase mapping — REQ-113', () => {
    it('maps id, workoutId, sectionNumber, goal, createdAt correctly', () => {
      const result = mapSectionRow(sectionRowFull)
      expect(result.id).toBe('sec-1')
      expect(result.workoutId).toBe('workout-1')
      expect(result.sectionNumber).toBe(1)
      expect(result.goal).toBe('Guard passing')
      expect(result.createdAt).toBe('2026-04-01T10:00:00.000Z')
    })

    it('maps raw_description → rawDescription', () => {
      const result = mapSectionRow(sectionRowFull)
      expect(result.rawDescription).toBe('Worked on knee slice')
    })

    it('maps ai_description → aiDescription', () => {
      const result = mapSectionRow(sectionRowFull)
      expect(result.aiDescription).toBe('Focused drilling of knee slice pass entry')
    })

    it('maps duration_minutes → durationMinutes', () => {
      const result = mapSectionRow(sectionRowFull)
      expect(result.durationMinutes).toBe(15)
    })
  })

  describe('null → undefined mapping', () => {
    it('maps null raw_description → undefined', () => {
      const result = mapSectionRow(sectionRowNulls)
      expect(result.rawDescription).toBeUndefined()
    })

    it('maps null ai_description → undefined', () => {
      const result = mapSectionRow(sectionRowNulls)
      expect(result.aiDescription).toBeUndefined()
    })

    it('maps null duration_minutes → undefined', () => {
      const result = mapSectionRow(sectionRowNulls)
      expect(result.durationMinutes).toBeUndefined()
    })
  })

  describe('nested technique mapping', () => {
    it('maps bjj_section_techniques junction into techniques array', () => {
      const result = mapSectionRow(sectionRowFull)
      expect(result.techniques).toHaveLength(2)
    })

    it('correctly maps each technique in the junction', () => {
      const result = mapSectionRow(sectionRowFull)
      expect(result.techniques[0].id).toBe('tech-1')
      expect(result.techniques[0].youtubeUrl).toBe('https://youtube.com/watch?v=abc')
      expect(result.techniques[1].id).toBe('tech-2')
      expect(result.techniques[1].youtubeUrl).toBeUndefined()
    })

    it('maps empty bjj_section_techniques to empty techniques array', () => {
      const result = mapSectionRow(sectionRowNulls)
      expect(result.techniques).toEqual([])
    })
  })
})
