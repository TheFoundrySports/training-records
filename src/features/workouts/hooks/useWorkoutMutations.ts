import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { WorkoutFormValues } from '../workout.schema'
import type { Workout } from '../workout.types'
import { mapRow } from './mapRow'

export function useCreateWorkout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: WorkoutFormValues): Promise<Workout> => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        throw { error: { code: 'UNAUTHORIZED', message: 'No active session', details: {} } }
      }

      const { data: workout, error } = await supabase
        .from('workouts')
        .insert({
          title: data.title,
          type: data.type,
          performed_at: data.performedAt,
          duration_minutes: data.durationMinutes,
          notes: data.notes ?? null,
          rpe: data.rpe ?? null,
          user_id: user.id,
        })
        .select()
        .single()

      if (error) {
        throw { error: { code: error.code ?? 'UNKNOWN', message: error.message, details: error.details } }
      }

      return mapRow(workout)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['workouts'] })
    },
  })
}

export function useUpdateWorkout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: WorkoutFormValues }): Promise<Workout> => {
      const { data: workout, error } = await supabase
        .from('workouts')
        .update({
          title: data.title,
          type: data.type,
          performed_at: data.performedAt,
          duration_minutes: data.durationMinutes,
          notes: data.notes ?? null,
          rpe: data.rpe ?? null,
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        throw { error: { code: error.code ?? 'UNKNOWN', message: error.message, details: error.details } }
      }

      return mapRow(workout)
    },
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: ['workouts'] })
      void queryClient.invalidateQueries({ queryKey: ['workouts', id] })
    },
  })
}

export function useDeleteWorkout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from('workouts').delete().eq('id', id)

      if (error) {
        throw { error: { code: error.code ?? 'UNKNOWN', message: error.message, details: error.details } }
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['workouts'] })
    },
  })
}
