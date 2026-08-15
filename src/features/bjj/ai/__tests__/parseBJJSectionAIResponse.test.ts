/**
 * RED tests for `parseBJJSectionAIResponse` pure function.
 *
 * Covers REQ-RE6 (bjj-section-ai response shape). The function is a
 * discriminated wrapper around BJJSectionAIResponseSchema.safeParse.
 * The EF (Deno) imports the same module via relative path; the Vitest
 * test imports it via relative path. There is exactly one copy of the
 * logic, in src/features/bjj/ai/parseBJJSectionAIResponse.ts.
 *
 * Why a pure function and not just a direct call to the schema?
 *   - The EF needs a discriminated result (ok/error) so the 422 response
 *     shape can carry the Zod issues verbatim.
 *   - The Deno harness can't be exercised from Vitest, but a pure function
 *     that wraps the Zod schema is trivial to test here.
 *   - Commit 6 (the EF refactor) will swap the LLM path's hand-rolled
 *     validation for this function. By the time that lands, the contract
 *     is locked in by these tests.
 *
 * The test file imports from a path that does not exist YET — it
 * therefore fails RED on import. When the function lands in commit 6,
 * these tests must pass without modification.
 */

import { describe, it, expect } from 'vitest'
import {
  parseBJJSectionAIResponse,
  type ParseBJJSectionAIResponseResult,
} from '../parseBJJSectionAIResponse'

const VALID_ROLL = {
  roll_index: 1,
  role: 'attacking' as const,
  outcome: 'submission' as const,
  position_from: 'closed_guard',
  position_to: 'mount',
  technique_names: ['Triangle Choke'],
  confidence: 0.82,
  raw_excerpt: 'I rolled with Carlos. From closed guard I swept to mount.',
}

const VALID_RESPONSE = {
  ai_description: 'Enhanced: rolled 5 rounds, swept 2.',
  matched_technique_ids: ['550e8400-e29b-41d4-a716-446655440000'],
  rolls: [VALID_ROLL],
}

// ── Happy path: schema-conformant payloads parse to ok=true ───────────────────

describe('parseBJJSectionAIResponse — happy path', () => {
  it('parses a valid LLM response with rolls[] populated', () => {
    const result: ParseBJJSectionAIResponseResult = parseBJJSectionAIResponse(VALID_RESPONSE)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.ai_description).toBe('Enhanced: rolled 5 rounds, swept 2.')
      expect(result.data.rolls).toHaveLength(1)
      expect(result.data.rolls[0].position_from).toBe('closed_guard')
      expect(result.data.rolls[0].position_to).toBe('mount')
    }
  })

  it('parses a valid response with empty rolls[] (drilling-only section)', () => {
    const result = parseBJJSectionAIResponse({
      ...VALID_RESPONSE,
      rolls: [],
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.rolls).toEqual([])
    }
  })

  it('parses a response with absent rolls (mock fallback) by defaulting to []', () => {
    // The mock fallback in the EF may emit a payload without the rolls field
    // (older contract shape). The parse must not reject it; the schema's
    // .default([]) on the rolls field covers this case.
    const { rolls: _r, ...withoutRolls } = VALID_RESPONSE
    void _r
    const result = parseBJJSectionAIResponse(withoutRolls)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.rolls).toEqual([])
    }
  })

  it('preserves a null position_to verbatim', () => {
    const result = parseBJJSectionAIResponse({
      ...VALID_RESPONSE,
      rolls: [{ ...VALID_ROLL, position_to: null }],
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.rolls[0].position_to).toBeNull()
    }
  })
})

// ── Reject path: every contract violation is ok=false with issues[] ──────────

describe('parseBJJSectionAIResponse — reject path', () => {
  it('rejects null input', () => {
    const result = parseBJJSectionAIResponse(null)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('INVALID_AI_RESPONSE')
      expect(result.error.issues.length).toBeGreaterThan(0)
    }
  })

  it('rejects missing ai_description', () => {
    const { ai_description: _d, ...rest } = VALID_RESPONSE
    void _d
    const result = parseBJJSectionAIResponse(rest)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      const issue = result.error.issues.find((i) => i.path === 'ai_description')
      expect(issue).toBeDefined()
    }
  })

  it('rejects missing matched_technique_ids', () => {
    const { matched_technique_ids: _t, ...rest } = VALID_RESPONSE
    void _t
    const result = parseBJJSectionAIResponse(rest)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      const issue = result.error.issues.find((i) => i.path === 'matched_technique_ids')
      expect(issue).toBeDefined()
    }
  })

  it('rejects matched_technique_ids containing a non-UUID string', () => {
    const result = parseBJJSectionAIResponse({
      ...VALID_RESPONSE,
      matched_technique_ids: ['not-a-uuid'],
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      const issue = result.error.issues.find((i) =>
        i.path.startsWith('matched_technique_ids'),
      )
      expect(issue).toBeDefined()
    }
  })

  it('rejects rolls[0].confidence > 1 (out of bounds)', () => {
    const result = parseBJJSectionAIResponse({
      ...VALID_RESPONSE,
      rolls: [{ ...VALID_ROLL, confidence: 1.5 }],
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      const issue = result.error.issues.find((i) => i.path === 'rolls.0.confidence')
      expect(issue).toBeDefined()
      // Zod v4 emits a "Too big" message; we just assert the issue is present
      // (the boundary enforcement is the real assertion — the message text is
      // a Zod implementation detail that may change between versions).
      expect(issue!.message).toMatch(/too big|<=\s*1/i)
    }
  })

  it('rejects rolls[0].confidence < 0 (out of bounds)', () => {
    const result = parseBJJSectionAIResponse({
      ...VALID_RESPONSE,
      rolls: [{ ...VALID_ROLL, confidence: -0.1 }],
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      const issue = result.error.issues.find((i) => i.path === 'rolls.0.confidence')
      expect(issue).toBeDefined()
    }
  })

  it('rejects rolls[0].position_from = "invalid_key" (not in bjj_positions)', () => {
    const result = parseBJJSectionAIResponse({
      ...VALID_RESPONSE,
      rolls: [{ ...VALID_ROLL, position_from: 'invalid_key' }],
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      const issue = result.error.issues.find((i) => i.path === 'rolls.0.position_from')
      expect(issue).toBeDefined()
    }
  })

  it('rejects rolls[0].position_to = "invalid_key" (not in bjj_positions)', () => {
    const result = parseBJJSectionAIResponse({
      ...VALID_RESPONSE,
      rolls: [{ ...VALID_ROLL, position_to: 'standing_pass_advanced' }],
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      const issue = result.error.issues.find((i) => i.path === 'rolls.0.position_to')
      expect(issue).toBeDefined()
    }
  })

  it('rejects rolls[0].roll_index = 0 (must be 1-based positive)', () => {
    const result = parseBJJSectionAIResponse({
      ...VALID_RESPONSE,
      rolls: [{ ...VALID_ROLL, roll_index: 0 }],
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      const issue = result.error.issues.find((i) => i.path === 'rolls.0.roll_index')
      expect(issue).toBeDefined()
    }
  })

  it('rejects rolls[0].role = "spectating" (unknown enum value)', () => {
    const result = parseBJJSectionAIResponse({
      ...VALID_RESPONSE,
      rolls: [{ ...VALID_ROLL, role: 'spectating' as never }],
    })
    expect(result.ok).toBe(false)
  })

  it('rejects rolls[0].outcome = "draw" (unknown enum value)', () => {
    const result = parseBJJSectionAIResponse({
      ...VALID_RESPONSE,
      rolls: [{ ...VALID_ROLL, outcome: 'draw' as never }],
    })
    expect(result.ok).toBe(false)
  })

  it('surfaces a Zod issue for the rolls[0].raw_excerpt when missing', () => {
    const result = parseBJJSectionAIResponse({
      ...VALID_RESPONSE,
      rolls: [{ ...VALID_ROLL, raw_excerpt: '' }],
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      const issue = result.error.issues.find((i) => i.path === 'rolls.0.raw_excerpt')
      expect(issue).toBeDefined()
    }
  })
})

// ── Error envelope shape (the EF uses this to surface 422) ───────────────────

describe('parseBJJSectionAIResponse — error envelope', () => {
  it('returns a stable error code on any rejection', () => {
    const result = parseBJJSectionAIResponse({})
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('INVALID_AI_RESPONSE')
    }
  })

  it('maps Zod issues into a flat { path, message }[] with dotted paths', () => {
    const result = parseBJJSectionAIResponse({
      ...VALID_RESPONSE,
      rolls: [{ ...VALID_ROLL, confidence: 1.5, position_from: 'invalid_key' }],
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      const paths = result.error.issues.map((i) => i.path)
      expect(paths).toContain('rolls.0.confidence')
      expect(paths).toContain('rolls.0.position_from')
    }
  })
})
