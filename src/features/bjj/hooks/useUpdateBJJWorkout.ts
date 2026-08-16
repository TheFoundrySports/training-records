import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

interface BJJSectionInput {
  id?: string
  goal: string
  orderIndex: number
  techniqueIds: string[]
  rawDescription?: string
  durationMinutes?: number
  enhancedNotes?: string
}

export interface UpdateBJJWorkoutPayload {
  workoutId: string
  title: string
  performedAt: string
  durationMin: number
  notes: string
  rpe?: number
  sections: BJJSectionInput[]
}

async function resolveTechniqueNames(techniqueIds: string[]): Promise<Map<string, string>> {
  if (techniqueIds.length === 0) return new Map()

  const { data, error } = await supabase
    .from('bjj_techniques')
    .select('id, name')
    .in('id', techniqueIds)

  if (error || !data) return new Map()

  return new Map(data.map((t) => [t.id, t.name]))
}

export function useUpdateBJJWorkout() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: UpdateBJJWorkoutPayload) => {
      // Resolve all technique IDs to names across all sections
      const allTechIds = payload.sections.flatMap((s) => s.techniqueIds)
      const techIdToName = await resolveTechniqueNames(allTechIds)

      const { error } = await supabase.rpc('bjj_update_workout', {
        p_workout_id: payload.workoutId,
        p_title: payload.title,
        p_performed_at: payload.performedAt,
        p_duration_min: payload.durationMin,
        p_notes: payload.notes,
        p_rpe: payload.rpe ?? null,
        p_sections: payload.sections.map((s) => ({
          id: s.id ?? null,
          section_number: s.orderIndex + 1,  // 1-indexed to match bjj_sections_section_number_check (>= 1)
          goal: s.goal,
          raw_description: s.rawDescription ?? null,
          duration_minutes: s.durationMinutes ?? null,
          technique_names: s.techniqueIds.flatMap((id) => {
              const name = techIdToName.get(id)
              return name ? [name] : []
            }),
          enhanced_notes: s.enhancedNotes ?? null,
        })),
      })

      if (error) throw error
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['workout', variables.workoutId] })
      void queryClient.invalidateQueries({ queryKey: ['bjj-sections', variables.workoutId] })
    },
  })
}