import { useMutation } from '@tanstack/react-query'
import { invokeFunction } from '@/lib/edge-function'
import type { RegisterInput, RegisterResponse } from '../auth.types'

export function useRegister() {
  const mutation = useMutation({
    mutationFn: async (input: RegisterInput) => {
      // register-user is a public endpoint — no auth token required
      return invokeFunction<RegisterResponse>({
        name: 'register-user',
        body: input,
      })
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