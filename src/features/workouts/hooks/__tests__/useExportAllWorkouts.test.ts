import { describe, it, expect } from 'vitest'
import { buildExportWorkout } from '../exportWorkoutUtils'

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

describe('useExportAllWorkouts', () => {
  describe('buildExportWorkout with multiple workout types', () => {
    it('builds BJJ workout with sections', () => {
      const result = buildExportWorkout(bjjWorkoutRow, bjjSectionsRow)
      expect(result.sections).toHaveLength(2)
      expect(result.sections![0].techniques).toHaveLength(1)
      expect(result.sections![1].techniques).toHaveLength(1)
    })

    it('builds CrossFit workout with wod fields, no sections', () => {
      const result = buildExportWorkout(crossfitWorkoutRow, null)
      expect(result.sections).toBeNull()
      expect(result.wodFormat).toBe('for_time')
      expect(result.wodText).toBe('21-15-9 Thrusters and Pull-ups')
      expect(result.payload).toEqual({ exercises: ['thruster', 'pull-up'] })
    })
  })

  describe('combined export scenario', () => {
    it('exports 2 BJJ + 1 CrossFit → correct structure for each', () => {
      const workouts = [
        buildExportWorkout(bjjWorkoutRow, bjjSectionsRow),
        buildExportWorkout({ ...bjjWorkoutRow, title: 'Evening BJJ' }, [bjjSectionsRow[0]]),
        buildExportWorkout(crossfitWorkoutRow, null),
      ]

      expect(workouts).toHaveLength(3)
      expect(workouts[0].type).toBe('bjj')
      expect(workouts[0].sections).toHaveLength(2)
      expect(workouts[1].type).toBe('bjj')
      expect(workouts[1].sections).toHaveLength(1)
      expect(workouts[2].type).toBe('crossfit')
      expect(workouts[2].sections).toBeNull()
      expect(workouts[2].wodFormat).toBe('for_time')
    })

    it('empty workouts array → produces valid root structure', () => {
      const root = {
        version: 1,
        exportedAt: new Date().toISOString(),
        workouts: [],
      }
      expect(root.version).toBe(1)
      expect(root.workouts).toEqual([])
    })
  })
})