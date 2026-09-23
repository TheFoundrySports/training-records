import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TechniquePracticeModal } from '../components/TechniquePracticeModal'
import type { WorkoutHistoryEntry } from '../types/technique-tracking.types'

// ── Test IDs for layout assertions ────────────────────────────────────────────
const LIST_TEST_ID = 'practice-history-list'

// ── Hoisted shared mock for useTechniqueWorkoutHistory ────────────────────────
//
// vi.hoisted() ensures this vi.fn() is initialized before all vi.mock factories.
// Tests override the return value with mockReturnValue / mockReturnValueOnce.
const mockUseTechniqueWorkoutHistory = vi.hoisted(() => vi.fn())

// ── Mock Supabase ─────────────────────────────────────────────────────────────

const MOCK_USER_ID = '550e8400-e29b-41d4-a716-446655440000'

function createMockThenable(data: unknown, error: unknown) {
  return {
    then: (resolve: (value: { data: unknown; error: unknown }) => unknown) => {
      resolve({ data, error })
      return createMockThenable(data, error) as unknown as Promise<unknown>
    },
    catch: () => createMockThenable(data, error) as unknown as Promise<unknown>,
  }
}

let mockWorkoutData: WorkoutHistoryEntry[] = []
let mockError: unknown = null

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(() => createMockThenable(mockWorkoutData, mockError)),
            })),
          })),
        })),
      })),
    })),
    auth: {
      getUser: vi.fn(() =>
        Promise.resolve({ data: { user: { id: MOCK_USER_ID } } })
      ),
    },
  },
}))

vi.mock('../hooks/useTechniqueWorkoutHistory', () => ({
  useTechniqueWorkoutHistory: mockUseTechniqueWorkoutHistory,
}))

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
}

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={makeQueryClient()}>{children}</QueryClientProvider>
  )
}

// ── Fixtures ───────────────────────────────────────────────────────────────────

const twoWorkouts: WorkoutHistoryEntry[] = [
  {
    workout_id: 'w1',
    performed_at: '2026-05-10T10:00:00.000Z',
    section_number: 2,
    goal: 'Warm-up + technique drills',
    ai_description:
      'Today we worked on guard passing [Knee Slide Pass] and spider guard sweeps.',
  },
  {
    workout_id: 'w2',
    performed_at: '2026-05-03T09:30:00.000Z',
    section_number: 1,
    goal: 'Open mat',
    ai_description: 'Continued working on guard retention [Closed Guard Retention].',
  },
]

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('TechniquePracticeModal', () => {
  beforeEach(() => {
    mockWorkoutData = []
    mockError = null
    // Reset to loading state so tests that don't set mockReturnValueOnce don't crash.
    // clearAllMocks clears call history only (not mockReturnValue queue).
    vi.clearAllMocks()
    mockUseTechniqueWorkoutHistory.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    })
  })

  it('renders dialog with technique name when open', async () => {
    mockWorkoutData = twoWorkouts
    mockError = null
    mockUseTechniqueWorkoutHistory.mockReturnValueOnce({
      data: twoWorkouts,
      isLoading: false,
      isError: false,
      error: null,
    })

    render(
      <TechniquePracticeModal
        techniqueId="t1"
        techniqueName="Knee Slide Pass"
        open={true}
        onClose={vi.fn()}
      />,
      { wrapper: Wrapper }
    )

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
    expect(screen.getByText('Knee Slide Pass')).toBeInTheDocument()
  })

  it('does not render when open=false', () => {
    render(
      <TechniquePracticeModal
        techniqueId="t1"
        techniqueName="Knee Slide Pass"
        open={false}
        onClose={vi.fn()}
      />,
      { wrapper: Wrapper }
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders workout cards that stretch to full modal width (issue #92)', async () => {
    mockUseTechniqueWorkoutHistory.mockReturnValueOnce({
      data: twoWorkouts,
      isLoading: false,
      isError: false,
      error: null,
    })

    render(
      <TechniquePracticeModal
        techniqueId="t1"
        techniqueName="Knee Slide Pass"
        open={true}
        onClose={vi.fn()}
      />,
      { wrapper: Wrapper }
    )

    // The scroll container has data-testid="practice-history-list"
    const list = screen.getByTestId(LIST_TEST_ID)
    expect(list).toHaveClass('w-full')

    // Each card renders with w-full (full modal content width)
    const cards = screen.getAllByTestId(/^workout-card-/)
    expect(cards.length).toBe(2)
    for (const card of cards) {
      expect(card).toHaveClass('w-full')
    }

    // The inner flex column of each card also stretches width
    const innerContainers = list.querySelectorAll('[class*="flex-col"]')
    expect(innerContainers.length).toBeGreaterThan(0)
    for (const container of innerContainers) {
      expect(container).toHaveClass('w-full')
    }
  })

  it('calls onClose when close button clicked', async () => {
    mockWorkoutData = twoWorkouts
    mockError = null
    mockUseTechniqueWorkoutHistory.mockReturnValueOnce({
      data: twoWorkouts,
      isLoading: false,
      isError: false,
      error: null,
    })

    const onClose = vi.fn()
    render(
      <TechniquePracticeModal
        techniqueId="t1"
        techniqueName="Knee Slide Pass"
        open={true}
        onClose={onClose}
      />,
      { wrapper: Wrapper }
    )

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('shows error alert when query fails', async () => {
    // Override beforeEach's default loading state with an error state.
    // beforeEach resets to loading for the next test.
    mockUseTechniqueWorkoutHistory.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: { error: { message: 'Failed to fetch' } },
    })

    render(
      <TechniquePracticeModal
        techniqueId="t1"
        techniqueName="Knee Slide Pass"
        open={true}
        onClose={vi.fn()}
      />,
      { wrapper: Wrapper }
    )

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
    expect(screen.getByText(/error loading practice history/i)).toBeInTheDocument()
  })
})
