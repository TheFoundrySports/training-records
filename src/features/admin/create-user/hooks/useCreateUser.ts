import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { CreateUserInput } from '../create-user.types'

interface RegisterResponse {
  success: boolean
  user_id?: string
  error?: string
}

export function useCreateUser() {
  const mutation = useMutation({
    mutationFn: async (input: CreateUserInput) => {
      const { data, error } = await supabase.functions.invoke<RegisterResponse>('register-user', {
        body: { email: input.email },
      })

      if (error) {
        throw new Error(error.message ?? 'Failed to create user')
      }

      if (data?.error) {
        throw new Error(data.error)
      }

      return data
    },
  })

  return {
    createUser: mutation.mutateAsync,
    isLoading: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
    error: mutation.error?.message ?? null,
    userId: mutation.data?.user_id ?? null,
  }
}
