import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { mapRow } from './mapRow'
import type { WorkoutType } from '../workout.types'

export function useWorkouts(options: { type?: WorkoutType | 'all' } = {}) {
  return useQuery({
    queryKey: ['workouts', options.type ?? 'all'],
    queryFn: async () => {
      let query = supabase.from('workouts').select('*').order('performed_at', { ascending: false })

      if (options.type && options.type !== 'all') {
        query = query.eq('type', options.type)
      }

      const { data, error } = await query

      if (error) {
        throw {
          error: {
            code: error.code ?? 'UNKNOWN',
            message: error.message,
            details: error.details,
          },
        }
      }

      return (data ?? []).map(mapRow)
    },
  })
}

export function useWorkout(id: string) {
  return useQuery({
    queryKey: ['workouts', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('workouts').select('*').eq('id', id).single()

      if (error) {
        throw {
          error: {
            code: error.code ?? 'UNKNOWN',
            message: error.message,
            details: error.details,
          },
        }
      }

      if (!data) {
        throw {
          error: {
            code: 'NOT_FOUND',
            message: 'Workout not found',
            details: null,
          },
        }
      }

      return mapRow(data)
    },
    enabled: Boolean(id),
  })
}
