export type BJJCategory = 'guard' | 'takedown' | 'submission' | 'escape' | 'transition' | 'guard_pass' | 'other'

export interface BJJTechnique {
  id: string
  name: string
  name_es?: string
  description?: string
  category?: BJJCategory
  youtubeUrl?: string
  createdAt: string
  updatedAt: string
}

export interface BJJSection {
  id: string
  workoutId: string
  sectionNumber: number
  goal: string
  rawDescription?: string
  aiDescription?: string
  durationMinutes?: number
  techniques: BJJTechnique[]
  enhancedNotes?: string
  createdAt: string
}

/** BJJ workout is a regular Workout with type === 'bjj', extended with sections */
export interface BJJWorkout {
  id: string
  userId: string
  title: string
  type: 'bjj'
  performedAt: string
  durationMinutes: number
  rpe?: number
  notes?: string
  createdAt: string
  updatedAt: string
  sections: BJJSection[]
}

/** Input for creating a technique (admin form) */
export interface CreateBJJTechniqueInput {
  name: string
  description?: string
  category?: BJJCategory
  youtubeUrl?: string
}

export interface UpdateBJJTechniqueInput extends Partial<CreateBJJTechniqueInput> {
  id: string
}

// ── Task 1.5: Export BJJRollDraft type ──────────────────────────────────────
export type { BJJRollDraft } from './bjj.schema'

// ── Task 1.7: Interfaces for roll confirmation ──────────────────────────────

/** Input for confirming roll drafts after workout save (REQ-FRM1) */
export interface ConfirmRollsInput {
  workoutId: string
  sections: Array<{
    sectionNumber: number
    rolls: Array<{
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
    }>
  }>
}

/** Plan for confirming rolls - delete proposed, insert confirmed with offset indices (D4) */
export interface RollConfirmationPlan {
  sectionId: string
  deleteProposed: boolean
  inserts: Array<{
    roll_index: number
    role: string
    outcome: string
    position_from: string
    position_to: string | null
    technique_ids: string[]
    status: 'confirmed'
    source: string
    confidence: number | null
    raw_excerpt: string | null
  }>
}

// Re-export technique tracking types (PR 2)
export type {
  TechniqueLearningStatus,
  WorkoutHistoryEntry,
  TechniqueSuggestion,
} from './progression/types/technique-tracking.types'
