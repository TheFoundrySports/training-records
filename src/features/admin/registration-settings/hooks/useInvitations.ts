import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Invitation } from '../registration-settings.types'

async function fetchInvitations(): Promise<Invitation[]> {
  const { data, error } = await supabase
    .from('invitations')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as Invitation[]
}

export function useInvitations() {
  return useQuery({
    queryKey: ['invitations'],
    queryFn: fetchInvitations,
    staleTime: 30_000,
  })
}
