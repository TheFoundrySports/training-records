import { useMutation } from '@tanstack/react-query'
import { invokeFunction } from '@/lib/edge-function'
import { validateStrongPassword } from '../lib/password-validation'

interface ResetPasswordInput {
  token: string
  new_password: string
}

interface ResetPasswordResponse {
  success: boolean
  error?: { code: string; message: string }
}

interface UseResetPasswordOptions {
  onSuccess?: () => void
  onError?: (error: string) => void
}

const WEAK_PASSWORD_ERROR =
  'Password must be at least 8 characters and contain uppercase, number, and symbol'

export function useResetPassword(options?: UseResetPasswordOptions) {
  const mutation = useMutation({
    mutationFn: async (input: ResetPasswordInput) => {
      // Validate password strength locally first (fail-fast)
      const validation = validateStrongPassword(input.new_password)
      if (!validation.valid) {
        throw new Error(validation.message ?? WEAK_PASSWORD_ERROR)
      }

      const data = await invokeFunction<ResetPasswordResponse>({
        name: 'reset-password',
        body: { token: input.token, new_password: input.new_password },
      })

      if (data.error) {
        throw new Error(data.error.message)
      }

      return data
    },
    onSuccess: () => {
      options?.onSuccess?.()
    },
    onError: (error: Error) => {
      options?.onError?.(error.message)
    },
  })

  return {
    resetPassword: mutation.mutateAsync,
    isLoading: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
    error: mutation.error?.message ?? null,
  }
}
