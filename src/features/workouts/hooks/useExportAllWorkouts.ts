import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { buildExportWorkout } from './exportWorkoutUtils'
import type { BJJSectionDB, WorkoutRow } from './exportWorkoutUtils'

function formatDate(iso: string): string {
  return iso.split('T')[0]
}

export function useExportAllWorkouts() {
  return useMutation({
    mutationFn: async () => {
      const { data: workouts, error } = await supabase
        .from('workouts')
        .select(
          'id, title, type, performed_at, duration_minutes, notes, enhanced_notes, rpe, wod_format, wod_text, payload'
        )
        .order('performed_at', { ascending: false })

      if (error) {
        throw error
      }

      const withSections = await Promise.all(
        (workouts ?? []).map(async (workout) => {
          if (workout.type !== 'bjj') return { workout, sections: null }

          const { data: sectionsData } = await supabase
            .from('bjj_sections')
            .select(
              `section_number, goal, raw_description, ai_description, duration_minutes,
              bjj_section_techniques ( bjj_techniques ( name, name_es, category ) )`
            )
            .eq('workout_id', workout.id)
            .order('section_number', { ascending: true })

          return { workout, sections: (sectionsData as unknown as BJJSectionDB[]) ?? null }
        })
      )

      const exportData = withSections.map(({ workout, sections }) =>
        buildExportWorkout(workout as WorkoutRow, sections)
      )

      const json = JSON.stringify(
        { version: 1, exportedAt: new Date().toISOString(), workouts: exportData },
        null,
        2
      )

      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const filename = `workouts-export-${formatDate(new Date().toISOString())}.json`
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    },
  })
}