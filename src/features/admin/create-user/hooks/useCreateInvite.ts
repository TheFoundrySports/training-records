import { useMutation } from '@tanstack/react-query'
import { invokeFunction } from '@/lib/edge-function'
import type { CreateInviteInput, InviteResult } from '../create-user.types'

export function useCreateInvite() {
  const mutation = useMutation({
    mutationFn: async (input: CreateInviteInput) => {
      return invokeFunction<InviteResult>({
        name: 'create_invite',
        body: input,
      })
    },
  })

  return {
    createInvite: mutation.mutateAsync,
    isLoading: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
    error: mutation.error?.message ?? null,
    expiresAt: mutation.data?.expires_at ?? null,
  }
}