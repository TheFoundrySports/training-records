import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WorkoutDetailPage } from './WorkoutDetailPage'
import type { Workout } from '../workout.types'
import type { useWorkout } from '../hooks/useWorkouts'
import type { useDeleteWorkout } from '../hooks/useWorkoutMutations'

vi.mock('../hooks/useWorkouts', () => ({
  useWorkouts: vi.fn(),
  useWorkout: vi.fn(),
}))

vi.mock('../hooks/useWorkoutMutations', () => ({
  useCreateWorkout: vi.fn(),
  useUpdateWorkout: vi.fn(),
  useDeleteWorkout: vi.fn(),
}))

// Mock auth context
vi.mock('@/features/auth/AuthContext', () => ({
  useAuth: vi.fn(() => ({ user: { id: 'u1' }, session: {}, role: 'athlete', isLoading: false })),
}))

import { useAuth as useAuthMock } from '@/features/auth/AuthContext'
import { useWorkout as useWorkoutMock } from '../hooks/useWorkouts'
import { useDeleteWorkout as useDeleteWorkoutMock } from '../hooks/useWorkoutMutations'

const mockUseWorkout = vi.mocked(useWorkoutMock)
const mockUseDelete = vi.mocked(useDeleteWorkoutMock)

type UseWorkoutResult = ReturnType<typeof useWorkout>
type DeleteResult = ReturnType<typeof useDeleteWorkout>

function mockWorkoutReturn(val: Partial<UseWorkoutResult>) {
  mockUseWorkout.mockReturnValue(val as unknown as UseWorkoutResult)
}

function makeDeleteMutation(overrides: Partial<DeleteResult> = {}): DeleteResult {
  return {
    mutateAsync: vi.fn().mockResolvedValue(undefined),
    isPending: false,
    isError: false,
    error: null,
    reset: vi.fn(),
    ...overrides,
  } as unknown as DeleteResult
}

function renderPage(id = 'w1') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/workouts/${id}`]}>
        <Routes>
          <Route path="/workouts/:id" element={<WorkoutDetailPage />} />
          <Route path="/workouts" element={<div>Workouts list</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

const sampleWorkout: Workout = {
  id: 'w1',
  userId: 'u1',
  title: 'Morning WOD',
  type: 'crossfit',
  performedAt: '2026-04-05T08:00:00.000Z',
  durationMinutes: 45,
  rpe: 8,
  notes: 'Felt great today!',
  createdAt: '2026-04-05T08:00:00.000Z',
  updatedAt: '2026-04-05T08:00:00.000Z',
}

describe('WorkoutDetailPage', () => {
  it('shows loading state while fetching', () => {
    mockUseDelete.mockReturnValue(makeDeleteMutation())
    mockWorkoutReturn({ data: undefined, isLoading: true, isError: false, error: null })
    renderPage()
    expect(screen.getByRole('status', { name: /loading workout/i })).toBeInTheDocument()
  })

  it('shows 404 error state for unknown id', () => {
    mockUseDelete.mockReturnValue(makeDeleteMutation())
    mockWorkoutReturn({
      data: undefined,
      isLoading: false,
      isError: true,
      error: { error: { code: 'NOT_FOUND', message: 'Workout not found' } } as unknown as Error,
    })
    renderPage('unknown-id')
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText(/workout not found/i)).toBeInTheDocument()
  })

  it('shows generic error state for server errors', () => {
    mockUseDelete.mockReturnValue(makeDeleteMutation())
    mockWorkoutReturn({
      data: undefined,
      isLoading: false,
      isError: true,
      error: { error: { code: 'SERVER_ERROR', message: 'Internal server error' } } as unknown as Error,
    })
    renderPage()
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText(/failed to load workout/i)).toBeInTheDocument()
  })

  it('renders all workout fields when loaded', () => {
    mockUseDelete.mockReturnValue(makeDeleteMutation())
    mockWorkoutReturn({ data: sampleWorkout, isLoading: false, isError: false, error: null })
    renderPage()

    expect(screen.getByText('Morning WOD')).toBeInTheDocument()
    expect(screen.getByText('crossfit')).toBeInTheDocument()
    expect(screen.getByText(/45 minutes/i)).toBeInTheDocument()
    expect(screen.getByText(/8 \/ 10/i)).toBeInTheDocument()
    expect(screen.getByText('Felt great today!')).toBeInTheDocument()
  })

  it('hides optional fields when they are not set', () => {
    mockUseDelete.mockReturnValue(makeDeleteMutation())
    const workoutNoOptionals: Workout = { ...sampleWorkout, rpe: undefined, notes: undefined }
    mockWorkoutReturn({ data: workoutNoOptionals, isLoading: false, isError: false, error: null })
    renderPage()

    expect(screen.queryByText(/\/ 10/)).not.toBeInTheDocument()
    expect(screen.queryByText('Notes')).not.toBeInTheDocument()
  })

  it('shows back button to return to workouts list', () => {
    mockUseDelete.mockReturnValue(makeDeleteMutation())
    mockWorkoutReturn({ data: sampleWorkout, isLoading: false, isError: false, error: null })
    renderPage()
    expect(screen.getByRole('button', { name: /back to workouts/i })).toBeInTheDocument()
  })

  it('shows edit and delete buttons for workout owner', () => {
    mockUseDelete.mockReturnValue(makeDeleteMutation())
    mockWorkoutReturn({ data: sampleWorkout, isLoading: false, isError: false, error: null })
    renderPage()
    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument()
  })

  it('does not show edit/delete buttons for non-owner', () => {
    mockUseDelete.mockReturnValue(makeDeleteMutation())
    // workout belongs to 'u1' but auth returns 'u2'
    vi.mocked(useAuthMock).mockReturnValueOnce({ user: { id: 'u2' } as never, session: null, role: null, isLoading: false })
    mockWorkoutReturn({ data: sampleWorkout, isLoading: false, isError: false, error: null })
    renderPage()
    expect(screen.queryByRole('button', { name: /^edit$/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^delete$/i })).not.toBeInTheDocument()
  })

  it('opens delete confirmation dialog when delete is clicked', async () => {
    const user = userEvent.setup()
    mockUseDelete.mockReturnValue(makeDeleteMutation())
    mockWorkoutReturn({ data: sampleWorkout, isLoading: false, isError: false, error: null })
    renderPage()

    await user.click(screen.getByRole('button', { name: /delete/i }))

    await waitFor(() => {
      expect(screen.getByText(/are you sure you want to delete/i)).toBeInTheDocument()
    })
  })

  it('calls deleteWorkout and navigates to /workouts on confirm', async () => {
    const user = userEvent.setup()
    const mutateAsync = vi.fn().mockResolvedValue(undefined)
    mockUseDelete.mockReturnValue(makeDeleteMutation({ mutateAsync }))
    mockWorkoutReturn({ data: sampleWorkout, isLoading: false, isError: false, error: null })
    renderPage()

    await user.click(screen.getByRole('button', { name: /delete/i }))
    await waitFor(() => screen.getByText(/are you sure you want to delete/i))

    const confirmBtn = screen.getByRole('button', { name: /^delete$/i })
    await user.click(confirmBtn)

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith('w1')
    })

    await waitFor(() => {
      expect(screen.getByText('Workouts list')).toBeInTheDocument()
    })
  })
})
