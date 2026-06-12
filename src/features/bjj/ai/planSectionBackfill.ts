/**
 * Pure function: plan the database mutations for one BJJ section's
 * backfill step. The function is the boundary contract between the
 * "what does the LLM propose?" layer and the "what do we write to
 * the DB?" layer. The Deno script under `supabase/scripts/` reads
 * this plan and applies it via supabase.from('bjj_roll_events').
 *
 * Rules (per orchestrator brief + design §3.5 re-enhance semantics):
 *   1. Confirmed rows are SACRED. If any existing row has
 *      status='confirmed', the plan skips the section entirely.
 *      Confirmed rows are NEVER deleted or overwritten.
 *   2. Stub rows (PR 1's confidence=0, source='manual',
 *      status='proposed' placeholder) are valid UPSERT targets —
 *      they get overwritten when the LLM has evidence.
 *   3. DELETE BEYOND MAX: existing rows with roll_index >
 *      max(proposed roll_index) are deleted (rows the LLM
 *      didn't propose are stale and get removed).
 *   4. NO DOUBLE-INSERT: the upserts array never contains the
 *      same roll_index twice (the LLM proposal is trusted to
 *      have unique roll_indexes within a section).
 *   5. NO-OP: if no proposed rolls and no existing rows, the
 *      plan is a skip (no DB work needed).
 *
 * The function is pure: same input → same output, no side effects.
 * The Vitest test suite in src/features/bjj/ai/__tests__/planSectionBackfill.test.ts
 * exercises the contract without any DB mocks.
 */

import type { BJJRollProposal } from '../bjj.schema'

/** Subset of bjj_roll_events that planSectionBackfill needs. */
export interface ExistingRollRow {
  roll_index: number
  status: 'proposed' | 'confirmed' | 'rejected'
  source: 'ai_confirmed' | 'ai_edited' | 'manual' | null
  confidence: number | null
}

/**
 * What the LLM produced for a section. A subset of BJJRollProposal
 * with the source pinned to 'manual' (the backfill writes rows
 * with source='manual' so the rollback / re-run filter in
 * design.md §3.5 scopes correctly — same convention as the PR 1
 * SQL stub).
 */
export interface BackfillUpsertRow extends BJJRollProposal {
  source: 'manual'
}

export type BackfillPlan =
  | { action: 'skip'; reason: 'has_confirmed_rolls' | 'no_proposed_rolls' }
  | {
      action: 'upsert'
      sectionId: string
      upserts: BackfillUpsertRow[]
      deletes: Array<{ roll_index: number }>
    }

export interface PlanSectionBackfillInput {
  sectionId: string
  proposedRolls: BJJRollProposal[]
  existingRows: ExistingRollRow[]
}

export function planSectionBackfill(input: PlanSectionBackfillInput): BackfillPlan {
  // Rule 1: confirmed rows are sacred.
  if (input.existingRows.some((r) => r.status === 'confirmed')) {
    return { action: 'skip', reason: 'has_confirmed_rolls' }
  }

  // Rule 2: nothing to upsert → no-op.
  if (input.proposedRolls.length === 0) {
    return { action: 'skip', reason: 'no_proposed_rolls' }
  }

  // Rule 3: compute the new max and identify rows beyond it.
  const newMax = input.proposedRolls.reduce((acc, r) => Math.max(acc, r.roll_index), 0)
  const deletes = input.existingRows
    .filter((r) => r.roll_index > newMax)
    .map((r) => ({ roll_index: r.roll_index }))

  // Rule 4: upserts carry source='manual' so the rollback scope
  // matches the PR 1 SQL stub.
  const upserts: BackfillUpsertRow[] = input.proposedRolls.map((r) => ({
    roll_index: r.roll_index,
    role: r.role,
    outcome: r.outcome,
    position_from: r.position_from,
    position_to: r.position_to,
    technique_names: r.technique_names,
    confidence: r.confidence,
    raw_excerpt: r.raw_excerpt,
    validation_error: r.validation_error,
    source: 'manual',
  }))

  return {
    action: 'upsert',
    sectionId: input.sectionId,
    upserts,
    deletes,
  }
}
