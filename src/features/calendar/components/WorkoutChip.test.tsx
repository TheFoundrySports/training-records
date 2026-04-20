import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { WorkoutChip } from './WorkoutChip'
import type { Workout } from '@/features/workouts/workout.types'

const mockNavigate = vi.fn()

vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>()
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

function makeWorkout(overrides: Partial<Workout> = {}): Workout {
  return {
    id: 'w1',
    userId: 'u1',
    title: 'Morning WOD',
    type: 'crossfit',
    performedAt: '2025-06-15T10:00:00.000Z',
    durationMinutes: 45,
    createdAt: '2025-06-15T10:00:00.000Z',
    updatedAt: '2025-06-15T10:00:00.000Z',
    ...overrides,
  }
}

function renderChip(workout: Workout) {
  return render(
    <MemoryRouter>
      <WorkoutChip workout={workout} />
    </MemoryRouter>,
  )
}

describe('WorkoutChip', () => {
  beforeEach(() => {
    mockNavigate.mockClear()
  })

  it('renders short title as-is (≤ 20 chars)', () => {
    renderChip(makeWorkout({ title: 'Short Title' }))
    expect(screen.getByText('Short Title')).toBeInTheDocument()
  })

  it('renders truncated title with ellipsis when title > 20 chars', () => {
    renderChip(makeWorkout({ title: 'A Very Long Workout Title Here' }))
    // truncate(text, 20) = text.slice(0, 20) + '…'
    // 'A Very Long Workout Title Here'.slice(0, 20) = 'A Very Long Workout '
    expect(screen.getByText('A Very Long Workout …')).toBeInTheDocument()
  })

  it('renders exactly 20 chars without truncation', () => {
    renderChip(makeWorkout({ title: '12345678901234567890' })) // exactly 20 chars
    expect(screen.getByText('12345678901234567890')).toBeInTheDocument()
  })

  it('renders the workout type badge', () => {
    renderChip(makeWorkout({ type: 'crossfit' }))
    expect(screen.getByText('crossfit')).toBeInTheDocument()
  })

  it('renders functional type badge', () => {
    renderChip(makeWorkout({ type: 'functional' }))
    expect(screen.getByText('functional')).toBeInTheDocument()
  })

  it('clicking the chip calls navigate to /workouts/:id', async () => {
    const user = userEvent.setup()
    renderChip(makeWorkout({ id: 'abc-123' }))

    const chip = screen.getByRole('button', { name: /view workout/i })
    await user.click(chip)

    expect(mockNavigate).toHaveBeenCalledWith('/workouts/abc-123')
  })

  it('clicking chip with different id navigates to correct path', async () => {
    const user = userEvent.setup()
    renderChip(makeWorkout({ id: 'xyz-999' }))

    const chip = screen.getByRole('button', { name: /view workout/i })
    await user.click(chip)

    expect(mockNavigate).toHaveBeenCalledWith('/workouts/xyz-999')
  })

  describe('planned state (future performedAt)', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date(2026, 0, 1)) // freeze: Jan 1, 2026
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('does NOT render Planned badge for past workout', () => {
      renderChip(makeWorkout({ performedAt: '2025-06-15T10:00:00.000Z' }))
      expect(screen.queryByText('Planned')).not.toBeInTheDocument()
    })

    it('renders Planned badge for future workout', () => {
      renderChip(makeWorkout({ performedAt: '2026-12-01T10:00:00.000Z' }))
      expect(screen.getByText('Planned')).toBeInTheDocument()
    })

    it('applies muted/dashed style classes for future workout', () => {
      renderChip(makeWorkout({ performedAt: '2026-12-01T10:00:00.000Z' }))
      const btn = screen.getByRole('button')
      expect(btn.className).toMatch(/opacity-70/)
      expect(btn.className).toMatch(/border-dashed/)
    })

    it('has correct aria-label for planned workout', () => {
      renderChip(makeWorkout({ performedAt: '2026-12-01T10:00:00.000Z', title: 'Future WOD' }))
      expect(
        screen.getByRole('button', { name: 'View planned workout: Future WOD' }),
      ).toBeInTheDocument()
    })
  })
})
