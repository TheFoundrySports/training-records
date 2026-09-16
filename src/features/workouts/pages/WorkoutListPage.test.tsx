import { describe, it, expect, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WorkoutListPage } from './WorkoutListPage'
import type { Workout } from '../workout.types'
import type { useWorkouts } from '../hooks/useWorkouts'
import { renderWithMuiTheme } from '../theme/renderWithMuiTheme'

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
  // Use a tiny shim so we can compose the MUI theme wrapper with the
  // existing QueryClient + MemoryRouter wrappers without restructuring every test.
  return renderWithMuiTheme(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <WorkoutListPage />
      </MemoryRouter>
    </QueryClientProvider>,
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
      error: {
        error: { code: 'NETWORK_ERROR', message: 'Network request failed' },
      } as unknown as Error,
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
    // Scope to the workout list so the toggle button text (also "CrossFit")
    // doesn't collide with the chip's lowercase label.
    const list = screen.getByRole('list', { name: /workout list/i })
    expect(within(list).getByText(/^crossfit$/i)).toBeInTheDocument()
    expect(within(list).getByText(/^functional$/i)).toBeInTheDocument()
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
    // Two "Log workout" buttons exist: header action + empty-state CTA
    expect(screen.getAllByRole('button', { name: /log workout/i }).length).toBeGreaterThan(0)
  })

  it('renders four filter toggle buttons', () => {
    mockReturn({ data: sampleWorkouts, isLoading: false, isError: false, error: null })
    renderPage()
    const toggleGroup = screen.getByRole('group', { name: /filter workouts by type/i })
    expect(toggleGroup).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^all$/i, pressed: true })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^crossfit$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^functional$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^bjj$/i })).toBeInTheDocument()
  })

  it('filters by CrossFit when that toggle is clicked', async () => {
    const user = (await import('@testing-library/user-event')).default
    mockReturn({ data: [], isLoading: false, isError: false, error: null })
    renderPage()
    await user.click(screen.getByRole('button', { name: /^crossfit$/i }))
    expect(mockUseWorkouts).toHaveBeenLastCalledWith({ type: 'crossfit' })
  })

  it('renders the category icon per workout (Whatshot / SelfImprovement / SportsMartialArts)', () => {
    const allTypes: Workout[] = [
      {
        id: 'wc',
        userId: 'u1',
        title: 'CrossFit WOD',
        type: 'crossfit',
        performedAt: '2026-04-05T08:00:00.000Z',
        durationMinutes: 45,
        createdAt: '2026-04-05T08:00:00.000Z',
        updatedAt: '2026-04-05T08:00:00.000Z',
      },
      {
        id: 'wf',
        userId: 'u1',
        title: 'Functional Flow',
        type: 'functional',
        performedAt: '2026-04-04T10:00:00.000Z',
        durationMinutes: 60,
        createdAt: '2026-04-04T10:00:00.000Z',
        updatedAt: '2026-04-04T10:00:00.000Z',
      },
      {
        id: 'wb',
        userId: 'u1',
        title: 'BJJ Rolls',
        type: 'bjj',
        performedAt: '2026-04-03T10:00:00.000Z',
        durationMinutes: 45,
        createdAt: '2026-04-03T10:00:00.000Z',
        updatedAt: '2026-04-03T10:00:00.000Z',
      },
    ]
    mockReturn({ data: allTypes, isLoading: false, isError: false, error: null })
    renderPage()
    expect(screen.getByTestId('category-icon-crossfit')).toBeInTheDocument()
    expect(screen.getByTestId('category-icon-functional')).toBeInTheDocument()
    expect(screen.getByTestId('category-icon-bjj')).toBeInTheDocument()
  })

  it('chips have a category-scoped test id (for downstream visual testing)', () => {
    mockReturn({ data: sampleWorkouts, isLoading: false, isError: false, error: null })
    renderPage()
    const list = screen.getByRole('list', { name: /workout list/i })
    expect(within(list).getByTestId('category-chip-crossfit')).toBeInTheDocument()
    expect(within(list).getByTestId('category-chip-functional')).toBeInTheDocument()
  })
})
