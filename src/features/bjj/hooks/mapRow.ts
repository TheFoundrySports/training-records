import type { BJJTechnique, BJJSection } from '../bjj.types'

// DB row shape returned by PostgREST for bjj_techniques
interface BJJTechniqueRow {
  id: string
  name: string
  name_es: string | null
  description: string | null
  category: string | null
  youtube_url: string | null
  created_at: string
  updated_at: string
}

export function mapTechniqueRow(row: BJJTechniqueRow): BJJTechnique {
  return {
    id: row.id,
    name: row.name,
    name_es: row.name_es ?? undefined,
    description: row.description ?? undefined,
    category: (row.category as BJJTechnique['category']) ?? undefined,
    youtubeUrl: row.youtube_url ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// DB row for bjj_sections, with joined techniques
interface BJJSectionRow {
  id: string
  workout_id: string
  section_number: number
  goal: string
  raw_description: string | null
  ai_description: string | null
  duration_minutes: number | null
  enhanced_notes: string | null
  created_at: string
  bjj_section_techniques: Array<{ bjj_techniques: BJJTechniqueRow }>
}

export function mapSectionRow(row: BJJSectionRow): BJJSection {
  return {
    id: row.id,
    workoutId: row.workout_id,
    sectionNumber: row.section_number,
    goal: row.goal,
    rawDescription: row.raw_description ?? undefined,
    aiDescription: row.ai_description ?? undefined,
    durationMinutes: row.duration_minutes ?? undefined,
    enhancedNotes: row.enhanced_notes ?? undefined,
    techniques: row.bjj_section_techniques.map((jt) => mapTechniqueRow(jt.bjj_techniques)),
    createdAt: row.created_at,
  }
}
