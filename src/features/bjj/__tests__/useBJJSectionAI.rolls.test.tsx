/**
 * RED tests for the Q1 update: `useBJJSectionAI` returns `rolls[]` and the
 * `AIPreview` state in `BJJSectionEditor` threads it through.
 *
 * PR 2 extended the EF + Zod schemas to emit `rolls[]`, but the client
 * hook and the editor state still have the old 2-field interface. PR 3
 * (Q1 from PR 2's handoff) closes that gap: the hook surfaces `rolls[]`
 * on `BJJSectionAIResult`, and the editor's `AIPreview` state carries
 * the field so PR 7's `<RollReviewPanel>` can consume it.
 *
 * The tests are split:
 *  - useBJJSectionAI.test.tsx: hook returns `rolls[]` from the parsed
 *    EF response. Mocks `supabase.functions.invoke`.
 *  - BJJSectionEditor.rolls.test.tsx: the `AIPreview` state shape
 *    includes `rolls[]` and the editor passes it down to the
 *    preview panel.
 *
 * Refs: PR 2 handoff risk #1 (mock fallback now emits `rolls: []`).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

// Mock the supabase client so we control the EF response.
const mockInvoke = vi.fn()
vi.mock('@/lib/supabase', () => ({
  supabase: {
    functions: {
      invoke: (...args: unknown[]) => mockInvoke(...args),
    },
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
  },
}))

import { useBJJSectionAI } from '../hooks/useBJJSectionAI'

// Build a fresh QueryClient per test to avoid cross-test cache leakage.
function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
}

const VALID_RESPONSE = {
  ai_description: 'You drilled the scissor sweep from closed guard.',
  matched_technique_ids: ['11111111-1111-4111-8111-111111111111'],
  rolls: [
    {
      roll_index: 1,
      role: 'attacking' as const,
      outcome: 'position_gain' as const,
      position_from: 'closed_guard',
      position_to: 'mount',
      technique_names: ['Scissor sweep'],
      confidence: 0.85,
      raw_excerpt: 'I scissor-swept from closed guard and got the mount.',
    },
  ],
}

describe('useBJJSectionAI \u2014 Q1: surface rolls[] on the result (PR 2 handoff risk #1)', () => {
  beforeEach(() => {
    mockInvoke.mockReset()
  })

  it('returns rolls[] on a successful EF response (sparring section)', async () => {
    mockInvoke.mockResolvedValue({ data: VALID_RESPONSE, error: null })
    const wrapper = makeWrapper()
    const { result } = renderHook(() => useBJJSectionAI(), { wrapper })

    await act(async () => {
      result.current.enhance({
        section_goal: 'Sparring from closed guard',
        raw_description: 'I scissor-swept from closed guard and got the mount.',
      })
      await waitFor(() => expect(result.current.error).toBeNull())
    })

    expect(result.current.error).toBeNull()
    // Q1 contract: the hook's result type must include rolls[].
    // The hook doesn't return the result directly, but the consumer
    // gets it via the onSuccess callback. We re-render to capture it.
    let captured: unknown = null
    const captureWrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
    )
    const { result: r2 } = renderHook(() => useBJJSectionAI(), { wrapper: captureWrapper })
    await act(async () => {
      r2.current.enhance(
        { section_goal: 'Sparring from closed guard', raw_description: 'x' },
        {
          onSuccess: (data) => {
            captured = data
          },
        },
      )
      await waitFor(() => expect(captured).not.toBeNull())
    })
    expect(captured).toMatchObject({
      ai_description: VALID_RESPONSE.ai_description,
      matched_technique_ids: VALID_RESPONSE.matched_technique_ids,
      rolls: VALID_RESPONSE.rolls,
    })
  })

  it('returns empty rolls[] for a drilling-only section', async () => {
    mockInvoke.mockResolvedValue({
      data: {
        ai_description: 'You drilled the scissor sweep.',
        matched_technique_ids: [],
        rolls: [],
      },
      error: null,
    })
    let captured: { rolls: unknown[] } | null = null
    const wrapper = makeWrapper()
    const { result } = renderHook(() => useBJJSectionAI(), { wrapper })
    await act(async () => {
      result.current.enhance(
        { section_goal: 'Drill scissor sweep', raw_description: '' },
        {
          onSuccess: (data) => {
            captured = data as { rolls: unknown[] }
          },
        },
      )
      await waitFor(() => expect(captured).not.toBeNull())
    })
    expect(captured?.rolls).toEqual([])
  })

  it('surfaces an error when the EF response shape regresses (parse boundary)', async () => {
    // Backward-compat: a future EF regression that breaks the contract
    // should fail at the parse boundary, not silently return a partial
    // shape. We send an invalid `confidence` value (1.5 is out of [0,1])
    // so Zod rejects the row \u2014 the missing-rolls case is fine because
    // the schema has `.default([])` for that field.
    mockInvoke.mockResolvedValue({
      data: {
        ai_description: 'old shape',
        matched_technique_ids: [],
        rolls: [
          {
            roll_index: 1,
            role: 'attacking',
            outcome: 'submission',
            position_from: 'closed_guard',
            position_to: null,
            technique_names: [],
            confidence: 1.5, // out of [0,1] \u2014 must be rejected
            raw_excerpt: 'x',
          },
        ],
      },
      error: null,
    })
    const wrapper = makeWrapper()
    const { result } = renderHook(() => useBJJSectionAI(), { wrapper })
    await act(async () => {
      result.current.enhance({ section_goal: 'x', raw_description: '' })
      await waitFor(() => expect(result.current.error).not.toBeNull())
    })
    expect(result.current.error).toBeInstanceOf(Error)
  })
})
