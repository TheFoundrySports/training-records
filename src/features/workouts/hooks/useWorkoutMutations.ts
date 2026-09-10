import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { WorkoutFormValues } from '../workout.schema'
import type { Workout } from '../workout.types'
import { mapRow } from './mapRow'

/**
 * Coerce form-level values (strings from inputs) to the types expected by the schema.
 * Safe because we validate with zodResolver before mutation.
 */
function coerceWorkoutFormValues(data: WorkoutFormValues): WorkoutFormValues {
  return {
    ...data,
    durationMinutes:
      typeof data.durationMinutes === 'string'
        ? Number(data.durationMinutes)
        : data.durationMinutes,
    rpe: typeof data.rpe === 'string' ? Number(data.rpe) : data.rpe,
  }
}

export function useCreateWorkout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: WorkoutFormValues): Promise<Workout> => {
      const coerced = coerceWorkoutFormValues(data)
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
          title: coerced.title,
          type: coerced.type,
          performed_at: coerced.performedAt,
          duration_minutes: coerced.durationMinutes,
          notes: coerced.notes ?? null,
          enhanced_notes: coerced.enhancedNotes ?? null,
          rpe: coerced.rpe ?? null,
          wod_text: coerced.wodText ?? null,
          wod_format: coerced.wodFormat ?? null,
          payload: coerced.payload ?? null,
          user_id: user.id,
        })
        .select()
        .single()

      if (error) {
        throw {
          error: { code: error.code ?? 'UNKNOWN', message: error.message, details: error.details },
        }
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
      const coerced = coerceWorkoutFormValues(data)
      const { data: workout, error } = await supabase
        .from('workouts')
        .update({
          title: coerced.title,
          type: coerced.type,
          performed_at: coerced.performedAt,
          duration_minutes: coerced.durationMinutes,
          notes: coerced.notes ?? null,
          enhanced_notes: coerced.enhancedNotes ?? null,
          rpe: coerced.rpe ?? null,
          wod_text: coerced.wodText ?? null,
          wod_format: coerced.wodFormat ?? null,
          payload: coerced.payload ?? null,
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        throw {
          error: { code: error.code ?? 'UNKNOWN', message: error.message, details: error.details },
        }
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
        throw {
          error: { code: error.code ?? 'UNKNOWN', message: error.message, details: error.details },
        }
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['workouts'] })
    },
  })
}
