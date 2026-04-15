import type { BJJTechnique, BJJSection } from '../bjj.types'

// DB row shape returned by PostgREST for bjj_techniques
interface BJJTechniqueRow {
  id: string
  name: string
  description: string | null
  category: string | null
  youtube_url: string | null
  created_at: string
  updated_at: string
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
  created_at: string
  bjj_section_techniques: Array<{ bjj_techniques: BJJTechniqueRow }>
}

export function mapTechniqueRow(row: BJJTechniqueRow): BJJTechnique {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    category: (row.category as BJJTechnique['category']) ?? undefined,
    youtubeUrl: row.youtube_url ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
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
    techniques: row.bjj_section_techniques.map((jt) => mapTechniqueRow(jt.bjj_techniques)),
    createdAt: row.created_at,
  }
}
