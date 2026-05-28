import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { AcceptInviteInput, AcceptInviteResponse } from '../auth.types'

export function useAcceptInvite() {
  const mutation = useMutation({
    mutationFn: async (input: AcceptInviteInput) => {
      const { data, error } = await supabase.functions.invoke<AcceptInviteResponse>('accept-invite', {
        body: input,
      })

      if (error) {
        throw new Error(error.message ?? 'Failed to accept invitation')
      }

      if (data?.error) {
        throw new Error(data.error)
      }

      return data
    },
  })

  return {
    acceptInvite: mutation.mutateAsync,
    isLoading: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
    error: mutation.error?.message ?? null,
  }
}
