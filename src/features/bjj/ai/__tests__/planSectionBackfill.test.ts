/**
 * RED tests for the EF-driven richer backfill helper.
 *
 * Covers the orchestrator brief's PR 2 commitment: "The EF-driven backfill
 * in this PR must safely replace or skip those rows" (the PR 1 SQL stub
 * rows). Recommended approach (per the brief): UPSERT by
 * (section_id, roll_index) so EF rows overwrite stubs.
 *
 * The pure function `planSectionBackfill` is the boundary contract that
 * the Vitest tests exercise. The script (commit 10) reads this plan
 * and applies it to the database via supabase.from('bjj_roll_events').
 *
 * Rules locked by tests:
 *   1. IDEMPOTENCY: running planSectionBackfill twice with the same
 *      input returns the same plan (pure function).
 *   2. CONFIRMED rows are SACRED — if any existing row has status='confirmed',
 *      the plan skips the section entirely. Confirmed rows are never
 *      deleted (per design §3.5 re-enhance semantics).
 *   3. STUB rows (PR 1's confidence=0, source='manual', status='proposed'
 *      placeholder) are valid UPSERT targets — they get overwritten
 *      when the LLM has evidence (UPSERT by (section_id, roll_index)).
 *   4. DELETE BEYOND MAX: existing rows with roll_index > max(proposed)
 *      are deleted. Stub rows have roll_index=1, so they survive
 *      unless explicitly replaced by a same-index LLM proposal.
 *   5. NO DOUBLE-INSERT: the upserts array never contains the same
 *      roll_index twice.
 */

import { describe, it, expect } from 'vitest'
import { planSectionBackfill } from '../planSectionBackfill'

// ── Test fixtures ────────────────────────────────────────────────────────────

const ROLL_1 = {
  roll_index: 1,
  role: 'attacking' as const,
  outcome: 'position_gain' as const,
  position_from: 'closed_guard' as const,
  position_to: 'mount' as const,
  technique_names: ['Scissor Sweep'],
  confidence: 0.85,
  raw_excerpt: 'I swept from closed guard to mount.',
}

const ROLL_2 = {
  roll_index: 2,
  role: 'defending' as const,
  outcome: 'position_loss' as const,
  position_from: 'mount' as const,
  position_to: 'back_control' as const,
  technique_names: [],
  confidence: 0.7,
  raw_excerpt: 'Got swept to back.',
}

// ── Confirmed rows are sacred ────────────────────────────────────────────────

describe('planSectionBackfill — confirmed rows are sacred', () => {
  it('skips a section that has any confirmed row', () => {
    const plan = planSectionBackfill({
      sectionId: 'sec-1',
      proposedRolls: [ROLL_1],
      existingRows: [
        {
          roll_index: 1,
          status: 'confirmed',
          source: 'ai_confirmed',
          confidence: 0.9,
        },
      ],
    })
    expect(plan).toEqual({ action: 'skip', reason: 'has_confirmed_rolls' })
  })

  it('skips a section that has confirmed rows mixed with proposed rows', () => {
    const plan = planSectionBackfill({
      sectionId: 'sec-1',
      proposedRolls: [ROLL_1],
      existingRows: [
        { roll_index: 1, status: 'proposed' as const, source: 'manual' as const, confidence: 0 },
        { roll_index: 2, status: 'confirmed' as const, source: 'ai_confirmed' as const, confidence: 0.9 },
      ],
    })
    expect(plan).toEqual({ action: 'skip', reason: 'has_confirmed_rolls' })
  })

  it('never includes a confirmed row in deletes', () => {
    // Defensive: even if the function were to fall through to deletes
    // (which it shouldn't, because of rule 2), confirmed rows are sacred.
    // We test this by passing a section with confirmed + proposed rows
    // and asserting the plan is a skip — so no deletes array is produced.
    const plan = planSectionBackfill({
      sectionId: 'sec-1',
      proposedRolls: [ROLL_1],
      existingRows: [
        { roll_index: 1, status: 'confirmed' as const, source: 'ai_confirmed' as const, confidence: 0.9 },
      ],
    })
    expect(plan.action).toBe('skip')
  })
})

// ── UPSERT on stub rows (PR 1's confidence=0, source='manual') ───────────────

describe('planSectionBackfill — UPSERT over PR 1 stub rows', () => {
  it('upserts a new roll when the only existing row is a stub', () => {
    const plan = planSectionBackfill({
      sectionId: 'sec-1',
      proposedRolls: [ROLL_1],
      existingRows: [
        { roll_index: 1, status: 'proposed' as const, source: 'manual' as const, confidence: 0 },
      ],
    })
    expect(plan.action).toBe('upsert')
    if (plan.action === 'upsert') {
      expect(plan.upserts).toHaveLength(1)
      expect(plan.upserts[0].roll_index).toBe(1)
      expect(plan.upserts[0].confidence).toBe(0.85)
      // The upsert sets source='manual' so the rollback / re-run filter
      // in design.md §3.5 scopes correctly.
      expect(plan.upserts[0].source).toBe('manual')
    }
  })

  it('upserts over a stub with the same roll_index (no double-insert)', () => {
    const plan = planSectionBackfill({
      sectionId: 'sec-1',
      proposedRolls: [ROLL_1],
      existingRows: [
        { roll_index: 1, status: 'proposed' as const, source: 'manual' as const, confidence: 0 },
      ],
    })
    if (plan.action === 'upsert') {
      const rollIndexes = plan.upserts.map((r) => r.roll_index)
      expect(rollIndexes).toEqual([1])
      expect(new Set(rollIndexes).size).toBe(rollIndexes.length)
    }
  })

  it('upserts a new roll when there are no existing rows at all', () => {
    const plan = planSectionBackfill({
      sectionId: 'sec-1',
      proposedRolls: [ROLL_1, ROLL_2],
      existingRows: [],
    })
    expect(plan.action).toBe('upsert')
    if (plan.action === 'upsert') {
      expect(plan.upserts).toHaveLength(2)
      expect(plan.deletes).toEqual([])
    }
  })
})

// ── DELETE beyond max roll_index ─────────────────────────────────────────────

describe('planSectionBackfill — DELETE beyond max roll_index', () => {
  it('deletes existing proposed rows with roll_index > max(proposed)', () => {
    const plan = planSectionBackfill({
      sectionId: 'sec-1',
      proposedRolls: [ROLL_1], // roll_index=1
      existingRows: [
        { roll_index: 1, status: 'proposed' as const, source: 'manual' as const, confidence: 0 },
        { roll_index: 2, status: 'proposed' as const, source: 'manual' as const, confidence: 0 },
        { roll_index: 3, status: 'proposed' as const, source: 'manual' as const, confidence: 0 },
      ],
    })
    expect(plan.action).toBe('upsert')
    if (plan.action === 'upsert') {
      // roll_index=1 is UPSERTed; 2 and 3 are deleted (beyond new max=1)
      expect(plan.upserts).toHaveLength(1)
      expect(plan.deletes).toEqual([{ roll_index: 2 }, { roll_index: 3 }])
    }
  })

  it('does not delete existing rows with roll_index <= max(proposed)', () => {
    const plan = planSectionBackfill({
      sectionId: 'sec-1',
      proposedRolls: [ROLL_1, ROLL_2], // max=2
      existingRows: [
        { roll_index: 1, status: 'proposed' as const, source: 'manual' as const, confidence: 0 },
        { roll_index: 2, status: 'proposed' as const, source: 'manual' as const, confidence: 0 },
      ],
    })
    if (plan.action === 'upsert') {
      expect(plan.deletes).toEqual([])
    }
  })
})

// ── No-op cases ──────────────────────────────────────────────────────────────

describe('planSectionBackfill — no-op cases', () => {
  it('skips a section with no proposed rolls and no existing rows', () => {
    const plan = planSectionBackfill({
      sectionId: 'sec-1',
      proposedRolls: [],
      existingRows: [],
    })
    expect(plan).toEqual({ action: 'skip', reason: 'no_proposed_rolls' })
  })

  it('skips a section with no proposed rolls even when stub rows exist', () => {
    // The LLM has no evidence for this section — leave the stub alone.
    const plan = planSectionBackfill({
      sectionId: 'sec-1',
      proposedRolls: [],
      existingRows: [
        { roll_index: 1, status: 'proposed' as const, source: 'manual' as const, confidence: 0 },
      ],
    })
    expect(plan).toEqual({ action: 'skip', reason: 'no_proposed_rolls' })
  })
})

// ── Idempotency ──────────────────────────────────────────────────────────────

describe('planSectionBackfill — idempotency', () => {
  it('running twice on the same input returns the same plan', () => {
    const input = {
      sectionId: 'sec-1',
      proposedRolls: [ROLL_1, ROLL_2],
      existingRows: [
        { roll_index: 1, status: 'proposed' as const, source: 'manual' as const, confidence: 0 },
      ],
    }
    const plan1 = planSectionBackfill(input)
    const plan2 = planSectionBackfill(input)
    expect(plan1).toEqual(plan2)
  })

  it('applying the plan + re-planning produces the same final state (no double-insert)', () => {
    // Simulate: take plan1, "apply" it (swap the stub row for the new
    // upsert), then re-plan. The second plan should be a no-op skip OR
    // an upsert that matches plan1 exactly.
    const input1 = {
      sectionId: 'sec-1',
      proposedRolls: [ROLL_1],
      existingRows: [
        { roll_index: 1, status: 'proposed' as const, source: 'manual' as const, confidence: 0 },
      ],
    }
    const plan1 = planSectionBackfill(input1)
    expect(plan1.action).toBe('upsert')

    // After "applying" plan1, the stub row is replaced with the upsert.
    // The new state has the upserted row at roll_index=1 with status='proposed'.
    const appliedState = [
      { roll_index: 1, status: 'proposed' as const, source: 'manual' as const, confidence: 0.85 },
    ]
    const plan2 = planSectionBackfill({
      ...input1,
      existingRows: appliedState,
    })
    expect(plan2.action).toBe('upsert')
    if (plan1.action === 'upsert' && plan2.action === 'upsert') {
      expect(plan2.upserts).toEqual(plan1.upserts)
      expect(plan2.deletes).toEqual(plan1.deletes)
    }
  })
})

// ── Pure function guarantee ──────────────────────────────────────────────────

describe('planSectionBackfill — pure function', () => {
  it('does not mutate the input arrays', () => {
    const proposedRolls = [ROLL_1]
    const existingRows = [
      { roll_index: 1, status: 'proposed' as const, source: 'manual' as const, confidence: 0 },
    ]
    const proposedSnapshot = JSON.parse(JSON.stringify(proposedRolls))
    const existingSnapshot = JSON.parse(JSON.stringify(existingRows))
    planSectionBackfill({
      sectionId: 'sec-1',
      proposedRolls,
      existingRows,
    })
    expect(proposedRolls).toEqual(proposedSnapshot)
    expect(existingRows).toEqual(existingSnapshot)
  })
})
