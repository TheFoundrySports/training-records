import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { ImportResult, TrainingEvaluation } from '../garmin.types'

export function useGarminImport() {
  const evaluateMutation = useMutation({
    mutationFn: async (garminActivityId: string): Promise<TrainingEvaluation | null> => {
      const { data, error } = await supabase.functions.invoke<TrainingEvaluation>(
        'training-evaluation',
        { body: { garmin_activity_id: garminActivityId } },
      )

      if (error) {
        throw new Error(error.message)
      }

      return data ?? null
    },
  })

  const importMutation = useMutation({
    mutationFn: async ({
      file,
      workoutId,
    }: {
      file: File
      workoutId: string
    }): Promise<ImportResult> => {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('workout_id', workoutId)

      const { data, error } = await supabase.functions.invoke<ImportResult>('garmin-import', {
        body: formData,
      })

      if (error) {
        throw new Error(error.message)
      }

      if (!data) {
        throw new Error('No data returned from garmin-import')
      }

      return data
    },
    onSuccess: (result) => {
      // Chain: trigger evaluation after successful import
      evaluateMutation.mutate(result.garminActivityId)
    },
  })

  function importAndEvaluate(file: File, workoutId: string) {
    importMutation.mutate({ file, workoutId })
  }

  return {
    importAndEvaluate,
    isImporting: importMutation.isPending,
    isEvaluating: evaluateMutation.isPending,
    importResult: importMutation.data ?? null,
    evaluation: evaluateMutation.data ?? null,
    error: importMutation.error?.message ?? null,
    evaluationError: evaluateMutation.error?.message ?? null,
  }
}
