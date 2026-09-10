import { useMutation } from '@tanstack/react-query'
import { invokeFunction } from '@/lib/edge-function'

interface ForgotPasswordResponse {
  success: boolean
  error?: { code: string; message: string }
}

interface UseForgotPasswordOptions {
  onSuccess?: () => void
  onError?: (error: string) => void
}

export function useForgotPassword(options?: UseForgotPasswordOptions) {
  const mutation = useMutation({
    mutationFn: async (email: string) => {
      const data = await invokeFunction<ForgotPasswordResponse>({
        name: 'request-password-reset',
        body: { email },
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
    requestReset: mutation.mutateAsync,
    isLoading: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
    error: mutation.error?.message ?? null,
  }
}
