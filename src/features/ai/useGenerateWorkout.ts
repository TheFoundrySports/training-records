import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { WorkoutFormValues } from '@/features/workouts/workout.schema'

export type WorkoutProposal = WorkoutFormValues

export function useGenerateWorkout() {
  return useMutation({
    mutationFn: async (prompt: string): Promise<WorkoutProposal> => {
      const { data, error } = await supabase.functions.invoke<WorkoutProposal>('ai-generate', {
        body: { prompt },
      })

      if (error) {
        throw { error: { code: 'AI_ERROR', message: error.message, details: {} } }
      }

      if (!data) {
        throw { error: { code: 'AI_ERROR', message: 'No data returned from AI', details: {} } }
      }

      return data
    },
  })
}
