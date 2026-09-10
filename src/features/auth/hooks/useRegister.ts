import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { RegisterInput, RegisterResponse } from '../auth.types'
import { validateStrongPassword } from '../lib/password-validation'

export function useRegister() {
  const mutation = useMutation({
    mutationFn: async (input: RegisterInput) => {
      // Validate password strength client-side before API call
      const validation = validateStrongPassword(input.password)
      if (!validation.valid) {
        throw new Error(validation.message)
      }

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
