import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { UserRole } from '@/features/auth/auth.types'

export function useUpdateUserRole() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: UserRole }) => {
      const { data, error } = await supabase.functions.invoke('update-user-role', {
        body: { user_id: userId, role },
      })

      if (error) {
        throw new Error(error.message ?? 'Failed to update user role')
      }

      if ((data as { error?: { message: string } }).error) {
        const err = (data as { error: { message: string } }).error
        throw new Error(err.message)
      }

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })

  return {
    updateRole: mutation.mutateAsync,
    isPending: mutation.isPending,
    isSuccess: mutation.isSuccess,
    mutationError: mutation.error,
  }
}