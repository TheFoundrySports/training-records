import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { mapSectionRow } from './mapRow'

export function useBJJSections(workoutId: string) {
  return useQuery({
    queryKey: ['bjj-sections', workoutId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bjj_sections')
        .select(
          `
          id, workout_id, section_number, goal,
          raw_description, ai_description, duration_minutes, enhanced_notes, created_at,
          bjj_section_techniques (
            bjj_techniques (
              id, name, description, category, youtube_url, created_at, updated_at
            )
          )
        `,
        )
        .eq('workout_id', workoutId)
        .order('section_number')

      if (error) {
        throw {
          error: {
            code: error.code ?? 'UNKNOWN',
            message: error.message,
            details: error.details,
          },
        }
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data ?? []).map((row) => mapSectionRow(row as any))
    },
    enabled: Boolean(workoutId),
  })
}
