import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

interface BJJSectionAIInput {
  section_goal: string
  raw_description: string
}

interface BJJSectionAIResult {
  ai_description: string
  matched_technique_ids: string[]
}

export function useBJJSectionAI() {
  const mutation = useMutation({
    mutationFn: async (input: BJJSectionAIInput): Promise<BJJSectionAIResult> => {
      const { data, error } = await supabase.functions.invoke<BJJSectionAIResult>(
        'bjj-section-ai',
        {
          body: {
            section_goal: input.section_goal,
            raw_description: input.raw_description,
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
