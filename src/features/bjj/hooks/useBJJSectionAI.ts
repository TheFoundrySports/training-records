/**
 * `useBJJSectionAI` \u2014 TanStack mutation hook for the `bjj-section-ai` Edge
 * Function. Returns the parsed `BJJSectionAIResponse` shape including the
 * `rolls[]` field introduced in PR 2.
 *
 * PR 3 (Q1 from PR 2 handoff) wires `parseBJJSectionAIResponse` into the
 * hook so the response is validated through the same Zod schema the EF
 * uses. If the EF ever regresses (drops `rolls`, etc.), the hook throws
 * a typed `INVALID_AI_RESPONSE` error and the editor surfaces it in the
 * red destructive banner (BJJSectionEditor.tsx lines 183-186).
 *
 * The hook's public surface stays the same (`enhance` / `isPending` /
 * `error` / `reset`); the only change is the result type gaining `rolls`.
 */
import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { parseBJJSectionAIResponse } from '../ai/parseBJJSectionAIResponse'
import type { BJJRollProposal } from '../bjj.schema'

interface BJJSectionAIInput {
  section_goal: string
  raw_description: string
}

export interface BJJSectionAIResult {
  ai_description: string
  matched_technique_ids: string[]
  /**
   * Proposed roll events from the EF. Empty array for drilling-only
   * sections; 1..3 high-confidence rows for sparring sections. PR 7's
   * `<RollReviewPanel>` is the consumer.
   */
  rolls: BJJRollProposal[]
}

export function useBJJSectionAI() {
  const mutation = useMutation({
    mutationFn: async (input: BJJSectionAIInput): Promise<BJJSectionAIResult> => {
      const { data, error } = await supabase.functions.invoke<unknown>('bjj-section-ai', {
        body: {
          section_goal: input.section_goal,
          raw_description: input.raw_description,
        },
      })

      if (error) {
        throw new Error(error.message ?? 'AI enhancement failed')
      }

      if (!data) {
        throw new Error('No data returned from AI enhancement')
      }

      // Validate through the same Zod schema the EF uses. This is the
      // single boundary guard: a regression on the EF side (missing
      // `rolls`, bad shape, etc.) surfaces here as a typed error.
      const parsed = parseBJJSectionAIResponse(data)
      if (!parsed.ok) {
        const firstIssue = parsed.error.issues[0]
        const detail = firstIssue ? ` (${firstIssue.path}: ${firstIssue.message})` : ''
        throw new Error(`${parsed.error.message}${detail}`)
      }

      return parsed.data
    },
  })

  return {
    enhance: mutation.mutate,
    enhanceAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  }
}
