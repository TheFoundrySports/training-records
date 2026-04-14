import { useMutation } from '@tanstack/react-query'
import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { ImportResult, TrainingEvaluation } from '../garmin.types'

async function extractFunctionError(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.json()
      return body?.error?.message ?? body?.error ?? JSON.stringify(body)
    } catch {
      return error.message
    }
  }
  if (error instanceof Error) return error.message
  return String(error)
}

export type EvaluationApiResponse = {
  evaluation: {
    id: string
    summary: string
    readiness_level: string
    next_session_suggestion: string
    adaptation_warning: string | null
  }
}

export function mapEvaluation(raw: EvaluationApiResponse): TrainingEvaluation {
  return {
    id: raw.evaluation.id,
    garminActivityId: '',
    userId: '',
    summary: raw.evaluation.summary,
    readinessLevel: raw.evaluation.readiness_level as TrainingEvaluation['readinessLevel'],
    nextSessionSuggestion: raw.evaluation.next_session_suggestion,
    adaptationWarning: raw.evaluation.adaptation_warning,
    createdAt: new Date().toISOString(),
  }
}

export function useGarminImport() {
  const evaluateMutation = useMutation({
    mutationFn: async (garminActivityId: string): Promise<TrainingEvaluation | null> => {
      const { data, error } = await supabase.functions.invoke<EvaluationApiResponse>(
        'training-evaluation',
        { body: { garmin_activity_id: garminActivityId } },
      )

      if (error) {
        const message = await extractFunctionError(error)
        throw new Error(message)
      }

      return data ? mapEvaluation(data) : null
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
        const message = await extractFunctionError(error)
        throw new Error(message)
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
