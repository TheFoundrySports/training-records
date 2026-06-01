import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { AcceptInviteInput } from '../auth.types'

export function useAcceptInvite() {
  const mutation = useMutation({
    mutationFn: async (input: AcceptInviteInput) => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Invalid or expired invitation link. Open the link from your invitation email.')
      }

      const { error: updateError } = await supabase.auth.updateUser({ password: input.password })
      if (updateError) {
        throw new Error(updateError.message)
      }

      const { data: { session: updatedSession } } = await supabase.auth.getSession()
      let warning: string | undefined
      if (updatedSession?.access_token) {
        const { data: invokeData } = await supabase.functions.invoke<{
          success: boolean
          marked: boolean
          warning?: string
          invitation_id?: string
        }>('accept-invite', {
          headers: { Authorization: `Bearer ${updatedSession.access_token}` },
        })
        warning = invokeData?.warning
      }

      await supabase.auth.signOut()

      return { success: true, warning }
    },
  })

  return {
    acceptInvite: mutation.mutateAsync,
    isLoading: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
    error: mutation.error?.message ?? null,
    warning: mutation.data?.warning,
  }
}
