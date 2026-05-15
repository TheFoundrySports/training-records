import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { TechniqueSuggestion } from '../types/technique-tracking.types'

async function fetchTechniqueSuggestions(userId: string): Promise<TechniqueSuggestion[]> {
  const { data, error } = await supabase
    .from('technique_practice_log')
    .select('technique_id, bjj_techniques (name, name_es), total_practices, last_practiced_at')
    .eq('user_id', userId)
    .gte('last_practiced_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    .order('last_practiced_at', { ascending: false })
    .limit(5)

  if (error) {
    throw {
      error: {
        code: error.code ?? 'UNKNOWN',
        message: error.message,
        details: error.details,
      },
    }
  }

  if (!data) return []

  return (data as unknown as { technique_id: string; bjj_techniques: { name: string; name_es: string | null }; total_practices: number; last_practiced_at: string }[]).map((row) => ({
    technique_id: row.technique_id,
    name: row.bjj_techniques.name,
    name_es: row.bjj_techniques.name_es,
    total_practices: row.total_practices,
    last_practiced_at: row.last_practiced_at,
  }))
}

/**
 * Fetches technique practice suggestions for a user.
 * Returns techniques practiced in the last 30 days that are not yet
 * in the user's belt progression as completed items.
 */
export function useTechniqueSuggestions(userId: string) {
  return useQuery({
    queryKey: ['technique-suggestions', userId],
    queryFn: () => fetchTechniqueSuggestions(userId),
    staleTime: 30_000,
    enabled: Boolean(userId),
  })
}