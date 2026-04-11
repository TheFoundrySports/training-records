export interface Exercise {
  id: string
  name: string
  description: string | null
  categoryId: string | null
  movementType: string
  measurementType: string
  difficultyLevel: string
  equipment: string[]
  isBenchmark: boolean
  videoUrl: string | null
  scalingOptions: string | null
  createdAt: string
  updatedAt: string
}

export interface Category {
  id: string
  name: string
  description: string | null
}

export interface Equipment {
  id: string
  name: string
  description: string | null
}

export interface ExerciseFilters {
  q?: string
  categoryId?: string
  movementType?: string
  page?: number
}

export interface ExerciseListResponse {
  data: Exercise[]
  total: number
  page: number
  pageSize: number
}

export interface CreateExerciseInput {
  name: string
  description?: string
  categoryId?: string
  movementType: string
  measurementType: string
  difficultyLevel: string
  equipment?: string[]
  isBenchmark?: boolean
  videoUrl?: string
  scalingOptions?: string
}

export type UpdateExerciseInput = Partial<CreateExerciseInput>
