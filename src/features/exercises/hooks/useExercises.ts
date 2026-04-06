import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api'
import { mapExerciseRow } from './mapExerciseRow'
import type { ExerciseFilters, ExerciseListResponse } from '../exercise.types'
import type { Exercise } from '../exercise.types'

function buildQuery(filters?: ExerciseFilters): string {
  const params = new URLSearchParams()
  if (filters?.q) params.set('q', filters.q)
  if (filters?.categoryId) params.set('category_id', filters.categoryId)
  if (filters?.movementType) params.set('movement_type', filters.movementType)
  if (filters?.page != null) params.set('page', String(filters.page))
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

export function useExercises(filters?: ExerciseFilters) {
  return useQuery({
    queryKey: ['exercises', filters],
    queryFn: async () => {
      const qs = buildQuery(filters)
      const response = await apiGet<{
        data: Array<{
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
        }>
        total: number
        page: number
        pageSize: number
      }>(`/exercises${qs}`)

      return {
        data: response.data.map(mapExerciseRow),
        total: response.total,
        page: response.page,
        pageSize: response.pageSize,
      } satisfies ExerciseListResponse
    },
  })
}

export function useExercise(id: string) {
  return useQuery({
    queryKey: ['exercises', id],
    queryFn: async () => {
      const row = await apiGet<{
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
      }>(`/exercises/${id}`)

      return mapExerciseRow(row) satisfies Exercise
    },
    enabled: Boolean(id),
  })
}
