import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { ImportResult, TrainingEvaluation } from '../garmin.types'

export function useGarminImport() {
  const [isImporting, setIsImporting] = useState(false)
  const [isEvaluating, setIsEvaluating] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [evaluation, setEvaluation] = useState<TrainingEvaluation | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function importAndEvaluate(file: File, workoutId: string) {
    setError(null)
    setImportResult(null)
    setEvaluation(null)

    // Step 1: Import the .fit file
    setIsImporting(true)
    let result: ImportResult
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('workout_id', workoutId)

      const { data, error: importError } = await supabase.functions.invoke<ImportResult>(
        'garmin-import',
        { body: formData },
      )

      if (importError) {
        throw new Error(importError.message)
      }

      if (!data) {
        throw new Error('No data returned from garmin-import')
      }

      result = data
      setImportResult(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import Garmin activity')
      setIsImporting(false)
      return
    } finally {
      setIsImporting(false)
    }

    // Step 2: Generate AI evaluation
    setIsEvaluating(true)
    try {
      const { data: evalData, error: evalError } =
        await supabase.functions.invoke<TrainingEvaluation>('training-evaluation', {
          body: { garmin_activity_id: result.garminActivityId },
        })

      if (evalError) {
        // Evaluation failure is non-fatal — import already succeeded
        console.warn('Training evaluation failed:', evalError.message)
        return
      }

      if (evalData) {
        setEvaluation(evalData)
      }
    } catch (err) {
      // Non-fatal: evaluation failure doesn't undo the import
      console.warn('Training evaluation error:', err)
    } finally {
      setIsEvaluating(false)
    }
  }

  return {
    importAndEvaluate,
    isImporting,
    isEvaluating,
    importResult,
    evaluation,
    error,
  }
}
