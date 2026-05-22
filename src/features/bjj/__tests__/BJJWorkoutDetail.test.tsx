import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { BJJWorkoutDetail } from '../components/BJJWorkoutDetail'
import type { Workout } from '@/features/workouts/workout.types'
import { useBJJSections } from '../hooks/useBJJSections'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../hooks/useBJJSections', () => ({
  useBJJSections: vi.fn(),
}))

const mockUseBJJSections = vi.mocked(useBJJSections)

// ── Test helpers ───────────────────────────────────────────────────────────────

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
}

function renderBJJDetail({
  workout,
  canEdit = false,
  canDelete = false,
  onDelete = undefined,
}: {
  workout: Workout
  canEdit?: boolean
  canDelete?: boolean
  onDelete?: () => void
}) {
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <MemoryRouter>
        <BJJWorkoutDetail
          workoutId={workout.id}
          workout={workout}
          canEdit={canEdit}
          canDelete={canDelete}
          onDelete={onDelete}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const sampleBJJWorkout: Workout = {
  id: 'bjj-w1',
  userId: 'u1',
  title: 'Morning BJJ',
  type: 'bjj',
  performedAt: '2026-04-05T08:00:00.000Z',
  durationMinutes: 60,
  rpe: 7,
  notes: 'Great roll!',
  createdAt: '2026-04-05T08:00:00.000Z',
  updatedAt: '2026-04-05T08:00:00.000Z',
}

describe('BJJWorkoutDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseBJJSections.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useBJJSections>)
  })

  describe('Delete button', () => {
    it('does NOT render Delete button when canDelete is false', () => {
      renderBJJDetail({ workout: sampleBJJWorkout, canDelete: false })
      expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument()
    })

    it('does NOT render Delete button when canDelete is true but onDelete is not provided', () => {
      renderBJJDetail({ workout: sampleBJJWorkout, canDelete: true, onDelete: undefined })
      expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument()
    })

    it('renders Delete button when canDelete is true and onDelete callback is provided', () => {
      const onDelete = vi.fn()
      renderBJJDetail({ workout: sampleBJJWorkout, canDelete: true, onDelete })
      expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument()
    })

    it('calls onDelete callback when Delete button is clicked', async () => {
      const user = userEvent.setup()
      const onDelete = vi.fn()
      renderBJJDetail({ workout: sampleBJJWorkout, canDelete: true, onDelete })

      await user.click(screen.getByRole('button', { name: /delete/i }))

      expect(onDelete).toHaveBeenCalledTimes(1)
    })

    it('Delete button is adjacent to Edit button in the action row', () => {
      const onDelete = vi.fn()
      renderBJJDetail({ workout: sampleBJJWorkout, canEdit: true, canDelete: true, onDelete })
      const buttons = screen.getAllByRole('button')
      const editIdx = buttons.findIndex((b) => b.textContent === 'Edit')
      const deleteIdx = buttons.findIndex((b) => b.textContent === 'Delete')
      expect(editIdx).toBeLessThan(deleteIdx)
    })
  })

  describe('Edit button', () => {
    it('renders Edit button when canEdit is true', () => {
      renderBJJDetail({ workout: sampleBJJWorkout, canEdit: true })
      expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument()
    })

    it('does NOT render Edit button when canEdit is false', () => {
      renderBJJDetail({ workout: sampleBJJWorkout, canEdit: false })
      expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument()
    })
  })
})