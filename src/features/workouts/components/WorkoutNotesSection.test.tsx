import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WorkoutNotesSection } from './WorkoutNotesSection'
import type { Workout } from '../workout.types'

vi.mock('../hooks/useWorkoutNotesAI', () => ({
  useWorkoutNotesAI: vi.fn(),
}))

vi.mock('../hooks/useWorkoutMutations', () => ({
  useUpdateWorkout: vi.fn(),
}))

import { useWorkoutNotesAI } from '../hooks/useWorkoutNotesAI'
import { useUpdateWorkout } from '../hooks/useWorkoutMutations'

const mockUseWorkoutNotesAI = vi.mocked(useWorkoutNotesAI)
const mockUseUpdateWorkout = vi.mocked(useUpdateWorkout)

function makeWorkout(overrides: Partial<Workout> = {}): Workout {
  return {
    id: 'workout-1',
    title: 'Test Workout',
    type: 'crossfit',
    performedAt: '2026-04-01T10:00:00Z',
    durationMinutes: 60,
    notes: 'Original notes',
    enhancedNotes: null,
    rpe: null,
    wodText: null,
    wodFormat: null,
    payload: null,
    userId: 'user-1',
    createdAt: '2026-04-01T10:00:00Z',
    ...overrides,
  } as Workout
}

function makeAINotPending() {
  return {
    enhance: vi.fn(),
    enhanceAsync: vi.fn(),
    isPending: false,
    error: null,
    reset: vi.fn(),
  }
}

function makeUpdateMutation(overrides: Record<string, unknown> = {}) {
  return {
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
    isError: false,
    error: null,
    reset: vi.fn(),
    ...overrides,
  }
}

function renderSection(workout: Workout) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <WorkoutNotesSection workout={workout} />
    </QueryClientProvider>,
  )
}

describe('WorkoutNotesSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseWorkoutNotesAI.mockReturnValue(makeAINotPending())
    mockUseUpdateWorkout.mockReturnValue(makeUpdateMutation())
  })

  it('renders notes when present', () => {
    const workout = makeWorkout({ notes: 'My workout notes' })
    renderSection(workout)
    expect(screen.getByText('My workout notes')).toBeInTheDocument()
  })

  it('renders enhancedNotes when both notes and enhancedNotes are present', () => {
    const workout = makeWorkout({
      notes: 'Original',
      enhancedNotes: 'Enhanced content',
    })
    renderSection(workout)

    expect(screen.getByText('Original')).toBeInTheDocument()
    expect(screen.getByText('Enhanced content')).toBeInTheDocument()
  })

  it('AI Enhance button triggers enhance mutation', async () => {
    const user = userEvent.setup()
    const enhanceMock = vi.fn()
    mockUseWorkoutNotesAI.mockReturnValue({
      ...makeAINotPending(),
      enhance: enhanceMock,
    })

    const workout = makeWorkout({ notes: 'Notes to enhance' })
    renderSection(workout)

    await user.click(screen.getByRole('button', { name: /enhance with ai/i }))

    expect(enhanceMock).toHaveBeenCalledWith(
      { notes: 'Notes to enhance' },
      expect.objectContaining({
        onSuccess: expect.any(Function),
        onError: expect.any(Function),
        onSettled: expect.any(Function),
      }),
    )
  })

  it('AI Enhance button is disabled when AI mutation is pending', () => {
    mockUseWorkoutNotesAI.mockReturnValue({
      ...makeAINotPending(),
      isPending: true,
    })

    const workout = makeWorkout({ notes: 'Notes' })
    renderSection(workout)

    expect(screen.getByRole('button', { name: /enhancing/i })).toBeDisabled()
  })

  it('shows Apply and Discard buttons in preview panel after AI success', async () => {
    const user = userEvent.setup()
    const enhanceMock = vi.fn()

    mockUseWorkoutNotesAI.mockReturnValue({
      enhance: enhanceMock,
      enhanceAsync: vi.fn(),
      isPending: false,
      error: null,
      reset: vi.fn(),
    })

    const workout = makeWorkout({ notes: 'Original notes' })
    renderSection(workout)

    await user.click(screen.getByRole('button', { name: /enhance with ai/i }))

    // Trigger the onSuccess callback to show preview panel
    const successCallback = enhanceMock.mock.calls[0][1]?.onSuccess
    if (successCallback) {
      successCallback({ enhanced_notes: 'Enhanced notes content' })
    }

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /apply/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /discard/i })).toBeInTheDocument()
    })
  })

  it('displays AI Enhance button when notes exist', () => {
    const workout = makeWorkout({ notes: 'Has notes' })
    renderSection(workout)

    expect(screen.getByRole('button', { name: /enhance with ai/i })).toBeInTheDocument()
  })

  it('does not display AI Enhance button when notes are empty', () => {
    const workout = makeWorkout({ notes: '' })
    renderSection(workout)

    expect(screen.queryByRole('button', { name: /enhance with ai/i })).not.toBeInTheDocument()
  })
})
