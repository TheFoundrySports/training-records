import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { UserRow } from '../users.types'

async function fetchUsers(): Promise<UserRow[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, role')
    .order('email', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as UserRow[]
}

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
    staleTime: 60_000,
  })
}