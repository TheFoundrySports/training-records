import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiPost, apiPut, apiDelete } from '@/lib/api'
import { mapExerciseRow } from './mapExerciseRow'
import type { CreateExerciseInput, UpdateExerciseInput, Exercise } from '../exercise.types'

function toSnakeCase(input: CreateExerciseInput | UpdateExerciseInput): Record<string, unknown> {
  const body: Record<string, unknown> = {}
  if ('name' in input && input.name !== undefined) body.name = input.name
  if ('description' in input && input.description !== undefined)
    body.description = input.description
  if ('categoryId' in input && input.categoryId !== undefined) {
    // Empty string is not a valid uuid; omit clears optional category, null clears on update.
    body.category_id = input.categoryId.trim() === '' ? null : input.categoryId
  }
  if ('movementType' in input && input.movementType !== undefined)
    body.movement_type = input.movementType
  if ('measurementType' in input && input.measurementType !== undefined)
    body.measurement_type = input.measurementType
  if ('difficultyLevel' in input && input.difficultyLevel !== undefined)
    body.difficulty_level = input.difficultyLevel
  if ('equipment' in input && input.equipment !== undefined) body.equipment = input.equipment
  if ('isBenchmark' in input && input.isBenchmark !== undefined)
    body.is_benchmark = input.isBenchmark
  if ('videoUrl' in input && input.videoUrl !== undefined) body.video_url = input.videoUrl
  if ('scalingOptions' in input && input.scalingOptions !== undefined)
    body.scaling_options = input.scalingOptions
  return body
}

type ExerciseRow = {
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
}

export function useCreateExercise() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateExerciseInput): Promise<Exercise> => {
      const row = await apiPost<ExerciseRow>('/exercises', toSnakeCase(input))
      return mapExerciseRow(row)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['exercises'] })
    },
  })
}

export function useUpdateExercise() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string
      data: UpdateExerciseInput
    }): Promise<Exercise> => {
      const row = await apiPut<ExerciseRow>(`/exercises/${id}`, toSnakeCase(data))
      return mapExerciseRow(row)
    },
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: ['exercises'] })
      void queryClient.invalidateQueries({ queryKey: ['exercises', id] })
    },
  })
}

export function useDeleteExercise() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await apiDelete(`/exercises/${id}`)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['exercises'] })
    },
  })
}
