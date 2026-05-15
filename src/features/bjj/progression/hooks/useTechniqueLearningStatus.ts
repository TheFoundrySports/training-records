import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { TechniqueLearningStatus } from '../types/technique-tracking.types'

type TechniqueLearningStatusRow = TechniqueLearningStatus

async function fetchTechniqueLearningStatus(userId: string): Promise<TechniqueLearningStatus[]> {
  const { data, error } = await supabase
    .from('technique_learning_status')
    .select('*')
    .eq('user_id', userId)

  if (error) {
    throw {
      error: {
        code: error.code ?? 'UNKNOWN',
        message: error.message,
        details: error.details,
      },
    }
  }

  return (data as TechniqueLearningStatusRow[]) ?? []
}

/**
 * Fetches the learning status for all techniques a user has practiced.
 * Reads from the `technique_learning_status` view which joins
 * `technique_practice_log`, `bjj_techniques`, and `technique_learning_thresholds`.
 */
export function useTechniqueLearningStatus(userId: string) {
  return useQuery({
    queryKey: ['technique-learning-status', userId],
    queryFn: () => fetchTechniqueLearningStatus(userId),
    staleTime: 60_000,
    enabled: Boolean(userId),
  })
}