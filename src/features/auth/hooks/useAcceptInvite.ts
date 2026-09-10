import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { AcceptInviteInput, AcceptInviteResponse } from '../auth.types'
import { validateStrongPassword } from '../lib/password-validation'

export function useAcceptInvite() {
  const mutation = useMutation({
    mutationFn: async (input: AcceptInviteInput) => {
      // Validate password strength client-side before API call
      const validation = validateStrongPassword(input.password)
      if (!validation.valid) {
        throw new Error(validation.message)
      }

      const { data, error } = await supabase.functions.invoke<AcceptInviteResponse>(
        'accept-invite',
        {
          body: input,
        },
      )

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
    warning: mutation.data?.warning ?? null,
  }
}
