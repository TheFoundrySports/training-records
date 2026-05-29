import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { RevokeUserInput } from '../registration-settings.types'

interface RevokeResponse {
  success: boolean
  action?: 'ban' | 'unban'
  error?: string
}

export function useRevokeUser() {
  const mutation = useMutation({
    mutationFn: async (input: RevokeUserInput) => {
      const { data, error } = await supabase.functions.invoke<RevokeResponse>('revoke-user', {
        body: { user_id: input.userId, action: input.action },
      })

      if (error) {
        throw new Error(error.message ?? 'Failed to revoke user')
      }

      if (data?.error) {
        throw new Error(data.error)
      }

      return data
    },
  })

  return {
    revokeUser: mutation.mutateAsync,
    isLoading: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
    error: mutation.error?.message ?? null,
  }
}
