import type { Exercise } from '../exercise.types'

export function mapExerciseRow(row: {
  id: string
  name: string
  description: string | null
  category_id: string | null
  movement_type: string
  measurement_type: string
  difficulty_level: string
  equipment: string[]
  is_benchmark: boolean
  video_url: string | null
  scaling_options: string | null
  created_at: string
  updated_at: string
}): Exercise {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    categoryId: row.category_id,
    movementType: row.movement_type,
    measurementType: row.measurement_type,
    difficultyLevel: row.difficulty_level,
    equipment: row.equipment ?? [],
    isBenchmark: row.is_benchmark,
    videoUrl: row.video_url,
    scalingOptions: row.scaling_options,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
