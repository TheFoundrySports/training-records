import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { WorkoutChip } from './WorkoutChip'
import { palettes } from '@/features/workouts/theme/material-tokens'
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
    it('crossfit title uses the orange category color', () => {
      renderChip(makeWorkout({ type: 'crossfit', title: 'Fran' }))
      expect(screen.getByText('Fran')).toHaveStyle({ color: palettes.light.crossfit.main })
    })

    it('functional title uses the cyan category color', () => {
      renderChip(makeWorkout({ type: 'functional', title: 'Mobility Flow' }))
      expect(screen.getByText('Mobility Flow')).toHaveStyle({ color: palettes.light.functional.main })
    })

    it('bjj title uses the violet category color', () => {
      renderChip(makeWorkout({ type: 'bjj', title: 'Guard Drills' }))
      expect(screen.getByText('Guard Drills')).toHaveStyle({ color: palettes.light.bjj.main })
    })

    it('crossfit title uses the brighter orange category color in dark mode', () => {
      document.documentElement.classList.add('dark')
      renderChip(makeWorkout({ type: 'crossfit', title: 'Fran' }))
      expect(screen.getByText('Fran')).toHaveStyle({ color: palettes.dark.crossfit.main })
    })

    it('bjj title uses the brighter violet category color in dark mode', () => {
      document.documentElement.classList.add('dark')
      renderChip(makeWorkout({ type: 'bjj', title: 'Guard Drills' }))
      expect(screen.getByText('Guard Drills')).toHaveStyle({ color: palettes.dark.bjj.main })
    })

    it('functional title uses the brighter cyan category color in dark mode', () => {
      document.documentElement.classList.add('dark')
      renderChip(makeWorkout({ type: 'functional', title: 'Mobility Flow' }))
      expect(screen.getByText('Mobility Flow')).toHaveStyle({ color: palettes.dark.functional.main })
    })
  })

  describe('category coloring — type badge (issue #100)', () => {
    it('crossfit badge has orange border, orange text, soft orange fill', () => {
      renderChip(makeWorkout({ type: 'crossfit' }))
      const badge = screen.getByTestId('workout-chip-type-crossfit')
      expect(badge).toHaveStyle({
        color: palettes.light.crossfit.main,
        borderColor: palettes.light.crossfit.main,
        backgroundColor: palettes.light.crossfit.light,
      })
    })

    it('bjj badge has violet border, violet text, soft violet fill', () => {
      renderChip(makeWorkout({ type: 'bjj' }))
      const badge = screen.getByTestId('workout-chip-type-bjj')
      expect(badge).toHaveStyle({
        color: palettes.light.bjj.main,
        borderColor: palettes.light.bjj.main,
        backgroundColor: palettes.light.bjj.light,
      })
    })

    it('functional badge has cyan border, cyan text, soft cyan fill', () => {
      renderChip(makeWorkout({ type: 'functional' }))
      const badge = screen.getByTestId('workout-chip-type-functional')
      expect(badge).toHaveStyle({
        color: palettes.light.functional.main,
        borderColor: palettes.light.functional.main,
        backgroundColor: palettes.light.functional.light,
      })
    })

    it('crossfit badge in dark mode uses brighter orange + darker orange fill', () => {
      document.documentElement.classList.add('dark')
      renderChip(makeWorkout({ type: 'crossfit' }))
      const badge = screen.getByTestId('workout-chip-type-crossfit')
      expect(badge).toHaveStyle({
        color: palettes.dark.crossfit.main,
        borderColor: palettes.dark.crossfit.main,
        backgroundColor: palettes.dark.crossfit.light,
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
      expect(btn).toHaveStyle({ borderColor: palettes.light.bjj.main })
    })

    it('planned chip title still shows category color', () => {
      renderChip(makeWorkout({ type: 'bjj', title: 'Drill', performedAt: '2026-12-01T10:00:00.000Z' }))
      expect(screen.getByText('Drill')).toHaveStyle({ color: palettes.light.bjj.main })
    })

    it('planned chip type badge still shows category color', () => {
      renderChip(makeWorkout({ type: 'crossfit', performedAt: '2026-12-01T10:00:00.000Z' }))
      const badge = screen.getByTestId('workout-chip-type-crossfit')
      expect(badge).toHaveStyle({ color: palettes.light.crossfit.main, borderColor: palettes.light.crossfit.main })
    })

    it('planned crossfit chip dashed border is orange in dark mode', () => {
      document.documentElement.classList.add('dark')
      renderChip(makeWorkout({ type: 'crossfit', performedAt: '2026-12-01T10:00:00.000Z' }))
      const btn = screen.getByRole('button')
      expect(btn).toHaveStyle({ borderColor: palettes.dark.crossfit.main })
    })
  })
})
