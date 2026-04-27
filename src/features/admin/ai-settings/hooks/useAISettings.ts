import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { AISettingsFormValues } from '../ai-settings.schema'

const AI_SETTINGS_ID = '00000000-0000-0000-0000-000000000001'
const QUERY_KEY = ['ai-settings']

export interface AISettings {
  id: string
  provider_name: string
  base_url: string
  model: string
  updated_at: string
}

export function useAISettings() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async (): Promise<AISettings | null> => {
      const { data, error } = await supabase
        .from('ai_settings')
        .select('id, provider_name, base_url, model, updated_at')
        .eq('id', AI_SETTINGS_ID)
        .maybeSingle()

      if (error) {
        throw new Error(error.message)
      }

      return data as AISettings | null
    },
  })

  const mutation = useMutation({
    mutationFn: async (values: AISettingsFormValues): Promise<AISettings> => {
      const { data, error } = await supabase
        .from('ai_settings')
        .upsert(
          {
            id: AI_SETTINGS_ID,
            provider_name: values.provider_name,
            base_url: values.base_url,
            model: values.model,
          },
          { onConflict: 'id' },
        )
        .select('id, provider_name, base_url, model, updated_at')
        .single()

      if (error) {
        throw new Error(error.message)
      }

      return data as AISettings
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    },
  })

  return {
    data: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
    upsert: mutation.mutate,
    upsertAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    mutationError: mutation.error,
    isSuccess: mutation.isSuccess,
  }
}
