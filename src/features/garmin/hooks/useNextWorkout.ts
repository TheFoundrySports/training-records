import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useNextWorkout(afterDate: string | undefined) {
  return useQuery({
    queryKey: ['workouts', 'next', afterDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workouts')
        .select('performed_at')
        .gt('performed_at', afterDate!)
        .order('performed_at', { ascending: true })
        .limit(1)
        .maybeSingle()

      if (error) {
        throw {
          error: {
            code: error.code ?? 'UNKNOWN',
            message: error.message,
            details: error.details,
          },
        }
      }

      if (!data) return null

      return { performedAt: data.performed_at as string }
    },
    enabled: Boolean(afterDate),
  })
}
