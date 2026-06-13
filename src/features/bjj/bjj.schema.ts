import { z } from 'zod'

// ── Canonical category list ──────────────────────────────
export const BJJ_CATEGORIES = [
  'guard',
  'takedown',
  'submission',
  'escape',
  'transition',
  'guard_pass',
  'other',
] as const
export type BJJCategory = (typeof BJJ_CATEGORIES)[number]

// ── Canonical position keys (REQ-PV2) ────────────────────
// MUST stay in sync with supabase/migrations/20260612000002_bjj_positions.sql
// 11 keys, snake_case. The migration is the runtime source of truth (DB seed);
// this constant is the client/source source of truth (Zod enum). Drift between
// the two would let an unknown position slip past the schema and be rejected
// by the DB only at insert time — bad UX. If a new key is added to the
// migration, add it here too.
export const BJJ_POSITION_KEYS = [
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
] as const
export const BJJPositionKeySchema = z.enum(BJJ_POSITION_KEYS)
export type BJJPositionKey = (typeof BJJ_POSITION_KEYS)[number]

// ── Roll capture (REQ-RE6) ───────────────────────────────
// LLM + mock fallback emit a `rolls[]` array. The schema is the
// boundary contract — anything that crosses the EF→client wire is
// parsed through BJJSectionAIResponseSchema.
export const BJJRollRoleSchema = z.enum(['attacking', 'defending', 'neutral'])
export const BJJRollOutcomeSchema = z.enum([
  'submission',
  'position_gain',
  'position_loss',
  'neutral',
])
export const BJJRollValidationErrorSchema = z.enum([
  'unknown_position_from',
  'unknown_position_to',
])

export const BJJRollProposalSchema = z.object({
  roll_index: z.number().int().positive(),
  role: BJJRollRoleSchema,
  outcome: BJJRollOutcomeSchema,
  position_from: BJJPositionKeySchema,
  position_to: BJJPositionKeySchema.nullable(),
  technique_names: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(1),
  raw_excerpt: z.string().min(1),
  validation_error: BJJRollValidationErrorSchema.optional(),
})
export type BJJRollProposal = z.infer<typeof BJJRollProposalSchema>

export const BJJSectionAIResponseSchema = z.object({
  ai_description: z.string().min(1, 'ai_description is required'),
  matched_technique_ids: z.array(z.string().uuid()),
  rolls: z.array(BJJRollProposalSchema).default([]),
})
export type BJJSectionAIResponse = z.infer<typeof BJJSectionAIResponseSchema>

// ── Belt Progression ────────────────────────────────────
export const beltProgressionItemSchema = z.object({
  id: z.string().uuid().optional(),
  userId: z.string().uuid(),
  beltLevel: z.enum(['blue']),
  sectionId: z.string().min(1),
  itemId: z.string().min(1),
  isComplete: z.boolean(),
  completedAt: z.string().datetime().nullable(),
  techniqueId: z.string().uuid().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})
export type BeltProgressionItemSchema = z.infer<typeof beltProgressionItemSchema>

export const beltProgressionUIStateSchema = z.object({
  id: z.string().uuid().optional(),
  userId: z.string().uuid(),
  beltLevel: z.enum(['blue']),
  sectionId: z.string().min(1),
  isExpanded: z.boolean(),
  updatedAt: z.string().datetime(),
})
export type BeltProgressionUIStateSchema = z.infer<typeof beltProgressionUIStateSchema>

// ── Technique (admin form) ───────────────────────────────
export const bjjTechniqueSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().max(2000).optional(),
  category: z.enum(BJJ_CATEGORIES).optional(),
  youtubeUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
})
export type BJJTechniqueFormValues = z.infer<typeof bjjTechniqueSchema>

// ── Section (used inside BJJ workout form) ───────────────
export const bjjSectionSchema = z.object({
  /** DB section id — present only for existing sections in edit mode */
  id: z.string().uuid().optional(),
  goal: z.string().min(1, 'Goal is required').max(300),
  rawDescription: z.string().max(2000).optional(),
  durationMinutes: z.number().int().min(1).max(300).optional(),
  /** Array of technique IDs selected via TechniqueSearch */
  techniqueIds: z.array(z.string().uuid()).default([]),
  enhancedNotes: z.string().max(4000).optional(),
})
export type BJJSectionFormValues = z.infer<typeof bjjSectionSchema>

// ── BJJ Workout form ─────────────────────────────────────
export const bjjWorkoutSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  performedAt: z
    .string()
    .transform((val) => {
      // Reuse existing normalizeDateTime logic
      if (/[Z+-]\d*(\d{2}:\d{2})?$/.test(val)) return val
      return val.length === 16 ? `${val}:00.000Z` : `${val}.000Z`
    })
    .pipe(z.string().datetime({ message: 'Invalid date' })),
  durationMinutes: z.number().int().min(1).max(300),
  notes: z.string().max(2000).optional(),
  rpe: z.number().int().min(1).max(10).optional(),
  sections: z.array(bjjSectionSchema).min(1, 'At least one section is required'),
})
export type BJJWorkoutFormValues = z.infer<typeof bjjWorkoutSchema>
