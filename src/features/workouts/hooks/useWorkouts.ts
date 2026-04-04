import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { mapRow } from './mapRow'

export function useWorkouts() {
  return useQuery({
    queryKey: ['workouts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workouts')
        .select('*')
        .order('performed_at', { ascending: false })

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
      const { data, error } = await supabase
        .from('workouts')
        .select('*')
        .eq('id', id)
        .single()

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
