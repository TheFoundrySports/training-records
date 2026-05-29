import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { CreateInviteInput } from '../create-user.types'

interface CreateInviteResponse {
  success: boolean
  invite_url?: string
  expires_at?: string
  error?: string
}

export function useCreateInvite() {
  const mutation = useMutation({
    mutationFn: async (input: CreateInviteInput) => {
      const { data, error } = await supabase.functions.invoke<CreateInviteResponse>('create-invite', {
        body: input,
      })

      if (error) {
        throw new Error(error.message ?? 'Failed to create invitation')
      }

      if (data?.error) {
        throw new Error(data.error)
      }

      return data
    },
  })

  return {
    createInvite: mutation.mutateAsync,
    isLoading: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
    error: mutation.error?.message ?? null,
    inviteUrl: mutation.data?.invite_url ?? null,
    expiresAt: mutation.data?.expires_at ?? null,
  }
}
