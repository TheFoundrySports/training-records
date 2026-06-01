import { useMutation } from '@tanstack/react-query'
import { invokeFunction } from '@/lib/edge-function'
import type { CreateUserInput, CreateUserResult } from '../create-user.types'

export function useCreateUser() {
  const mutation = useMutation({
    mutationFn: async (input: CreateUserInput) => {
      return invokeFunction<CreateUserResult>({
        name: 'admin-create-user',
        body: { email: input.email, password: input.password },
      })
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