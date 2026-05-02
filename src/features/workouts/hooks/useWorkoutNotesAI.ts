import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

interface WorkoutNotesAIInput {
  notes: string
}

interface WorkoutNotesAIResult {
  enhanced_notes: string
}

export function useWorkoutNotesAI() {
  const mutation = useMutation({
    mutationFn: async (input: WorkoutNotesAIInput): Promise<WorkoutNotesAIResult> => {
      const { data, error } = await supabase.functions.invoke<WorkoutNotesAIResult>(
        'workout-notes-ai',
        {
          body: {
            notes: input.notes,
          },
        },
      )

      if (error) {
        throw new Error(error.message ?? 'AI enhancement failed')
      }

      if (!data) {
        throw new Error('No data returned from AI enhancement')
      }

      return data
    },
  })

  return {
    enhance: mutation.mutate,
    enhanceAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  }
}