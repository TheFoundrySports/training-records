import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { BJJWorkoutFormValues } from '../bjj.schema'

export function useCreateBJJWorkout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: BJJWorkoutFormValues): Promise<string> => {
      const { data: workoutId, error } = await supabase.rpc('bjj_create_workout', {
        p_title: data.title,
        p_performed_at: data.performedAt,
        p_duration_min: data.durationMinutes,
        p_notes: data.notes ?? null,
        p_rpe: data.rpe ?? null,
        p_sections: data.sections.map((s, idx) => ({
          section_number: idx + 1,
          goal: s.goal,
          raw_description: s.rawDescription ?? null,
          duration_minutes: s.durationMinutes ?? null,
          technique_ids: s.techniqueIds,
        })),
      })

      if (error) {
        throw {
          error: {
            code: error.code ?? 'UNKNOWN',
            message: error.message,
            details: error.details,
          },
        }
      }

      return workoutId as string
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['workouts'] })
    },
  })
}
