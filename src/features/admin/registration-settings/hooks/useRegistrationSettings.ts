import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { RegistrationSettings } from '../registration-settings.types'

interface RegistrationSettingsResponse {
  registration_mode: 'open' | 'invite_only'
  invite_expiry_hours: number
}

interface UpdateSettingsInput {
  registration_mode?: 'open' | 'invite_only'
  invite_expiry_hours?: number
}

interface UpdateSettingsResponse {
  success: boolean
  registration_mode?: 'open' | 'invite_only'
  invite_expiry_hours?: number
  error?: string
}

async function fetchSettings(): Promise<RegistrationSettings> {
  const { data, error } = await supabase.functions.invoke<RegistrationSettingsResponse>('registration-settings')

  if (error) {
    throw new Error(error.message ?? 'Failed to fetch settings')
  }

  if (!data) {
    throw new Error('No settings returned')
  }

  return data
}

export function useRegistrationSettings() {
  return useQuery({
    queryKey: ['registration-settings'],
    queryFn: fetchSettings,
    staleTime: 60_000,
  })
}

export function useUpdateRegistrationSettings() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: async (input: UpdateSettingsInput) => {
      const { data, error } = await supabase.functions.invoke<UpdateSettingsResponse>('registration-settings', {
        body: input,
      })

      if (error) {
        throw new Error(error.message ?? 'Failed to update settings')
      }

      if (data?.error) {
        throw new Error(data.error)
      }

      return data
    },
    onSuccess: (_, input) => {
      queryClient.setQueryData<RegistrationSettings>(['registration-settings'], (prev) => {
        if (!prev) return prev
        return { ...prev, ...input }
      })
      queryClient.invalidateQueries({ queryKey: ['registration-settings'] })
    },
  })

  return {
    updateSettings: mutation.mutateAsync,
    isLoading: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
    error: mutation.error?.message ?? null,
  }
}
