/**
 * RED tests for BJJ roll draft schemas (REQ-FRM1 foundation).
 *
 * Covers:
 * - BJJRollSourceSchema (task 1.1)
 * - BJJRollDraftSchema (task 1.2)
 * - Section rolls array and superRefine gate (tasks 1.3, 1.4)
 */

import { describe, it, expect } from 'vitest'
import { BJJRollSourceSchema, BJJRollDraftSchema, bjjSectionSchema, bjjWorkoutSchema } from '../bjj.schema'

// ── Task 1.1: BJJRollSourceSchema ──────────────────────────────────────────

describe('BJJRollSourceSchema', () => {
  it('accepts ai_confirmed', () => {
    const result = BJJRollSourceSchema.safeParse('ai_confirmed')
    expect(result.success).toBe(true)
  })

  it('accepts ai_edited', () => {
    const result = BJJRollSourceSchema.safeParse('ai_edited')
    expect(result.success).toBe(true)
  })

  it('accepts manual', () => {
    const result = BJJRollSourceSchema.safeParse('manual')
    expect(result.success).toBe(true)
  })

  it('rejects unknown source', () => {
    const result = BJJRollSourceSchema.safeParse('ai_generated')
    expect(result.success).toBe(false)
  })

  it('rejects empty string', () => {
    const result = BJJRollSourceSchema.safeParse('')
    expect(result.success).toBe(false)
  })
})

// ── Task 1.2: BJJRollDraftSchema ──────────────────────────────────────────

describe('BJJRollDraftSchema', () => {
  const validDraft = {
    roll_index: 1,
    role: 'attacking' as const,
    outcome: 'submission' as const,
    position_from: 'closed_guard',
    position_to: 'mount',
    technique_names: ['Triangle Choke'],
    confidence: 0.82,
    raw_excerpt: 'From closed guard I secured a triangle choke',
    validation_error: null,
    source: 'ai_confirmed' as const,
  }

  it('parses a valid draft with all fields populated', () => {
    const result = BJJRollDraftSchema.safeParse(validDraft)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.source).toBe('ai_confirmed')
      expect(result.data.confidence).toBe(0.82)
      expect(result.data.validation_error).toBe(null)
    }
  })

  it('accepts nullable confidence (edited draft without AI confidence)', () => {
    const result = BJJRollDraftSchema.safeParse({
      ...validDraft,
      confidence: null,
    })
    expect(result.success).toBe(true)
  })

  it('accepts nullable raw_excerpt (manual roll)', () => {
    const result = BJJRollDraftSchema.safeParse({
      ...validDraft,
      raw_excerpt: null,
      source: 'manual',
    })
    expect(result.success).toBe(true)
  })

  it('accepts nullable validation_error (valid positions)', () => {
    const result = BJJRollDraftSchema.safeParse({
      ...validDraft,
      validation_error: null,
    })
    expect(result.success).toBe(true)
  })

  it('accepts validation_error = unknown_position_from', () => {
    const result = BJJRollDraftSchema.safeParse({
      ...validDraft,
      validation_error: 'unknown_position_from',
    })
    expect(result.success).toBe(true)
  })

  it('requires source field', () => {
    const { source: _s, ...withoutSource } = validDraft
    void _s
    const result = BJJRollDraftSchema.safeParse(withoutSource)
    expect(result.success).toBe(false)
  })
})

// ── Task 1.3: Section rolls array ──────────────────────────────────────────

describe('bjjSectionSchema with rolls array', () => {
  it('accepts a section with empty rolls array', () => {
    const result = bjjSectionSchema.safeParse({
      goal: 'Sparring rounds',
      rolls: [],
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.rolls).toEqual([])
    }
  })

  it('defaults rolls to [] when not provided', () => {
    const result = bjjSectionSchema.safeParse({
      goal: 'Drilling',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.rolls).toEqual([])
    }
  })

  it('accepts a section with valid roll drafts', () => {
    const result = bjjSectionSchema.safeParse({
      goal: 'Sparring',
      rolls: [
        {
          roll_index: 1,
          role: 'attacking',
          outcome: 'submission',
          position_from: 'closed_guard',
          position_to: 'mount',
          technique_names: ['Triangle'],
          confidence: 0.85,
          raw_excerpt: 'From guard I swept to mount',
          validation_error: null,
          source: 'ai_confirmed',
        },
      ],
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.rolls).toHaveLength(1)
      expect(result.data.rolls[0].source).toBe('ai_confirmed')
    }
  })
})

// ── Task 1.4: superRefine gate for validation_error ────────────────────────

describe('bjjWorkoutSchema superRefine gate (REQ-FRM1 D2)', () => {
  const validWorkout = {
    title: 'Morning Training',
    performedAt: '2026-08-16T09:00:00.000Z',
    durationMinutes: 90,
    sections: [
      {
        goal: 'Drilling',
        rolls: [],
      },
    ],
  }

  it('accepts workout when all rolls have validation_error = null', () => {
    const result = bjjWorkoutSchema.safeParse({
      ...validWorkout,
      sections: [
        {
          goal: 'Sparring',
          rolls: [
            {
              roll_index: 1,
              role: 'attacking',
              outcome: 'submission',
              position_from: 'closed_guard',
              position_to: 'mount',
              technique_names: [],
              confidence: 0.85,
              raw_excerpt: 'From guard',
              validation_error: null,
              source: 'ai_confirmed',
            },
          ],
        },
      ],
    })
    expect(result.success).toBe(true)
  })

  it('blocks workout when any roll has validation_error = unknown_position_from', () => {
    const result = bjjWorkoutSchema.safeParse({
      ...validWorkout,
      sections: [
        {
          goal: 'Sparring',
          rolls: [
            {
              roll_index: 1,
              role: 'attacking',
              outcome: 'submission',
              position_from: 'closed_guard',
              position_to: 'mount',
              technique_names: [],
              confidence: 0.85,
              raw_excerpt: 'From guard',
              validation_error: 'unknown_position_from',
              source: 'ai_confirmed',
            },
          ],
        },
      ],
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const issue = result.error.issues.find((i) => 
        i.path.includes('sections') && i.path.includes('rolls') && i.path.includes('position_from')
      )
      expect(issue).toBeDefined()
    }
  })

  it('blocks workout when any roll has validation_error = unknown_position_to', () => {
    const result = bjjWorkoutSchema.safeParse({
      ...validWorkout,
      sections: [
        {
          goal: 'Sparring',
          rolls: [
            {
              roll_index: 1,
              role: 'attacking',
              outcome: 'position_gain',
              position_from: 'closed_guard',
              position_to: null,
              technique_names: [],
              confidence: 0.85,
              raw_excerpt: 'From guard',
              validation_error: 'unknown_position_to',
              source: 'ai_confirmed',
            },
          ],
        },
      ],
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const issue = result.error.issues.find((i) => 
        i.path.includes('sections') && i.path.includes('rolls') && i.path.includes('position_to')
      )
      expect(issue).toBeDefined()
    }
  })

  it('reports all invalid rolls in multiple sections', () => {
    const result = bjjWorkoutSchema.safeParse({
      ...validWorkout,
      sections: [
        {
          goal: 'First round',
          rolls: [
            {
              roll_index: 1,
              role: 'attacking',
              outcome: 'submission',
              position_from: 'closed_guard',
              position_to: 'mount',
              technique_names: [],
              confidence: 0.85,
              raw_excerpt: 'Roll 1',
              validation_error: 'unknown_position_from',
              source: 'ai_confirmed',
            },
          ],
        },
        {
          goal: 'Second round',
          rolls: [
            {
              roll_index: 1,
              role: 'defending',
              outcome: 'position_loss',
              position_from: 'side_control',
              position_to: null,
              technique_names: [],
              confidence: 0.75,
              raw_excerpt: 'Roll 2',
              validation_error: 'unknown_position_to',
              source: 'ai_confirmed',
            },
          ],
        },
      ],
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      // Should have at least 2 issues
      const rollIssues = result.error.issues.filter((i) => i.path.includes('rolls'))
      expect(rollIssues.length).toBeGreaterThanOrEqual(2)
    }
  })
})

