import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { TrainingEvaluation } from '../garmin.types'

function mapEvaluationRow(row: {
  id: string
  garmin_activity_id: string
  user_id: string
  summary: string
  readiness_level: string
  next_session_suggestion: string
  adaptation_warning: string | null
  created_at: string
}): TrainingEvaluation {
  return {
    id: row.id,
    garminActivityId: row.garmin_activity_id,
    userId: row.user_id,
    summary: row.summary,
    readinessLevel: row.readiness_level as TrainingEvaluation['readinessLevel'],
    nextSessionSuggestion: row.next_session_suggestion,
    adaptationWarning: row.adaptation_warning,
    createdAt: row.created_at,
  }
}

export function useTrainingEvaluation(garminActivityId: string | undefined) {
  return useQuery({
    queryKey: ['training_evaluations', garminActivityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_evaluations')
        .select('*')
        .eq('garmin_activity_id', garminActivityId!)
        .maybeSingle()

      if (error) {
        throw {
          error: {
            code: error.code ?? 'UNKNOWN',
            message: error.message,
            details: error.details,
          },
        }
      }

      if (!data) return null

      return mapEvaluationRow(data)
    },
    enabled: Boolean(garminActivityId),
  })
}
