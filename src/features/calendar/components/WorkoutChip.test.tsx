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
    // Default to light mode so tests are deterministic regardless of the
    // global `<html>` class state set up by other suites. Each dark-mode
    // describe block re-toggles the class and restores it in `afterEach`.
    document.documentElement.classList.remove('dark')
  })

  afterEach(() => {
    document.documentElement.classList.remove('dark')
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

  describe('category coloring — title text (issue #100)', () => {
    it('crossfit title uses orange #ea580c', () => {
      renderChip(makeWorkout({ type: 'crossfit', title: 'Fran' }))
      expect(screen.getByText('Fran')).toHaveStyle({ color: '#ea580c' })
    })

    it('functional title uses cyan #0891b2', () => {
      renderChip(makeWorkout({ type: 'functional', title: 'Mobility Flow' }))
      expect(screen.getByText('Mobility Flow')).toHaveStyle({ color: '#0891b2' })
    })

    it('bjj title uses violet #7c3aed', () => {
      renderChip(makeWorkout({ type: 'bjj', title: 'Guard Drills' }))
      expect(screen.getByText('Guard Drills')).toHaveStyle({ color: '#7c3aed' })
    })

    it('crossfit title uses brighter orange #fb923c in dark mode', () => {
      document.documentElement.classList.add('dark')
      renderChip(makeWorkout({ type: 'crossfit', title: 'Fran' }))
      expect(screen.getByText('Fran')).toHaveStyle({ color: '#fb923c' })
    })

    it('bjj title uses brighter violet #a78bfa in dark mode', () => {
      document.documentElement.classList.add('dark')
      renderChip(makeWorkout({ type: 'bjj', title: 'Guard Drills' }))
      expect(screen.getByText('Guard Drills')).toHaveStyle({ color: '#a78bfa' })
    })

    it('functional title uses brighter cyan #22d3ee in dark mode', () => {
      document.documentElement.classList.add('dark')
      renderChip(makeWorkout({ type: 'functional', title: 'Mobility Flow' }))
      expect(screen.getByText('Mobility Flow')).toHaveStyle({ color: '#22d3ee' })
    })
  })

  describe('category coloring — type badge (issue #100)', () => {
    it('crossfit badge has orange border, orange text, soft orange fill', () => {
      renderChip(makeWorkout({ type: 'crossfit' }))
      const badge = screen.getByTestId('workout-chip-type-crossfit')
      expect(badge).toHaveStyle({
        color: '#ea580c',
        borderColor: '#ea580c',
        backgroundColor: '#fed7aa',
      })
    })

    it('bjj badge has violet border, violet text, soft violet fill', () => {
      renderChip(makeWorkout({ type: 'bjj' }))
      const badge = screen.getByTestId('workout-chip-type-bjj')
      expect(badge).toHaveStyle({
        color: '#7c3aed',
        borderColor: '#7c3aed',
        backgroundColor: '#ddd6fe',
      })
    })

    it('functional badge has cyan border, cyan text, soft cyan fill', () => {
      renderChip(makeWorkout({ type: 'functional' }))
      const badge = screen.getByTestId('workout-chip-type-functional')
      expect(badge).toHaveStyle({
        color: '#0891b2',
        borderColor: '#0891b2',
        backgroundColor: '#cffafe',
      })
    })

    it('crossfit badge in dark mode uses brighter orange + darker orange fill', () => {
      document.documentElement.classList.add('dark')
      renderChip(makeWorkout({ type: 'crossfit' }))
      const badge = screen.getByTestId('workout-chip-type-crossfit')
      expect(badge).toHaveStyle({
        color: '#fb923c',
        borderColor: '#fb923c',
        backgroundColor: '#9a3412',
      })
    })
  })

  describe('planned state preserves category color (issue #100 acceptance)', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date(2026, 0, 1))
    })
    afterEach(() => {
      vi.useRealTimers()
    })

    it('planned chip keeps dashed + opacity styling', () => {
      renderChip(makeWorkout({ type: 'bjj', performedAt: '2026-12-01T10:00:00.000Z' }))
      const btn = screen.getByRole('button')
      expect(btn.className).toMatch(/opacity-70/)
      expect(btn.className).toMatch(/border-dashed/)
    })

    it('planned chip dashed border picks up category color (not neutral border)', () => {
      renderChip(makeWorkout({ type: 'bjj', performedAt: '2026-12-01T10:00:00.000Z' }))
      const btn = screen.getByRole('button')
      expect(btn).toHaveStyle({ borderColor: '#7c3aed' })
    })

    it('planned chip title still shows category color', () => {
      renderChip(makeWorkout({ type: 'bjj', title: 'Drill', performedAt: '2026-12-01T10:00:00.000Z' }))
      expect(screen.getByText('Drill')).toHaveStyle({ color: '#7c3aed' })
    })

    it('planned chip type badge still shows category color', () => {
      renderChip(makeWorkout({ type: 'crossfit', performedAt: '2026-12-01T10:00:00.000Z' }))
      const badge = screen.getByTestId('workout-chip-type-crossfit')
      expect(badge).toHaveStyle({ color: '#ea580c', borderColor: '#ea580c' })
    })

    it('planned crossfit chip dashed border is orange in dark mode', () => {
      document.documentElement.classList.add('dark')
      renderChip(makeWorkout({ type: 'crossfit', performedAt: '2026-12-01T10:00:00.000Z' }))
      const btn = screen.getByRole('button')
      expect(btn).toHaveStyle({ borderColor: '#fb923c' })
    })
  })
})
