import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { workoutSchema, type WorkoutFormValues } from '@/features/workouts/workout.schema'

export type WorkoutProposal = WorkoutFormValues

/**
 * Extracts the error message from a Supabase FunctionsHttpError.
 * Tries to parse the JSON body from error.response.clone().json()
 * and extract .error.message, falling back to error.message.
 */
export async function extractEdgeFunctionError(error: unknown): Promise<string> {
  if (error instanceof Error && error.response) {
    try {
      const response = (error as Error & { response: { clone: () => { json: () => Promise<unknown> } } }).response
      const cloned = response.clone()
      const body = (await cloned.json()) as { error?: { message?: string } }
      if (body?.error?.message) {
        return body.error.message
      }
    } catch {
      // Fall through to fallback
    }
  }
  if (error instanceof Error) {
    return error.message
  }
  return String(error)
}

export function useGenerateWorkout() {
  return useMutation({
    mutationFn: async (prompt: string): Promise<WorkoutProposal> => {
      const { data, error } = await supabase.functions.invoke<unknown>('ai-generate', {
        body: { prompt },
      })

      if (error) {
        throw new Error(await extractEdgeFunctionError(error))
      }

      if (!data) {
        throw { error: { code: 'AI_ERROR', message: 'No data returned from AI', details: {} } }
      }

      const result = workoutSchema.safeParse(data)
      if (!result.success) {
        throw {
          error: {
            code: 'AI_INVALID_RESPONSE',
            message: 'AI returned an invalid workout structure',
            details: result.error.issues,
          },
        }
      }

      return result.data
    },
  })
}
