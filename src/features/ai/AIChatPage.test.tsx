import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AIChatPage } from './AIChatPage'
import type { useGenerateWorkout } from './useGenerateWorkout'
import type { WorkoutProposal } from './useGenerateWorkout'

vi.mock('./useGenerateWorkout', () => ({
  useGenerateWorkout: vi.fn(),
}))

import { useGenerateWorkout as useGenerateMock } from './useGenerateWorkout'

const mockGenerate = vi.mocked(useGenerateMock)

type GenerateResult = ReturnType<typeof useGenerateWorkout>

function makeGenerateMutation(overrides: Partial<GenerateResult> = {}): GenerateResult {
  return {
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
    isError: false,
    error: null,
    reset: vi.fn(),
    ...overrides,
  } as unknown as GenerateResult
}

const sampleProposal: WorkoutProposal = {
  title: 'AI Generated WOD',
  type: 'crossfit',
  performedAt: '2026-04-05T10:00:00.000Z',
  durationMinutes: 45,
  notes: 'Generated from prompt: test workout',
  rpe: 7,
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/ai']}>
        <Routes>
          <Route path="/ai" element={<AIChatPage />} />
          <Route path="/workouts" element={<div>Workouts list</div>} />
          <Route path="/workouts/new" element={<div>Workout form</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('AIChatPage', () => {
  beforeEach(() => {
    mockGenerate.mockReturnValue(makeGenerateMutation())
  })

  it('renders the prompt textarea and Generate button', () => {
    renderPage()

    expect(screen.getByRole('textbox', { name: /workout prompt/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /generate/i })).toBeInTheDocument()
  })

  it('Generate button is disabled when prompt is empty', () => {
    renderPage()
    expect(screen.getByRole('button', { name: /generate/i })).toBeDisabled()
  })

  it('Generate button is enabled when prompt has text', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByRole('textbox', { name: /workout prompt/i }), 'some workout')
    expect(screen.getByRole('button', { name: /generate/i })).not.toBeDisabled()
  })

  it('shows loading state during generation', () => {
    mockGenerate.mockReturnValue(makeGenerateMutation({ isPending: true }))
    renderPage()

    const genBtn = screen.getByRole('button', { name: /generating/i })
    expect(genBtn).toBeDisabled()
  })

  it('calls generateWorkout with the prompt on submit', async () => {
    const user = userEvent.setup()
    const mutateAsync = vi.fn().mockResolvedValue(sampleProposal)
    mockGenerate.mockReturnValue(makeGenerateMutation({ mutateAsync }))
    renderPage()

    await user.type(screen.getByRole('textbox', { name: /workout prompt/i }), 'crossfit workout')
    await user.click(screen.getByRole('button', { name: /generate/i }))

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith('crossfit workout')
    })
  })

  it('shows the proposal card after generation', async () => {
    const user = userEvent.setup()
    const mutateAsync = vi.fn().mockResolvedValue(sampleProposal)
    mockGenerate.mockReturnValue(makeGenerateMutation({ mutateAsync }))
    renderPage()

    await user.type(screen.getByRole('textbox', { name: /workout prompt/i }), 'crossfit workout')
    await user.click(screen.getByRole('button', { name: /generate/i }))

    await waitFor(() => {
      expect(screen.getByText('AI Generated WOD')).toBeInTheDocument()
      expect(screen.getByText(/45 minutes/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /save workout/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
    })
  })

  it('navigates to /workouts/new with prefill state when saving proposal', async () => {
    const user = userEvent.setup()
    const mutateAsync = vi.fn().mockResolvedValue(sampleProposal)
    mockGenerate.mockReturnValue(makeGenerateMutation({ mutateAsync }))
    renderPage()

    await user.type(screen.getByRole('textbox', { name: /workout prompt/i }), 'crossfit workout')
    await user.click(screen.getByRole('button', { name: /generate/i }))

    await waitFor(() => screen.getByRole('button', { name: /save workout/i }))
    await user.click(screen.getByRole('button', { name: /save workout/i }))

    await waitFor(() => {
      expect(screen.getByText('Workout form')).toBeInTheDocument()
    })
  })

  it('clears proposal and prompt when Try again is clicked', async () => {
    const user = userEvent.setup()
    const mutateAsync = vi.fn().mockResolvedValue(sampleProposal)
    mockGenerate.mockReturnValue(makeGenerateMutation({ mutateAsync }))
    renderPage()

    await user.type(screen.getByRole('textbox', { name: /workout prompt/i }), 'crossfit workout')
    await user.click(screen.getByRole('button', { name: /generate/i }))

    await waitFor(() => screen.getByRole('button', { name: /try again/i }))
    await user.click(screen.getByRole('button', { name: /try again/i }))

    expect(screen.queryByText('AI Generated WOD')).not.toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /workout prompt/i })).toHaveValue('')
  })

  it('shows error message when generation fails', () => {
    mockGenerate.mockReturnValue(
      makeGenerateMutation({
        error: { error: { code: 'AI_ERROR', message: 'OpenAI API error' } } as unknown as Error,
        isError: true,
      }),
    )
    renderPage()

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText(/OpenAI API error/i)).toBeInTheDocument()
  })
})
