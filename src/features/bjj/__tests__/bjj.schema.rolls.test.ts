/**
 * RED tests for the BJJ roll-proposal Zod schemas.
 *
 * Covers REQ-RE6 (bjj-section-ai response extension) + REQ-RE7 (prompt rules).
 *
 * The schema must be importable as `BJJSectionAIResponseSchema` and
 * `BJJRollProposalSchema` from `../bjj.schema`. The schema is the
 * boundary contract — anything that the LLM or the mock fallback emits
 * is parsed through it before it crosses to the client.
 *
 * Failure mode: any of these assertions failing means either the
 * schema is missing the field, the field is too loose, or the field
 * is too strict (rejects valid LLM output).
 */

import { describe, it, expect } from 'vitest'
import {
  BJJSectionAIResponseSchema,
  BJJRollProposalSchema,
  BJJPositionKeySchema,
} from '../bjj.schema'

// ── BJJPositionKeySchema — canonical keys from the bjj_positions seed ────────

describe('BJJPositionKeySchema', () => {
  it('accepts all 11 canonical keys from the bjj_positions seed (REQ-PV2)', () => {
    const canonicalKeys = [
      'standing',
      'closed_guard',
      'open_guard',
      'half_guard',
      'side_control',
      'mount',
      'back_control',
      'turtle',
      'knee_on_belly',
      'leg_entanglement',
      'other',
    ]
    for (const key of canonicalKeys) {
      const result = BJJPositionKeySchema.safeParse(key)
      expect(result.success, `expected "${key}" to be a valid position key`).toBe(true)
    }
  })

  it('rejects unknown position keys (free-text must not slip in)', () => {
    const result = BJJPositionKeySchema.safeParse('knee_on_belly_pizza')
    expect(result.success).toBe(false)
  })

  it('rejects empty string', () => {
    const result = BJJPositionKeySchema.safeParse('')
    expect(result.success).toBe(false)
  })
})

// ── BJJRollProposalSchema — the row shape per REQ-RE6 ────────────────────────

describe('BJJRollProposalSchema', () => {
  const validRoll = {
    roll_index: 1,
    role: 'attacking' as const,
    outcome: 'submission' as const,
    position_from: 'closed_guard',
    position_to: 'mount',
    technique_names: ['Triangle Choke', 'Armbar'],
    confidence: 0.82,
    raw_excerpt: 'I rolled with Carlos. From closed guard I swept to mount.',
  }

  it('parses a valid roll with all fields populated', () => {
    const result = BJJRollProposalSchema.safeParse(validRoll)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.roll_index).toBe(1)
      expect(result.data.role).toBe('attacking')
      expect(result.data.position_from).toBe('closed_guard')
    }
  })

  it('defaults technique_names to [] when not provided', () => {
    const { technique_names: _tn, ...rest } = validRoll
    void _tn
    const result = BJJRollProposalSchema.safeParse(rest)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.technique_names).toEqual([])
    }
  })

  it('accepts position_to = null (no transition observed)', () => {
    const result = BJJRollProposalSchema.safeParse({ ...validRoll, position_to: null })
    expect(result.success).toBe(true)
  })

  describe('confidence bounds', () => {
    it('rejects confidence > 1', () => {
      const result = BJJRollProposalSchema.safeParse({ ...validRoll, confidence: 1.5 })
      expect(result.success).toBe(false)
      if (!result.success) {
        const issue = result.error.issues.find((i) => i.path.includes('confidence'))
        expect(issue).toBeDefined()
      }
    })

    it('rejects confidence < 0', () => {
      const result = BJJRollProposalSchema.safeParse({ ...validRoll, confidence: -0.1 })
      expect(result.success).toBe(false)
    })

    it('accepts confidence = 0 (stub row pattern from PR 1 backfill)', () => {
      const result = BJJRollProposalSchema.safeParse({ ...validRoll, confidence: 0 })
      expect(result.success).toBe(true)
    })

    it('accepts confidence = 1 (high-confidence boundary)', () => {
      const result = BJJRollProposalSchema.safeParse({ ...validRoll, confidence: 1 })
      expect(result.success).toBe(true)
    })
  })

  describe('role enum', () => {
    it('rejects unknown role', () => {
      const result = BJJRollProposalSchema.safeParse({ ...validRoll, role: 'spectating' })
      expect(result.success).toBe(false)
    })

    it('accepts all 3 valid roles', () => {
      for (const role of ['attacking', 'defending', 'neutral'] as const) {
        const result = BJJRollProposalSchema.safeParse({ ...validRoll, role })
        expect(result.success).toBe(true)
      }
    })
  })

  describe('outcome enum', () => {
    it('rejects unknown outcome', () => {
      const result = BJJRollProposalSchema.safeParse({ ...validRoll, outcome: 'draw' })
      expect(result.success).toBe(false)
    })

    it('accepts all 4 valid outcomes', () => {
      for (const outcome of [
        'submission',
        'position_gain',
        'position_loss',
        'neutral',
      ] as const) {
        const result = BJJRollProposalSchema.safeParse({ ...validRoll, outcome })
        expect(result.success).toBe(true)
      }
    })
  })

  describe('position key validation', () => {
    it('rejects unknown position_from', () => {
      const result = BJJRollProposalSchema.safeParse({
        ...validRoll,
        position_from: 'knee_on_belly_pizza',
      })
      expect(result.success).toBe(false)
    })

    it('rejects unknown position_to (string)', () => {
      const result = BJJRollProposalSchema.safeParse({
        ...validRoll,
        position_to: 'standing_pass_advanced',
      })
      expect(result.success).toBe(false)
    })

    it('accepts null position_to even when validation_error is set', () => {
      const result = BJJRollProposalSchema.safeParse({
        ...validRoll,
        position_to: null,
        validation_error: 'unknown_position_to',
      })
      expect(result.success).toBe(true)
    })
  })

  describe('roll_index', () => {
    it('rejects roll_index = 0 (must be 1-based positive)', () => {
      const result = BJJRollProposalSchema.safeParse({ ...validRoll, roll_index: 0 })
      expect(result.success).toBe(false)
    })

    it('rejects negative roll_index', () => {
      const result = BJJRollProposalSchema.safeParse({ ...validRoll, roll_index: -1 })
      expect(result.success).toBe(false)
    })

    it('rejects non-integer roll_index', () => {
      const result = BJJRollProposalSchema.safeParse({ ...validRoll, roll_index: 1.5 })
      expect(result.success).toBe(false)
    })
  })

  it('accepts an optional validation_error enum', () => {
    const result = BJJRollProposalSchema.safeParse({
      ...validRoll,
      validation_error: 'unknown_position_from',
    })
    expect(result.success).toBe(true)
  })
})

// ── BJJSectionAIResponseSchema — the LLM/mock response envelope ──────────────

describe('BJJSectionAIResponseSchema', () => {
  const validResponse = {
    ai_description: 'Enhanced: rolled 5 rounds, swept 2.',
    matched_technique_ids: ['550e8400-e29b-41d4-a716-446655440000'],
    rolls: [
      {
        roll_index: 1,
        role: 'attacking' as const,
        outcome: 'position_gain' as const,
        position_from: 'closed_guard',
        position_to: 'mount',
        technique_names: ['Scissor Sweep'],
        confidence: 0.85,
        raw_excerpt: 'From closed guard I swept to mount.',
      },
    ],
  }

  it('parses a valid response with rolls[] populated (sparring section)', () => {
    const result = BJJSectionAIResponseSchema.safeParse(validResponse)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.rolls).toHaveLength(1)
      expect(result.data.rolls[0].position_from).toBe('closed_guard')
    }
  })

  it('parses a valid response with empty rolls[] (drilling-only section)', () => {
    const result = BJJSectionAIResponseSchema.safeParse({
      ...validResponse,
      rolls: [],
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.rolls).toEqual([])
    }
  })

  it('defaults rolls to [] when the field is absent (mock fallback safety)', () => {
    // The mock fallback in bjj-section-ai/index.ts may not include the rolls
    // field at all (older contract); the schema must default to [].
    const { rolls: _r, ...withoutRolls } = validResponse
    void _r
    const result = BJJSectionAIResponseSchema.safeParse(withoutRolls)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.rolls).toEqual([])
    }
  })

  it('rejects missing ai_description', () => {
    const { ai_description: _d, ...rest } = validResponse
    void _d
    const result = BJJSectionAIResponseSchema.safeParse(rest)
    expect(result.success).toBe(false)
  })

  it('rejects missing matched_technique_ids', () => {
    const { matched_technique_ids: _t, ...rest } = validResponse
    void _t
    const result = BJJSectionAIResponseSchema.safeParse(rest)
    expect(result.success).toBe(false)
  })

  it('rejects matched_technique_ids that contain non-UUID strings', () => {
    const result = BJJSectionAIResponseSchema.safeParse({
      ...validResponse,
      matched_technique_ids: ['not-a-uuid'],
    })
    expect(result.success).toBe(false)
  })

  it('rejects a roll with bad confidence inside the rolls[]', () => {
    const result = BJJSectionAIResponseSchema.safeParse({
      ...validResponse,
      rolls: [
        {
          ...validResponse.rolls[0],
          confidence: 1.5,
        },
      ],
    })
    expect(result.success).toBe(false)
  })

  it('rejects a roll with unknown position_from inside the rolls[]', () => {
    const result = BJJSectionAIResponseSchema.safeParse({
      ...validResponse,
      rolls: [
        {
          ...validResponse.rolls[0],
          position_from: 'invalid_key',
        },
      ],
    })
    expect(result.success).toBe(false)
  })
})
