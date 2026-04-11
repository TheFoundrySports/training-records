import { useQuery } from '@tanstack/react-query'
import type { UseQueryResult } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { mapRow } from '@/features/workouts/hooks/mapRow'
import type { Workout } from '@/features/workouts/workout.types'

/** Pure function — exported for unit testing */
export function computeMonthBoundaries(year: number, month: number): { start: Date; end: Date } {
  // Local timezone boundaries — day 0 of next month = last day of current month
  const start = new Date(year, month - 1, 1, 0, 0, 0, 0)
  const end = new Date(year, month, 0, 23, 59, 59, 999)
  return { start, end }
}

export function useWorkoutsByMonth(year: number, month: number): UseQueryResult<Workout[]> {
  return useQuery({
    queryKey: ['workouts', 'calendar', year, month],
    queryFn: async () => {
      const { start, end } = computeMonthBoundaries(year, month)

      const { data, error } = await supabase
        .from('workouts')
        .select('*')
        .gte('performed_at', start.toISOString())
        .lte('performed_at', end.toISOString())
        .order('performed_at', { ascending: true })
        .limit(200)

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
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}
