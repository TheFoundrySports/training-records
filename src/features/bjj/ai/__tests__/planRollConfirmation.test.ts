/**
 * RED tests for planRollConfirmation pure function (REQ-FRM1 task 1.6, D4).
 *
 * Covers:
 * - Empty drafts → no-op plan
 * - Confirmed rows survive delete
 * - Roll indices offset above max existing
 */

import { describe, it, expect } from 'vitest'
import { planRollConfirmation } from '../planRollConfirmation'

describe('planRollConfirmation (task 1.10)', () => {
  const sectionId = '550e8400-e29b-41d4-a716-446655440000'

  it('returns no-op plan when drafts array is empty', () => {
    const plan = planRollConfirmation(sectionId, [], [])
    expect(plan.sectionId).toBe(sectionId)
    expect(plan.deleteProposed).toBe(false)
    expect(plan.inserts).toEqual([])
  })

  it('marks deleteProposed = true when existing proposed rows exist', () => {
    const existingRolls = [
      { roll_index: 1, status: 'proposed' as const },
      { roll_index: 2, status: 'confirmed' as const },
    ]
    const drafts = [
      {
        roll_index: 1,
        role: 'attacking' as const,
        outcome: 'submission' as const,
        position_from: 'closed_guard',
        position_to: 'mount',
        technique_names: ['Triangle'],
        confidence: 0.85,
        raw_excerpt: 'From guard',
        validation_error: null,
        source: 'ai_confirmed' as const,
      },
    ]
    const plan = planRollConfirmation(sectionId, existingRolls, drafts)
    expect(plan.deleteProposed).toBe(true)
  })

  it('offsets roll indices above max existing confirmed index', () => {
    const existingRolls = [
      { roll_index: 1, status: 'confirmed' as const },
      { roll_index: 2, status: 'confirmed' as const },
      { roll_index: 3, status: 'proposed' as const },
    ]
    const drafts = [
      {
        roll_index: 1,
        role: 'attacking' as const,
        outcome: 'submission' as const,
        position_from: 'closed_guard',
        position_to: 'mount',
        technique_names: [],
        confidence: 0.85,
        raw_excerpt: 'Roll 1',
        validation_error: null,
        source: 'ai_confirmed' as const,
      },
      {
        roll_index: 2,
        role: 'defending' as const,
        outcome: 'position_loss' as const,
        position_from: 'side_control',
        position_to: null,
        technique_names: [],
        confidence: 0.75,
        raw_excerpt: 'Roll 2',
        validation_error: null,
        source: 'ai_edited' as const,
      },
    ]
    const plan = planRollConfirmation(sectionId, existingRolls, drafts)
    expect(plan.inserts).toHaveLength(2)
    expect(plan.inserts[0].roll_index).toBe(3) // max confirmed was 2, so start at 3
    expect(plan.inserts[1].roll_index).toBe(4)
    expect(plan.inserts[0].status).toBe('confirmed')
    expect(plan.inserts[0].source).toBe('ai_confirmed')
    expect(plan.inserts[1].source).toBe('ai_edited')
  })

  it('starts at index 1 when no existing rolls', () => {
    const drafts = [
      {
        roll_index: 1,
        role: 'neutral' as const,
        outcome: 'neutral' as const,
        position_from: 'standing',
        position_to: 'closed_guard',
        technique_names: [],
        confidence: null,
        raw_excerpt: null,
        validation_error: null,
        source: 'manual' as const,
      },
    ]
    const plan = planRollConfirmation(sectionId, [], drafts)
    expect(plan.inserts).toHaveLength(1)
    expect(plan.inserts[0].roll_index).toBe(1)
  })

  it('maps technique_names to empty technique_ids array (D5 - names→ids done by hook)', () => {
    const drafts = [
      {
        roll_index: 1,
        role: 'attacking' as const,
        outcome: 'submission' as const,
        position_from: 'closed_guard',
        position_to: 'mount',
        technique_names: ['Triangle', 'Armbar'],
        confidence: 0.85,
        raw_excerpt: 'From guard',
        validation_error: null,
        source: 'ai_confirmed' as const,
      },
    ]
    const plan = planRollConfirmation(sectionId, [], drafts)
    // Planner does NOT map names→ids; hook does that (D5)
    expect(plan.inserts[0].technique_ids).toEqual([])
  })
})
