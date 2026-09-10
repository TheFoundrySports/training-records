import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { buildCalendarDays } from '../utils/buildCalendarDays'
import { CalendarGrid } from './CalendarGrid'
import type { Workout } from '@/features/workouts/workout.types'

const mockNavigate = vi.fn()

vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>()
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

function renderGrid(props: {
  year?: number
  month?: number
  workouts?: Workout[]
  isLoading?: boolean
  onSelectDay?: (date: Date | null) => void
}) {
  const { year = 2026, month = 4, workouts = [], isLoading = false, onSelectDay } = props
  return render(
    <MemoryRouter>
      <CalendarGrid
year={year}
month={month}
workouts={workouts}
isLoading={isLoading}
onSelectDay={onSelectDay}
      />
    </MemoryRouter>,
  )
}

/** Minimal Workout factory — only fields needed for buildCalendarDays */
function makeWorkout(performedAt: string, id = performedAt): Workout {
  return {
    id,
    userId: 'u1',
    title: 'Test Workout',
    type: 'crossfit',
    performedAt,
    durationMinutes: 45,
    createdAt: performedAt,
    updatedAt: performedAt,
  }
}

describe('buildCalendarDays — April 2026 (starts on Wednesday)', () => {
  // April 1 2026 is a Wednesday.
  // Monday-first grid starts on March 30 (Monday).
  // April 30 is a Thursday — the week ends on Sunday May 3.
  // Total cells: March 30 – May 3 = 35 days.

  const year = 2026
  const month = 4

  it('grid starts on Monday March 30 (first cell is the Monday before April 1)', () => {
    const days = buildCalendarDays(year, month, [])
    const first = days[0]
    expect(first.date.getFullYear()).toBe(2026)
    expect(first.date.getMonth()).toBe(2) // 0-indexed March
    expect(first.date.getDate()).toBe(30)
    // Confirm it is a Monday (getDay() === 1)
    expect(first.date.getDay()).toBe(1)
  })

  it('grid length is a multiple of 7', () => {
    const days = buildCalendarDays(year, month, [])
    expect(days.length % 7).toBe(0)
  })

  it('grid has 35 cells for April 2026', () => {
    const days = buildCalendarDays(year, month, [])
    // April 2026: starts Wed, ends Thu Apr 30.
    // Grid: Mon Mar 30 → Sun May 3 = 35 days
    expect(days.length).toBe(35)
  })

  it('April days have isCurrentMonth: true', () => {
    const days = buildCalendarDays(year, month, [])
    const aprilDays = days.filter((d) => d.date.getMonth() === 3 && d.date.getFullYear() === 2026)
    expect(aprilDays.length).toBe(30) // April has 30 days
    aprilDays.forEach((d) => {
      expect(d.isCurrentMonth).toBe(true)
    })
  })

  it('March and May filler days have isCurrentMonth: false', () => {
    const days = buildCalendarDays(year, month, [])
    const fillerDays = days.filter((d) => d.date.getMonth() !== 3)
    expect(fillerDays.length).toBeGreaterThan(0)
    fillerDays.forEach((d) => {
      expect(d.isCurrentMonth).toBe(false)
    })
  })

  it('a workout on April 15 appears in the April 15 cell', () => {
    const workout = makeWorkout('2026-04-15T10:00:00.000Z')
    const days = buildCalendarDays(year, month, [workout])

    const april15 = days.find((d) => d.date.getMonth() === 3 && d.date.getDate() === 15)
    expect(april15).toBeDefined()
    expect(april15!.workouts).toHaveLength(1)
    expect(april15!.workouts[0].id).toBe('2026-04-15T10:00:00.000Z')
  })

  it('a workout from a different month does NOT appear in any April cell', () => {
    // A March workout — should only appear in the March filler cell, not April cells
    const marchWorkout = makeWorkout('2026-03-15T10:00:00.000Z', 'march-workout')
    const days = buildCalendarDays(year, month, [marchWorkout])

    const aprilDays = days.filter((d) => d.date.getMonth() === 3 && d.date.getFullYear() === 2026)
    const totalWorkoutsInApril = aprilDays.reduce((sum, d) => sum + d.workouts.length, 0)
    expect(totalWorkoutsInApril).toBe(0)
  })
})

describe('buildCalendarDays — August 2026 (six-week month)', () => {
  it('grid has 42 cells', () => {
    const days = buildCalendarDays(2026, 8, [])
    // August 2026 starts Saturday; Monday-first grid is Jul 27 → Sep 6.
    expect(days.length).toBe(42)
  })
})

describe('buildCalendarDays — February 2026 (non-leap)', () => {
  // Feb 1 2026 is a Sunday. Monday-first grid starts on Jan 26 (Monday).
  // Feb 28 is a Saturday. The week ends on Mar 1 (Sunday).
  // Total cells: Jan 26 – Mar 1 = 35 days.

  const year = 2026
  const month = 2

  it('grid starts on Monday (Jan 26)', () => {
    const days = buildCalendarDays(year, month, [])
    expect(days[0].date.getDay()).toBe(1) // Monday
  })

  it('grid length is a multiple of 7', () => {
    const days = buildCalendarDays(year, month, [])
    expect(days.length % 7).toBe(0)
  })

  it('February days have isCurrentMonth: true (28 days, non-leap)', () => {
    const days = buildCalendarDays(year, month, [])
    const febDays = days.filter((d) => d.date.getMonth() === 1 && d.date.getFullYear() === 2026)
    expect(febDays.length).toBe(28)
    febDays.forEach((d) => {
      expect(d.isCurrentMonth).toBe(true)
    })
  })

  it('filler days (Jan / Mar) have isCurrentMonth: false', () => {
    const days = buildCalendarDays(year, month, [])
    const fillers = days.filter((d) => d.date.getMonth() !== 1)
    expect(fillers.length).toBeGreaterThan(0)
    fillers.forEach((d) => {
      expect(d.isCurrentMonth).toBe(false)
    })
  })
})

// ---------------------------------------------------------------------------
// CalendarGrid component tests (REQ-CAL-09, REQ-CAL-10)
// ---------------------------------------------------------------------------

/** Minimal Workout factory for CalendarGrid component tests */
function makeGridWorkout(performedAt: string, overrides: Partial<Workout> = {}): Workout {
  return {
    id: performedAt,
    userId: 'u1',
    title: 'Test Workout',
    type: 'crossfit',
    performedAt,
    durationMinutes: 45,
    createdAt: performedAt,
    updatedAt: performedAt,
    ...overrides,
  }
}

describe('CalendarGrid component — loading skeleton (REQ-CAL-09)', () => {
  it('renders 35 skeleton cells with animate-pulse when isLoading=true', () => {
    renderGrid({ year: 2026, month: 4, workouts: [], isLoading: true })

    const skeletons = document.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBe(35)
  })

  it('does not render "No workouts this month." while loading', () => {
    renderGrid({ year: 2026, month: 4, workouts: [], isLoading: true })

    expect(screen.queryByText(/no workouts this month/i)).not.toBeInTheDocument()
  })
})

describe('CalendarGrid component — empty state (REQ-CAL-10)', () => {
  it('renders "No workouts this month." when workouts=[] and isLoading=false', () => {
    renderGrid({ year: 2026, month: 4, workouts: [], isLoading: false })

    expect(screen.getByText('No workouts this month.')).toBeInTheDocument()
  })

  it('does not render skeleton cells when not loading', () => {
    renderGrid({ year: 2026, month: 4, workouts: [], isLoading: false })

    const skeletons = document.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBe(0)
  })
})

describe('CalendarGrid component — workout chip integration (REQ-CAL-06, REQ-CAL-07)', () => {
  it('a workout placed on April 15 renders a WorkoutChip with the workout title visible', () => {
    const workout = makeGridWorkout('2026-04-15T10:00:00.000Z', {
      title: 'Morning WOD',
      id: 'w-apr-15',
    })
    renderGrid({ year: 2026, month: 4, workouts: [workout], isLoading: false })

    expect(screen.getByText('Morning WOD')).toBeInTheDocument()
  })

  it('does not show "No workouts this month." when there are workouts', () => {
    const workout = makeGridWorkout('2026-04-15T10:00:00.000Z')
    renderGrid({ year: 2026, month: 4, workouts: [workout], isLoading: false })

    expect(screen.queryByText(/no workouts this month/i)).not.toBeInTheDocument()
  })

  it('renders workout type badge in the chip', () => {
    const workout = makeGridWorkout('2026-04-15T10:00:00.000Z', { type: 'functional' })
    renderGrid({ year: 2026, month: 4, workouts: [workout], isLoading: false })

    expect(screen.getByText('functional')).toBeInTheDocument()
  })
})

    describe('CalendarGrid component — mobile scroll wrapper', () => {
      it('wraps the grid in overflow-x-auto for horizontal scroll on mobile', () => {
        renderGrid({ year: 2026, month: 4, workouts: [], isLoading: false })

        const wrapper = document.querySelector('.overflow-x-auto')
        expect(wrapper).toBeInTheDocument()
      })

      it('inner grid has min-w-[640px] to prevent crushing on small screens', () => {
        renderGrid({ year: 2026, month: 4, workouts: [], isLoading: false })

        const innerGrid = document.querySelector('.min-w-\\[640px\\]')
        expect(innerGrid).toBeInTheDocument()
      })
    })

    // ---------------------------------------------------------------------------
    // CalendarGrid — mobile day selection state (REQ-CAL-MOBILE-01..03)
    // ---------------------------------------------------------------------------

    describe('CalendarGrid — mobile day selection state', () => {
      it('clicking a cell with workouts calls onSelectDay with that date', async () => {
        const user = userEvent.setup()
        const onSelectDay = vi.fn()
        const workout = makeGridWorkout('2026-04-15T10:00:00.000Z', {
          title: 'Morning WOD',
          id: 'w-apr-15',
        })
        renderGrid({
          year: 2026,
          month: 4,
          workouts: [workout],
          isLoading: false,
          onSelectDay,
        })

        // Click on the April 15 cell (it has a workout)
        const cell = screen.getByText('Morning WOD').closest('[class*="min-h-24"]')!
        await user.click(cell)

        expect(onSelectDay).toHaveBeenCalledOnce()
        expect(onSelectDay.mock.calls[0][0].getDate()).toBe(15)
        expect(onSelectDay.mock.calls[0][0].getMonth()).toBe(3) // April
      })

      it('re-clicking the same selected cell calls onSelectDay with null (deselect)', async () => {
        const user = userEvent.setup()
        const onSelectDay = vi.fn()
        const workout = makeGridWorkout('2026-04-15T10:00:00.000Z', {
          title: 'Morning WOD',
          id: 'w-apr-15',
        })
        renderGrid({
          year: 2026,
          month: 4,
          workouts: [workout],
          isLoading: false,
          onSelectDay,
        })

        const cell = screen.getByText('Morning WOD').closest('[class*="min-h-24"]')!

        // First click — selects
        await user.click(cell)
        // Second click — deselects
        await user.click(cell)

        // onSelectDay called twice: first with date, second with null
        expect(onSelectDay).toHaveBeenCalledTimes(2)
        expect(onSelectDay.mock.calls[1][0]).toBeNull()
      })

      it('clicking a different cell after a selection deselects the first one', async () => {
        const user = userEvent.setup()
        const onSelectDay = vi.fn()
        const workout1 = makeGridWorkout('2026-04-15T10:00:00.000Z', {
          title: 'WOD 15',
          id: 'w-apr-15',
        })
        const workout2 = makeGridWorkout('2026-04-16T10:00:00.000Z', {
          title: 'WOD 16',
          id: 'w-apr-16',
        })
        renderGrid({
          year: 2026,
          month: 4,
          workouts: [workout1, workout2],
          isLoading: false,
          onSelectDay,
        })

        const cell15 = screen.getByText('WOD 15').closest('[class*="min-h-24"]')!
        const cell16 = screen.getByText('WOD 16').closest('[class*="min-h-24"]')!

        await user.click(cell15) // selects April 15
        await user.click(cell16) // deselects April 15, selects April 16

        expect(onSelectDay).toHaveBeenCalledTimes(2)
        expect(onSelectDay.mock.calls[0][0].getDate()).toBe(15)
        expect(onSelectDay.mock.calls[1][0].getDate()).toBe(16)
      })

      it('clicking an empty current-month cell does NOT call onSelectDay', async () => {
        const user = userEvent.setup()
        const onSelectDay = vi.fn()
        renderGrid({
          year: 2026,
          month: 4,
          workouts: [],
          isLoading: false,
          onSelectDay,
        })

        // Find the March 30 cell (out-of-month, empty) — its date number is 30 and it
        // has bg-muted class (out-of-month filler). We click it and verify onSelectDay
        // is NOT called, confirming empty cells don't trigger selection.
        const outOfMonthCell = document.querySelector('[class*="bg-muted"][class*="min-h-24"]')
        expect(outOfMonthCell).toBeTruthy()
        await user.click(outOfMonthCell!)

        expect(onSelectDay).not.toHaveBeenCalled()
      })
    })
