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
