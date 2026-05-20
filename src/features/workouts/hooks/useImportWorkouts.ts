import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

interface ImportedWorkout {
  title: string
  type: string
  performedAt: string
  durationMinutes: number
  rpe?: number | null
  notes?: string | null
  enhancedNotes?: string | null
  wodFormat?: string | null
  wodText?: string | null
  payload?: Record<string, unknown> | null
  sections?: ImportedSection[] | null
}

interface ImportedSection {
  sectionNumber: number
  goal: string
  rawDescription?: string | null
  aiDescription?: string | null
  durationMinutes?: number | null
  techniques?: ImportedTechnique[]
}

interface ImportedTechnique {
  name: string
  nameEs?: string | null
  category?: string | null
}

interface ImportFile {
  version: number
  exportedAt?: string
  workouts: ImportedWorkout[]
}

export function useImportWorkouts() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (file: File): Promise<number> => {
      const text = await file.text()
      const parsed: ImportFile = JSON.parse(text)

      if (parsed.version !== 1) {
        throw { code: 'UNSUPPORTED_VERSION', message: 'Unsupported format version' }
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        throw { code: 'AUTH_ERROR', message: 'Not authenticated' }
      }

      let count = 0

      for (const w of parsed.workouts) {
        const { data: workoutRow, error: workoutError } = await supabase
          .from('workouts')
          .insert({
            title: w.title,
            type: w.type,
            performed_at: w.performedAt,
            duration_minutes: w.durationMinutes,
            notes: w.notes ?? null,
            enhanced_notes: w.enhancedNotes ?? null,
            rpe: w.rpe ?? null,
            wod_format: w.wodFormat ?? null,
            wod_text: w.wodText ?? null,
            payload: w.payload ?? null,
            user_id: user.id,
          })
          .select()
          .single()

        if (workoutError || !workoutRow) {
          throw { code: 'INSERT_ERROR', message: workoutError?.message }
        }

        if (w.type === 'bjj' && Array.isArray(w.sections)) {
          for (const sec of w.sections) {
            const { data: sectionRow } = await supabase
              .from('bjj_sections')
              .insert({
                workout_id: workoutRow.id,
                section_number: sec.sectionNumber,
                goal: sec.goal,
                raw_description: sec.rawDescription ?? null,
                ai_description: sec.aiDescription ?? null,
                duration_minutes: sec.durationMinutes ?? null,
              })
              .select()
              .single()

            if (!sectionRow) continue

            if (sec.techniques) {
              for (const tech of sec.techniques) {
                const { data: techRow } = await supabase
                  .from('bjj_techniques')
                  .select('id')
                  .eq('name', tech.name)
                  .single()

                if (techRow) {
                  await supabase
                    .from('bjj_section_techniques')
                    .insert({ section_id: sectionRow.id, technique_id: techRow.id })
                }
              }
            }
          }
        }
        count++
      }

      return count
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['workouts'] })
    },
  })
}