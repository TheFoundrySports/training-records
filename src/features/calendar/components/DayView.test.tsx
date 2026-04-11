import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { DayView } from './DayView'
import type { Workout } from '@/features/workouts/workout.types'

const mockNavigate = vi.fn()

vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>()
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

function makeWorkout(performedAt: string, overrides: Partial<Workout> = {}): Workout {
  return {
    id: performedAt,
    userId: 'u1',
    title: 'Morning WOD',
    type: 'crossfit',
    performedAt,
    durationMinutes: 45,
    createdAt: performedAt,
    updatedAt: performedAt,
    ...overrides,
  }
}

function renderDayView(props: { anchorDate?: Date; workouts?: Workout[]; isLoading?: boolean }) {
  const {
    anchorDate = new Date(2026, 3, 10), // April 10, 2026 (past date)
    workouts = [],
    isLoading = false,
  } = props

  return render(
    <MemoryRouter>
      <DayView anchorDate={anchorDate} workouts={workouts} isLoading={isLoading} />
    </MemoryRouter>,
  )
}

describe('DayView — workout list', () => {
  beforeEach(() => {
    mockNavigate.mockClear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 3, 12)) // today = April 12
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders workouts for the anchor date', () => {
    const workout = makeWorkout('2026-04-10T10:00:00.000Z', { title: 'Cardio Blast' })
    renderDayView({
      anchorDate: new Date(2026, 3, 10),
      workouts: [workout],
    })
    expect(screen.getByText('Cardio Blast')).toBeInTheDocument()
  })

  it('does not render workouts from a different day', () => {
    const workout = makeWorkout('2026-04-11T10:00:00.000Z', { title: 'Wrong Day Workout' })
    renderDayView({
      anchorDate: new Date(2026, 3, 10), // Apr 10
      workouts: [workout],
    })
    expect(screen.queryByText('Wrong Day Workout')).not.toBeInTheDocument()
  })
})

describe('DayView — empty state', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 3, 12))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows "No workouts on this day." when no workouts match', () => {
    renderDayView({ anchorDate: new Date(2026, 3, 10), workouts: [] })
    expect(screen.getByText('No workouts on this day.')).toBeInTheDocument()
  })

  it('does not show empty state when workouts are present', () => {
    const workout = makeWorkout('2026-04-10T10:00:00.000Z')
    renderDayView({ anchorDate: new Date(2026, 3, 10), workouts: [workout] })
    expect(screen.queryByText('No workouts on this day.')).not.toBeInTheDocument()
  })
})

describe('DayView — Add workout button', () => {
  beforeEach(() => {
    mockNavigate.mockClear()
  })

  it('renders "Add workout" button', () => {
    renderDayView({ anchorDate: new Date(2026, 3, 10) })
    expect(screen.getByRole('button', { name: 'Add workout' })).toBeInTheDocument()
  })

  it('clicking "Add workout" navigates to /workouts/new?date=YYYY-MM-DD', async () => {
    const user = userEvent.setup()
    renderDayView({ anchorDate: new Date(2026, 3, 10) }) // April 10, 2026
    await user.click(screen.getByRole('button', { name: 'Add workout' }))
    expect(mockNavigate).toHaveBeenCalledWith('/workouts/new?date=2026-04-10')
  })
})

describe('DayView — planning mode badge', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows "Planning mode" badge for future dates', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 3, 12)) // today = Apr 12
    renderDayView({ anchorDate: new Date(2026, 11, 31) }) // Dec 31, future
    expect(screen.getByText('Planning mode')).toBeInTheDocument()
  })

  it('does not show "Planning mode" badge for past dates', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 3, 12)) // today = Apr 12
    renderDayView({ anchorDate: new Date(2026, 3, 10) }) // Apr 10, past
    expect(screen.queryByText('Planning mode')).not.toBeInTheDocument()
  })

  it('does not show "Planning mode" badge for today', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 3, 12)) // today = Apr 12
    renderDayView({ anchorDate: new Date(2026, 3, 12) }) // today
    expect(screen.queryByText('Planning mode')).not.toBeInTheDocument()
  })
})
