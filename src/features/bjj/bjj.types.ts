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
