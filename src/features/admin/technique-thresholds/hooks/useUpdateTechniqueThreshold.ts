import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { UpdateThresholdInput } from './useTechniqueThresholds'

export { type UpdateThresholdInput } from './useTechniqueThresholds'

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
        throw new Error(error.message)
      }
    },
    onSuccess: () => {
      // Invalidate admin thresholds list AND athlete learning status views
      void queryClient.invalidateQueries({ queryKey: ['technique-thresholds'] })
      void queryClient.invalidateQueries({ queryKey: ['technique-learning-status'] })
    },
  })
}