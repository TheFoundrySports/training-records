import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { buildExportWorkout, generateExportFilename } from './exportWorkoutUtils'
import type { BJJSectionDB, WorkoutRow } from './exportWorkoutUtils'

export function useExportWorkout(workoutId: string) {
  return useMutation({
    mutationFn: async () => {
      const { data: workout, error } = await supabase
        .from('workouts')
        .select(
          'title, type, performed_at, duration_minutes, notes, enhanced_notes, rpe, wod_format, wod_text, payload'
        )
        .eq('id', workoutId)
        .single()

      if (error || !workout) {
        throw error ?? new Error('Workout not found')
      }

      let sections: BJJSectionDB[] | null = null
      if (workout.type === 'bjj') {
        const { data: sectionsData } = await supabase
          .from('bjj_sections')
          .select(
            `section_number, goal, raw_description, ai_description, duration_minutes,
            bjj_section_techniques ( bjj_techniques ( name, name_es, category ) )`
          )
          .eq('workout_id', workoutId)
          .order('section_number', { ascending: true })

        sections = (sectionsData as unknown as BJJSectionDB[]) ?? null
      }

      const exportData = buildExportWorkout(workout as WorkoutRow, sections)
      const json = JSON.stringify(
        { version: 1, exportedAt: new Date().toISOString(), workouts: [exportData] },
        null,
        2
      )

      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const filename = generateExportFilename(workout as WorkoutRow)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    },
  })
}