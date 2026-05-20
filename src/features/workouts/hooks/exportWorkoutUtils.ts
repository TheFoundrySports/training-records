/**
 * Pure transformation functions for workout export.
 * No hooks, no browser APIs — fully testable as unit tests.
 */

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function formatDate(iso: string): string {
  return iso.split('T')[0]
}

export interface BJJTechniqueDB {
  name: string
  name_es: string | null
  category: string | null
}

export interface BJJSectionDB {
  section_number: number
  goal: string
  raw_description: string | null
  ai_description: string | null
  duration_minutes: number | null
  bjj_section_techniques: Array<{ bjj_techniques: BJJTechniqueDB }>
}

export interface WorkoutRow {
  title: string
  type: string
  performed_at: string
  duration_minutes: number
  notes: string | null
  enhanced_notes: string | null
  rpe: number | null
  wod_text: string | null
  wod_format: string | null
  payload: Record<string, unknown> | null
}

export interface ExportedTechnique {
  name: string
  nameEs: string | null
  category: string | null
}

export interface ExportedSection {
  sectionNumber: number
  goal: string
  rawDescription: string | null
  aiDescription: string | null
  durationMinutes: number | null
  techniques: ExportedTechnique[]
}

export interface ExportedWorkout {
  title: string
  type: string
  performedAt: string
  durationMinutes: number
  rpe: number | null
  notes: string | null
  enhancedNotes: string | null
  wodFormat: string | null
  wodText: string | null
  payload: Record<string, unknown> | null
  sections: ExportedSection[] | null
}

export function buildExportWorkout(workout: WorkoutRow, sections: BJJSectionDB[] | null): ExportedWorkout {
  const base = {
    title: workout.title,
    type: workout.type,
    performedAt: workout.performed_at,
    durationMinutes: workout.duration_minutes,
    rpe: workout.rpe,
    notes: workout.notes,
    enhancedNotes: workout.enhanced_notes,
    wodFormat: workout.wod_format,
    wodText: workout.wod_text,
    payload: workout.payload,
  }

  if (workout.type === 'bjj' && sections) {
    return {
      ...base,
      sections: sections.map((sec) => ({
        sectionNumber: sec.section_number,
        goal: sec.goal,
        rawDescription: sec.raw_description,
        aiDescription: sec.ai_description,
        durationMinutes: sec.duration_minutes,
        techniques: sec.bjj_section_techniques.map((jt) => ({
          name: jt.bjj_techniques.name,
          nameEs: jt.bjj_techniques.name_es,
          category: jt.bjj_techniques.category,
        })),
      })),
    }
  }

  return { ...base, sections: null }
}

export function generateExportFilename(workout: WorkoutRow): string {
  return `workout-${slugify(workout.title)}-${formatDate(workout.performed_at)}.json`
}