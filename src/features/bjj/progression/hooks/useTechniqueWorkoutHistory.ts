import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { WorkoutHistoryEntry } from '../types/technique-tracking.types'

type WorkoutHistoryRow = {
  section_number: number
  goal: string
  ai_description: string | null
  workouts: { id: string; performed_at: string; user_id: string }
  bjj_section_techniques: Array<{ technique_id: string }>
}

/**
 * Fetches the workout history for a specific technique and user.
 *
 * Query path: `bjj_sections` is the only table in this graph that has direct
 * FKs to BOTH `workouts` (via `workout_id`) and `bjj_section_techniques`
 * (via `section_id`).
 *
 * Order spec note: the column passed to `.order()` uses the embedded-table
 * parent-order syntax `relation(column)`. The dotted form `relation.column`
 * is NOT a valid PostgREST order spec — the parser treats `relation` as a
 * top-level column and then expects `.asc|.desc`, so it bails on the second
 * dot. The earlier implementation used `workouts.performed_at` and PostgREST
 * returned `failed to parse order (workouts.performed_at.desc)` even after
 * switching the FROM table.
 *
 * Returns up to 20 (section, workout) pairs where the section is linked
 * to the technique, ordered by workout.performed_at desc. A workout with
 * multiple matching sections appears as multiple rows (one per section).
 */
async function fetchTechniqueWorkoutHistory(
  techniqueId: string,
  userId: string,
): Promise<WorkoutHistoryEntry[]> {
  const { data, error } = await supabase
    .from('bjj_sections')
    .select(`
      section_number,
      goal,
      ai_description,
      workouts!inner (
        id,
        performed_at,
        user_id
      ),
      bjj_section_techniques!inner (
        technique_id
      )
    `)
    .eq('workouts.user_id', userId)
    .eq('bjj_section_techniques.technique_id', techniqueId)
    .order('workouts(performed_at)', { ascending: false })
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
    section_number: row.section_number,
    goal: row.goal,
    ai_description: row.ai_description ?? '',
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
