import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface UpdateThresholdInput {
  techniqueId: string
  requiredPractices: number
}

export function useUpdateTechniqueThreshold() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: UpdateThresholdInput): Promise<void> => {
      const { error } = await supabase
        .from('technique_learning_thresholds')
        .upsert(
          { technique_id: input.techniqueId, required_practices: input.requiredPractices },
          { onConflict: 'technique_id' },
        )

      if (error) {
        throw {
          error: {
            code: error.code ?? 'UNKNOWN',
            message: error.message,
            details: error.details,
          },
        }
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['technique-learning-status'] })
    },
  })
}