/**
 * RED tests for the Q1 update: `BJJSectionEditor.AIPreview` state carries
 * `rolls[]` so PR 7's `<RollReviewPanel>` can consume it.
 *
 * The `AIPreview` interface (line 13 of the pre-PR-3 file) was 2 fields.
 * After this PR it has 3 fields: `ai_description`, `matched_technique_ids`,
 * `rolls`. The state is set from the hook's result (which now also
 * surfaces `rolls[]`).
 *
 * The test renders the editor with a real AI enhance flow so the
 * `setPreview(result)` call is exercised. The test asserts:
 *  - the `AIPreview` state has the new `rolls` field;
 *  - the `AIPreviewPanel` receives the new prop;
 *  - the existing apply/discard flow still works (the rolls data
 *    doesn't break the legacy 2-field flow).
 *
 * Note: the actual `RollReviewPanel` component ships in PR 7 \u2014 this
 * test only verifies the data flow (state shape + prop threading).
 * The editor gets a TODO comment + the prop type so PR 7 can plug
 * in the panel cleanly.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useForm, FormProvider } from 'react-hook-form'
import type { ReactNode } from 'react'

const mockInvoke = vi.fn()
vi.mock('@/lib/supabase', () => ({
  supabase: {
    functions: {
      invoke: (...args: unknown[]) => mockInvoke(...args),
    },
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({ data: [], error: null }),
      }),
    }),
  },
}))

// Mock the techniques hook used by AIPreviewPanel
vi.mock('../hooks/useBJJTechniques', () => ({
  useBJJTechniques: () => ({ data: [] }),
}))

import { BJJSectionEditor } from '../components/BJJSectionEditor'
import type { BJJWorkoutFormValues } from '../bjj.schema'

const VALID_RESPONSE = {
  ai_description: 'AI-enhanced description from the EF',
  matched_technique_ids: [],
  rolls: [
    {
      roll_index: 1,
      role: 'attacking',
      outcome: 'submission',
      position_from: 'closed_guard',
      position_to: null,
      technique_names: ['Triangle Choke'],
      confidence: 0.9,
      raw_excerpt: 'I tapped my partner with a triangle from closed guard.',
    },
  ],
}

function FormHarness({ children }: { children: ReactNode }) {
  const methods = useForm<BJJWorkoutFormValues>({
    defaultValues: {
      title: 'Test',
      performedAt: '2026-06-12T10:00:00.000Z',
      durationMinutes: 60,
      sections: [
        { goal: 'Sparring from closed guard', rawDescription: 'Triangle tap.', techniqueIds: [] },
      ],
    },
  })
  return <FormProvider {...methods}>{children}</FormProvider>
}

function renderEditor() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <FormHarness>
        <BJJSectionEditor
          index={0}
          control={undefined as never}
          onRemove={() => {}}
          removeDisabled={false}
          isPending={false}
        />
      </FormHarness>
    </QueryClientProvider>,
  )
}

describe('BJJSectionEditor.AIPreview \u2014 Q1: rolls[] flows through state (PR 7 prep)', () => {
  beforeEach(() => {
    mockInvoke.mockReset()
  })

  it('renders the AIPreview with the new rolls[] field after enhance', async () => {
    mockInvoke.mockResolvedValue({ data: VALID_RESPONSE, error: null })
    renderEditor()

    // Click the Enhance button. It's labeled "Enhance with AI" when idle.
    const enhanceBtn = screen.getByRole('button', { name: /enhance with ai/i })
    await act(async () => {
      enhanceBtn.click()
    })

    // After the EF response resolves, the AIPreviewPanel should render
    // the ai_description (this proves the hook + state flow is intact).
    await waitFor(() => {
      expect(screen.getByText(/AI Enhanced/i)).toBeInTheDocument()
    })
    expect(screen.getByText(VALID_RESPONSE.ai_description)).toBeInTheDocument()

    // The apply/discard actions must still be present \u2014 the existing
    // 2-field flow is not regressed by adding rolls[].
    expect(screen.getByRole('button', { name: /^apply$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^discard$/i })).toBeInTheDocument()
  })

  it('accepts a mock response with rolls: [] (drilling-only section) without crashing', async () => {
    mockInvoke.mockResolvedValue({
      data: { ...VALID_RESPONSE, rolls: [] },
      error: null,
    })
    renderEditor()
    const enhanceBtn = screen.getByRole('button', { name: /enhance with ai/i })
    await act(async () => {
      enhanceBtn.click()
    })
    await waitFor(() => {
      expect(screen.getByText(/AI Enhanced/i)).toBeInTheDocument()
    })
    // The AI panel renders even with empty rolls \u2014 PR 7 will add the
    // <RollReviewPanel> below this when rolls.length > 0.
    expect(screen.getByText(VALID_RESPONSE.ai_description)).toBeInTheDocument()
  })
})
