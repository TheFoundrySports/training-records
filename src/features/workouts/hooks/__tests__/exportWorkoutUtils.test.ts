import { describe, it, expect } from 'vitest'
import { buildExportWorkout, generateExportFilename } from '../exportWorkoutUtils'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const bjjWorkoutRow = {
  title: 'Morning BJJ',
  type: 'bjj',
  performed_at: '2026-05-18T09:00:00.000Z',
  duration_minutes: 60,
  notes: 'Focused on guard passing',
  enhanced_notes: null as null,
  rpe: 7,
  wod_text: null,
  wod_format: null,
  payload: null,
}

const bjjSectionsRow = [
  {
    section_number: 1,
    goal: 'Warmup',
    raw_description: '10 min easy flow',
    ai_description: null as null,
    duration_minutes: 10,
    bjj_section_techniques: [
      { bjj_techniques: { name: 'Hip Escape', name_es: 'Escape de cadera', category: 'defense' } },
      { bjj_techniques: { name: 'Technical Stand-up', name_es: 'Parada técnica', category: 'transition' } },
    ],
  },
  {
    section_number: 2,
    goal: 'Guard passing',
    raw_description: 'Knee slice pass drilling',
    ai_description: 'Focused drilling',
    duration_minutes: 20,
    bjj_section_techniques: [
      { bjj_techniques: { name: 'Knee Slice', name_es: null, category: 'pass' } },
    ],
  },
]

const crossfitWorkoutRow = {
  title: 'Fran',
  type: 'crossfit',
  performed_at: '2026-05-17T08:00:00.000Z',
  duration_minutes: 20,
  notes: null,
  enhanced_notes: null,
  rpe: 9,
  wod_text: '21-15-9 Thrusters and Pull-ups',
  wod_format: 'for_time',
  payload: { exercises: ['thruster', 'pull-up'] },
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('buildExportWorkout', () => {
  describe('BJJ workout', () => {
    it('maps all fields correctly', () => {
      const result = buildExportWorkout(bjjWorkoutRow, bjjSectionsRow)

      expect(result.title).toBe('Morning BJJ')
      expect(result.type).toBe('bjj')
      expect(result.performedAt).toBe('2026-05-18T09:00:00.000Z')
      expect(result.durationMinutes).toBe(60)
      expect(result.rpe).toBe(7)
      expect(result.notes).toBe('Focused on guard passing')
      expect(result.enhancedNotes).toBeNull()
      expect(result.wodFormat).toBeNull()
      expect(result.wodText).toBeNull()
      expect(result.payload).toBeNull()
    })

    it('maps first section with techniques', () => {
      const result = buildExportWorkout(bjjWorkoutRow, bjjSectionsRow)

      expect(result.sections![0]).toMatchObject({
        sectionNumber: 1,
        goal: 'Warmup',
        rawDescription: '10 min easy flow',
        aiDescription: null,
        durationMinutes: 10,
      })
      expect(result.sections![0].techniques).toHaveLength(2)
      expect(result.sections![0].techniques[0]).toMatchObject({
        name: 'Hip Escape',
        nameEs: 'Escape de cadera',
        category: 'defense',
      })
      expect(result.sections![0].techniques[1]).toMatchObject({
        name: 'Technical Stand-up',
        nameEs: 'Parada técnica',
        category: 'transition',
      })
    })

    it('maps second section correctly', () => {
      const result = buildExportWorkout(bjjWorkoutRow, bjjSectionsRow)

      expect(result.sections![1]).toMatchObject({
        sectionNumber: 2,
        goal: 'Guard passing',
        rawDescription: 'Knee slice pass drilling',
        aiDescription: 'Focused drilling',
        durationMinutes: 20,
      })
      expect(result.sections![1].techniques).toHaveLength(1)
      expect(result.sections![1].techniques[0]).toMatchObject({
        name: 'Knee Slice',
        nameEs: null,
        category: 'pass',
      })
    })

    it('aggregates all techniques across sections', () => {
      const result = buildExportWorkout(bjjWorkoutRow, bjjSectionsRow)

      // Section 1 has 2 techniques: Hip Escape, Technical Stand-up
      expect(result.sections![0].techniques).toHaveLength(2)
      // Section 2 has 1 technique: Knee Slice
      expect(result.sections![1].techniques).toHaveLength(1)

      // Verify all technique names across sections
      const allTechniqueNames = result.sections!.flatMap((s) => s.techniques.map((t) => t.name))
      expect(allTechniqueNames).toEqual(['Hip Escape', 'Technical Stand-up', 'Knee Slice'])
    })
  })

  describe('BJJ workout with null sections', () => {
    it('returns sections: null', () => {
      const result = buildExportWorkout(bjjWorkoutRow, null)
      expect(result.sections).toBeNull()
    })
  })

  describe('CrossFit workout', () => {
    it('maps CrossFit-specific fields correctly', () => {
      const result = buildExportWorkout(crossfitWorkoutRow, null)

      expect(result.title).toBe('Fran')
      expect(result.type).toBe('crossfit')
      expect(result.performedAt).toBe('2026-05-17T08:00:00.000Z')
      expect(result.durationMinutes).toBe(20)
      expect(result.rpe).toBe(9)
      expect(result.wodFormat).toBe('for_time')
      expect(result.wodText).toBe('21-15-9 Thrusters and Pull-ups')
      expect(result.payload).toEqual({ exercises: ['thruster', 'pull-up'] })
      expect(result.sections).toBeNull()
    })
  })
})

describe('generateExportFilename', () => {
  it('generates correct filename for BJJ workout', () => {
    const filename = generateExportFilename(bjjWorkoutRow)
    expect(filename).toBe('workout-morning-bjj-2026-05-18.json')
  })

  it('generates correct filename for CrossFit workout', () => {
    const filename = generateExportFilename(crossfitWorkoutRow)
    expect(filename).toBe('workout-fran-2026-05-17.json')
  })

  it('slugifies title with spaces', () => {
    const row = { ...crossfitWorkoutRow, title: 'Morning Workout Session' }
    const filename = generateExportFilename(row)
    expect(filename).toBe('workout-morning-workout-session-2026-05-17.json')
  })

  it('removes leading/trailing dashes from slug', () => {
    const row = { ...crossfitWorkoutRow, title: '   Test   ' }
    const filename = generateExportFilename(row)
    expect(filename).toBe('workout-test-2026-05-17.json')
  })
})