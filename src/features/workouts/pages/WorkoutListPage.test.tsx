import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WorkoutListPage } from './WorkoutListPage'
import type { Workout } from '../workout.types'
import type { useWorkouts } from '../hooks/useWorkouts'

// Mock the hook module
vi.mock('../hooks/useWorkouts', () => ({
  useWorkouts: vi.fn(),
  useWorkout: vi.fn(),
}))

import { useWorkouts as useWorkoutsMock } from '../hooks/useWorkouts'

const mockUseWorkouts = vi.mocked(useWorkoutsMock)

type UseWorkoutsResult = ReturnType<typeof useWorkouts>

function mockReturn(val: Partial<UseWorkoutsResult>) {
  mockUseWorkouts.mockReturnValue(val as unknown as UseWorkoutsResult)
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <WorkoutListPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

const sampleWorkouts: Workout[] = [
  {
    id: 'w1',
    userId: 'u1',
    title: 'Morning WOD',
    type: 'crossfit',
    performedAt: '2026-04-05T08:00:00.000Z',
    durationMinutes: 45,
    createdAt: '2026-04-05T08:00:00.000Z',
    updatedAt: '2026-04-05T08:00:00.000Z',
  },
  {
    id: 'w2',
    userId: 'u1',
    title: 'Functional Flow',
    type: 'functional',
    performedAt: '2026-04-04T10:00:00.000Z',
    durationMinutes: 60,
    rpe: 7,
    notes: 'Good session',
    createdAt: '2026-04-04T10:00:00.000Z',
    updatedAt: '2026-04-04T10:00:00.000Z',
  },
]

describe('WorkoutListPage', () => {
  it('shows loading skeleton while fetching', () => {
    mockReturn({ data: undefined, isLoading: true, isError: false, error: null })
    renderPage()
    expect(screen.getByRole('status', { name: /loading workouts/i })).toBeInTheDocument()
  })

  it('shows empty state when there are no workouts', () => {
    mockReturn({ data: [], isLoading: false, isError: false, error: null })
    renderPage()
    expect(screen.getByText(/no workouts yet/i)).toBeInTheDocument()
  })

  it('shows error state when query fails', () => {
    mockReturn({
      data: undefined,
      isLoading: false,
      isError: true,
      error: { error: { code: 'NETWORK_ERROR', message: 'Network request failed' } } as unknown as Error,
    })
    renderPage()
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText(/failed to load workouts/i)).toBeInTheDocument()
  })

  it('renders workout cards with title, type, date, and duration', () => {
    mockReturn({ data: sampleWorkouts, isLoading: false, isError: false, error: null })
    renderPage()

    expect(screen.getByText('Morning WOD')).toBeInTheDocument()
    expect(screen.getByText('Functional Flow')).toBeInTheDocument()
    expect(screen.getByText(/45 min/i)).toBeInTheDocument()
    expect(screen.getByText(/60 min/i)).toBeInTheDocument()
    expect(screen.getByText('crossfit')).toBeInTheDocument()
    expect(screen.getByText('functional')).toBeInTheDocument()
  })

  it('each workout card links to the detail page', () => {
    mockReturn({ data: sampleWorkouts, isLoading: false, isError: false, error: null })
    renderPage()

    const links = screen.getAllByRole('link')
    const hrefs = links.map((l) => l.getAttribute('href'))
    expect(hrefs).toContain('/workouts/w1')
    expect(hrefs).toContain('/workouts/w2')
  })

  it('renders the Log workout button', () => {
    mockReturn({ data: [], isLoading: false, isError: false, error: null })
    renderPage()
    expect(screen.getAllByRole('button', { name: /log workout/i }).length).toBeGreaterThan(0)
  })
})
