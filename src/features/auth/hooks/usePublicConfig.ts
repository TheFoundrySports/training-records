import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export type RegistrationMode = 'open' | 'invite_only'

interface PublicConfig {
  registration_mode: RegistrationMode
}

export function usePublicConfig() {
  const query = useQuery({
    queryKey: ['public-config'],
    queryFn: async (): Promise<PublicConfig> => {
      const { data, error } = await supabase.functions.invoke<PublicConfig>('public-config')

      if (error) {
        throw new Error(error.message ?? 'Failed to fetch public config')
      }

      if (!data) {
        throw new Error('No public config returned')
      }

      return data
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: false,
  })

  return {
    registrationMode: query.data?.registration_mode ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
  }
}
