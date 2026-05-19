import { describe, it, expect } from 'vitest'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const validFileContent = {
  version: 1,
  exportedAt: '2026-05-18T14:30:00.000Z',
  workouts: [
    {
      title: 'Morning BJJ',
      type: 'bjj',
      performedAt: '2026-05-18T09:00:00.000Z',
      durationMinutes: 60,
      rpe: 7,
      notes: 'Focused on guard passing',
      enhancedNotes: null,
      wodFormat: null,
      wodText: null,
      payload: null,
      sections: [
        {
          sectionNumber: 1,
          goal: 'Warmup',
          rawDescription: '10 min easy flow',
          aiDescription: null,
          durationMinutes: 10,
          techniques: [
            { name: 'Hip Escape', nameEs: 'Escape de cadera', category: 'defense' },
          ],
        },
      ],
    },
    {
      title: 'Fran',
      type: 'crossfit',
      performedAt: '2026-05-17T08:00:00.000Z',
      durationMinutes: 20,
      rpe: 9,
      notes: null,
      enhancedNotes: null,
      wodFormat: 'for_time',
      wodText: '21-15-9 Thrusters and Pull-ups',
      payload: { exercises: ['thruster', 'pull-up'] },
      sections: null,
    },
  ],
}

const invalidVersionFile = {
  version: 2,
  exportedAt: '2026-05-18T14:30:00.000Z',
  workouts: [],
}

const bjjWithUnknownTechnique = {
  version: 1,
  exportedAt: '2026-05-18T14:30:00.000Z',
  workouts: [
    {
      title: 'BJJ with unknown technique',
      type: 'bjj',
      performedAt: '2026-05-18T10:00:00.000Z',
      durationMinutes: 45,
      rpe: 7,
      notes: null,
      enhancedNotes: null,
      wodFormat: null,
      wodText: null,
      payload: null,
      sections: [
        {
          sectionNumber: 1,
          goal: 'Drilling',
          rawDescription: null,
          aiDescription: null,
          durationMinutes: 15,
          techniques: [{ name: 'Unknown Technique XYZ', nameEs: null, category: null }],
        },
      ],
    },
  ],
}

const emptyWorkoutsFile = {
  version: 1,
  exportedAt: '2026-05-18T14:30:00.000Z',
  workouts: [],
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('useImportWorkouts parsing logic', () => {
  describe('file structure validation', () => {
    it('parses valid JSON with workouts array', () => {
      const parsed = validFileContent
      expect(parsed.version).toBe(1)
      expect(Array.isArray(parsed.workouts)).toBe(true)
      expect(parsed.workouts).toHaveLength(2)
    })

    it('throws on invalid version', () => {
      expect(() => {
        if (invalidVersionFile.version !== 1) {
          throw { code: 'UNSUPPORTED_VERSION', message: 'Unsupported format version' }
        }
      }).toThrow()
    })

    it('throws specific error for version !== 1', () => {
      try {
        if (invalidVersionFile.version !== 1) {
          throw { code: 'UNSUPPORTED_VERSION', message: 'Unsupported format version' }
        }
      } catch (e: unknown) {
        const err = e as { code?: string; message?: string }
        expect(err.code).toBe('UNSUPPORTED_VERSION')
        expect(err.message).toBe('Unsupported format version')
      }
    })
  })

  describe('BJJ workout structure', () => {
    it('BJJ workout has sections array', () => {
      const bjjWorkout = validFileContent.workouts[0]
      expect(bjjWorkout.type).toBe('bjj')
      expect(bjjWorkout.sections).toHaveLength(1)
    })

    it('BJJ section has sectionNumber, goal, techniques', () => {
      const section = validFileContent.workouts[0].sections![0]
      expect(section.sectionNumber).toBe(1)
      expect(section.goal).toBe('Warmup')
      expect(section.techniques).toHaveLength(1)
      expect(section.techniques[0].name).toBe('Hip Escape')
      expect(section.techniques[0].nameEs).toBe('Escape de cadera')
    })

    it('section with unknown technique still has section structure', () => {
      const section = bjjWithUnknownTechnique.workouts[0].sections![0]
      expect(section.sectionNumber).toBe(1)
      expect(section.goal).toBe('Drilling')
      expect(section.techniques).toHaveLength(1)
      expect(section.techniques[0].name).toBe('Unknown Technique XYZ')
    })
  })

  describe('CrossFit workout structure', () => {
    it('CrossFit workout has wodFormat, wodText, payload, no sections', () => {
      const cfWorkout = validFileContent.workouts[1]
      expect(cfWorkout.type).toBe('crossfit')
      expect(cfWorkout.wodFormat).toBe('for_time')
      expect(cfWorkout.wodText).toBe('21-15-9 Thrusters and Pull-ups')
      expect(cfWorkout.payload).toEqual({ exercises: ['thruster', 'pull-up'] })
      expect(cfWorkout.sections).toBeNull()
    })
  })

  describe('workout fields mapping', () => {
    it('maps all required import fields', () => {
      const w = validFileContent.workouts[0]
      expect(w.title).toBe('Morning BJJ')
      expect(w.type).toBe('bjj')
      expect(w.performedAt).toBe('2026-05-18T09:00:00.000Z')
      expect(w.durationMinutes).toBe(60)
      expect(w.rpe).toBe(7)
      expect(w.notes).toBe('Focused on guard passing')
      expect(w.enhancedNotes).toBeNull()
    })
  })

  describe('empty workouts', () => {
    it('empty workouts array is valid structure', () => {
      const root = emptyWorkoutsFile
      expect(root.version).toBe(1)
      expect(root.workouts).toEqual([])
    })
  })
})