/**
 * Pure function: parse an LLM (or mock) response into the BJJSectionAIResponse
 * shape, with a discriminated return type.
 *
 * This module is the single source of truth for "what does a valid AI response
 * look like". The EF (Deno) imports it via relative path; the client (Vitest)
 * imports it via the same path. No code duplication.
 *
 * Why a wrapper around the Zod schema, not just `.safeParse()`?
 *   - The EF needs a discriminated result so the 422 response can carry the
 *     Zod issues verbatim (PRD §6.8.2 error model).
 *   - The Deno harness cannot be exercised from Vitest; this pure function
 *     is the only testable surface for the contract.
 *   - The mock fallback (buildMockResponse) also passes through this
 *     function so the contract is uniform — every code path that returns a
 *     BJJSectionAIResponse has been validated by the same Zod schema.
 *
 * REQ-RE6: response shape
 * REQ-RE7: prompt rules
 *   The prompt instructs the LLM to use canonical bjj_positions keys; the
 *   BJJPositionKeySchema (in bjj.schema.ts) enforces the same set at the
 *   boundary. If the LLM fabricates a key, the parse fails here.
 */
import { BJJSectionAIResponseSchema, type BJJSectionAIResponse } from '../bjj.schema'

export interface ParseBJJSectionAIResponseIssue {
  /** Dotted path: "rolls.0.confidence", "ai_description", etc. */
  path: string
  /** Human-readable Zod message ("Number must be less than or equal to 1") */
  message: string
}

export interface ParseBJJSectionAIResponseError {
  code: 'INVALID_AI_RESPONSE'
  message: string
  issues: ReadonlyArray<ParseBJJSectionAIResponseIssue>
}

export type ParseBJJSectionAIResponseResult =
  | { ok: true; data: BJJSectionAIResponse }
  | { ok: false; error: ParseBJJSectionAIResponseError }

export function parseBJJSectionAIResponse(
  raw: unknown,
): ParseBJJSectionAIResponseResult {
  const result = BJJSectionAIResponseSchema.safeParse(raw)
  if (result.success) {
    return { ok: true, data: result.data }
  }
  return {
    ok: false,
    error: {
      code: 'INVALID_AI_RESPONSE',
      message: 'LLM response did not match the BJJSectionAIResponse schema',
      issues: result.error.issues.map((i) => ({
        path: i.path.join('.'),
        message: i.message,
      })),
    },
  }
}
