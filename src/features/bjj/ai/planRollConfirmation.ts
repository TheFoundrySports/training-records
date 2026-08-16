/**
 * Pure planner for roll confirmation (REQ-FRM1, D4).
 *
 * Deletes status='proposed' rows and inserts confirmed rolls with offset indices
 * to avoid unique-constraint collision with existing confirmed rolls.
 *
 * @param sectionId - Target section UUID
 * @param existingRolls - Existing rolls from bjj_roll_events for this section
 * @param drafts - Roll drafts from RHF state to confirm
 * @returns Plan with deleteProposed flag and offset inserts
 */

import type { RollConfirmationPlan } from '../bjj.types'

interface ExistingRoll {
  roll_index: number
  status: 'proposed' | 'confirmed'
}

interface RollDraft {
  roll_index: number
  role: string
  outcome: string
  position_from: string
  position_to: string | null
  technique_names: string[]
  confidence: number | null
  raw_excerpt: string | null
  validation_error: string | null
  source: string
}

export function planRollConfirmation(
  sectionId: string,
  existingRolls: ExistingRoll[],
  drafts: RollDraft[]
): RollConfirmationPlan {
  // No-op when drafts are empty
  if (drafts.length === 0) {
    return {
      sectionId,
      deleteProposed: false,
      inserts: [],
    }
  }

  // Check if any proposed rows exist
  const hasProposed = existingRolls.some((r) => r.status === 'proposed')

  // Find max confirmed roll_index
  const confirmedRolls = existingRolls.filter((r) => r.status === 'confirmed')
  const maxConfirmedIndex = confirmedRolls.length > 0 
    ? Math.max(...confirmedRolls.map((r) => r.roll_index))
    : 0

  // Build inserts with offset indices
  const inserts = drafts.map((draft, idx) => ({
    roll_index: maxConfirmedIndex + idx + 1,
    role: draft.role,
    outcome: draft.outcome,
    position_from: draft.position_from,
    position_to: draft.position_to,
    technique_ids: [], // Planner leaves empty; hook maps names→ids (D5)
    status: 'confirmed' as const,
    source: draft.source,
    confidence: draft.confidence,
    raw_excerpt: draft.raw_excerpt,
  }))

  return {
    sectionId,
    deleteProposed: hasProposed,
    inserts,
  }
}
