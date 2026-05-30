import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router'
import { ExerciseListPage } from '../pages/ExerciseListPage'
import type { Exercise } from '../exercise.types'

// ── Mock hooks ─────────────────────────────────────────────────────────────

vi.mock('../hooks/useExercises', () => ({
  useExercises: vi.fn(),
}))

import { useExercises } from '../hooks/useExercises'

// ── Fixtures ─────────────────────────────────────────────────────────────

const MOCK_EXERCISES: Exercise[] = [
  {
    id: 'e1',
    name: 'Back Squat',
    description: null,
    categoryId: null,
    movementType: 'strength',
    measurementType: 'weight',
    difficultyLevel: 'intermediate',
    equipment: ['barbell', 'rack'],
    isBenchmark: true,
    videoUrl: null,
    scalingOptions: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'e2',
    name: 'Pull-Up',
    description: null,
    categoryId: null,
    movementType: 'gymnastics',
    measurementType: 'reps',
    difficultyLevel: 'advanced',
    equipment: ['pull-up bar'],
    isBenchmark: false,
    videoUrl: null,
    scalingOptions: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
]

// ── Helpers ─────────────────────────────────────────────────────────────

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('ExerciseListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders exercise table with name and difficulty columns', async () => {
    vi.mocked(useExercises).mockReturnValue({
      data: { data: MOCK_EXERCISES, total: 2, page: 1, pageSize: 10 },
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useExercises>)

    const queryClient = makeQueryClient()
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/exercises']}>
          <Routes>
            <Route path="/exercises" element={<ExerciseListPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(screen.getByText('Back Squat')).toBeInTheDocument()
    expect(screen.getByText('Pull-Up')).toBeInTheDocument()
  })

  it('shows loading skeleton while fetching', async () => {
    vi.mocked(useExercises).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useExercises>)

    const queryClient = makeQueryClient()
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/exercises']}>
          <Routes>
            <Route path="/exercises" element={<ExerciseListPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('shows empty state when there are no exercises', async () => {
    vi.mocked(useExercises).mockReturnValue({
      data: { data: [], total: 0, page: 1, pageSize: 10 },
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useExercises>)

    const queryClient = makeQueryClient()
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/exercises']}>
          <Routes>
            <Route path="/exercises" element={<ExerciseListPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(screen.getByText(/no exercises yet/i)).toBeInTheDocument()
  })

  it('wraps table in overflow-x-auto for horizontal scroll on mobile', async () => {
    vi.mocked(useExercises).mockReturnValue({
      data: { data: MOCK_EXERCISES, total: 2, page: 1, pageSize: 10 },
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useExercises>)

    const queryClient = makeQueryClient()
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/exercises']}>
          <Routes>
            <Route path="/exercises" element={<ExerciseListPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    const wrapper = document.querySelector('.overflow-x-auto')
    expect(wrapper).toBeInTheDocument()
  })
})
