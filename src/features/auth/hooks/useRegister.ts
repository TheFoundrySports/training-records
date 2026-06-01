import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { RegisterInput, RegisterResponse } from '../auth.types'

export function useRegister() {
  const mutation = useMutation({
    mutationFn: async (input: RegisterInput) => {
      const { data, error } = await supabase.functions.invoke<RegisterResponse>('register-user', {
        body: input,
      })

      if (error) {
        throw new Error(error.message ?? 'Failed to register')
      }

      if (data?.error) {
        throw new Error(data.error)
      }

      return data
    },
  })

  return {
    register: mutation.mutateAsync,
    isLoading: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
    error: mutation.error?.message ?? null,
  }
}
