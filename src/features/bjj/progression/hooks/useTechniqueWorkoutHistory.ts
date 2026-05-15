import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { WorkoutHistoryEntry } from '../types/technique-tracking.types'

type WorkoutHistoryRow = {
  workouts: { id: string; performed_at: string; user_id: string }
  bjj_sections: { section_number: number; goal: string; ai_description: string }
}

async function fetchTechniqueWorkoutHistory(
  techniqueId: string,
  userId: string,
): Promise<WorkoutHistoryEntry[]> {
  const { data, error } = await supabase
    .from('bjj_section_techniques')
    .select(`
      workouts!inner (
        id,
        performed_at,
        user_id
      ),
      bjj_sections!inner (
        section_number,
        goal,
        ai_description
      )
    `)
    .eq('technique_id', techniqueId)
    .eq('workouts.user_id', userId)
    .order('workouts.performed_at', { ascending: false })
    .limit(20)

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

  return (data as unknown as WorkoutHistoryRow[]).map((row) => ({
    workout_id: row.workouts.id,
    performed_at: row.workouts.performed_at,
    section_number: row.bjj_sections.section_number,
    goal: row.bjj_sections.goal,
    ai_description: row.bjj_sections.ai_description ?? '',
  }))
}

/**
 * Fetches the workout history for a specific technique and user.
 * Returns up to 20 recent workouts where the technique was practiced,
 * ordered by performed_at descending.
 */
export function useTechniqueWorkoutHistory(techniqueId: string, userId: string) {
  return useQuery({
    queryKey: ['technique-workout-history', techniqueId, userId],
    queryFn: () => fetchTechniqueWorkoutHistory(techniqueId, userId),
    staleTime: 30_000,
    enabled: Boolean(techniqueId) && Boolean(userId),
  })
}