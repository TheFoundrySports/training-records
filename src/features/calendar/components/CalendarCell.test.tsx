import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { CalendarCell } from './CalendarCell'
import type { CalendarDay } from '../calendar.types'
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
    title: 'Test WOD',
    type: 'crossfit',
    performedAt: '2026-04-15T10:00:00.000Z',
    durationMinutes: 45,
    createdAt: '2026-04-15T10:00:00.000Z',
    updatedAt: '2026-04-15T10:00:00.000Z',
    ...overrides,
  }
}

function makeDay(overrides: Partial<CalendarDay> = {}): CalendarDay {
  return {
    date: new Date(2026, 3, 15), // April 15 2026
    workouts: [],
    isCurrentMonth: true,
    ...overrides,
  }
}

function renderCell(day: CalendarDay, onEmptyClick = vi.fn()) {
  return render(
    <MemoryRouter>
      <CalendarCell day={day} onEmptyClick={onEmptyClick} />
    </MemoryRouter>,
  )
}

function renderCellWithProps(
  day: CalendarDay,
  onEmptyClick = vi.fn(),
  disableOutOfMonthClick?: boolean,
) {
  return render(
    <MemoryRouter>
      <CalendarCell
        day={day}
        onEmptyClick={onEmptyClick}
        disableOutOfMonthClick={disableOutOfMonthClick}
      />
    </MemoryRouter>,
  )
}

describe('CalendarCell — disableOutOfMonthClick prop', () => {
  it('disableOutOfMonthClick=false: clicking out-of-month empty day fires onEmptyClick', async () => {
    const user = userEvent.setup()
    const onEmptyClick = vi.fn()
    const day = makeDay({ isCurrentMonth: false, workouts: [] })

    renderCellWithProps(day, onEmptyClick, false)

    // Should now have role=button since disableOutOfMonthClick=false
    const cell = screen.getByRole('button')
    await user.click(cell)

    expect(onEmptyClick).toHaveBeenCalledOnce()
    expect(onEmptyClick).toHaveBeenCalledWith(day.date)
  })

  it('disableOutOfMonthClick=true (default): out-of-month day is NOT clickable', async () => {
    const user = userEvent.setup()
    const onEmptyClick = vi.fn()
    const day = makeDay({ isCurrentMonth: false, workouts: [] })

    renderCellWithProps(day, onEmptyClick, true)

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    const cell = screen.getByText(day.date.getDate().toString()).closest('div')!
    await user.click(cell)
    expect(onEmptyClick).not.toHaveBeenCalled()
  })

  it('disableOutOfMonthClick=false: out-of-month day with workouts is NOT role=button', () => {
    const workout = {
      id: 'w1',
      userId: 'u1',
      title: 'Test',
      type: 'crossfit' as const,
      performedAt: '2026-04-15T10:00:00.000Z',
      durationMinutes: 45,
      createdAt: '2026-04-15T10:00:00.000Z',
      updatedAt: '2026-04-15T10:00:00.000Z',
    }
    const day = makeDay({ isCurrentMonth: false, workouts: [workout] })
    renderCellWithProps(day, vi.fn(), false)
    // Cell has workouts — should not be button even with disableOutOfMonthClick=false
    const cellDiv = screen.getByText(day.date.getDate().toString()).closest('div')!
    expect(cellDiv.getAttribute('role')).not.toBe('button')
  })
})

describe('CalendarCell', () => {
  beforeEach(() => {
    mockNavigate.mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('clicking an empty current-month cell calls onEmptyClick with the correct date', async () => {
    const user = userEvent.setup()
    const onEmptyClick = vi.fn()
    const date = new Date(2026, 3, 15)
    const day = makeDay({ date, workouts: [], isCurrentMonth: true })

    renderCell(day, onEmptyClick)

    const cell = screen.getByRole('button')
    await user.click(cell)

    expect(onEmptyClick).toHaveBeenCalledOnce()
    expect(onEmptyClick).toHaveBeenCalledWith(date)
  })

  it('clicking a filler day (isCurrentMonth=false) does NOT call onEmptyClick', async () => {
    const user = userEvent.setup()
    const onEmptyClick = vi.fn()
    const day = makeDay({ isCurrentMonth: false })

    renderCell(day, onEmptyClick)

    // Filler cells don't have role="button"
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    // Click on the cell element itself
    const cell = screen.getByText(day.date.getDate().toString()).closest('div')!
    await user.click(cell)

    expect(onEmptyClick).not.toHaveBeenCalled()
  })

  it("today's date gets a ring-2 ring-primary highlight", () => {
    // Use a fixed "today": April 15, 2026
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 3, 15)) // April 15, 2026

    const day = makeDay({ date: new Date(2026, 3, 15), isCurrentMonth: true })
    renderCell(day)

    // The cell should have ring-2 ring-primary classes
    const cell = screen.getByRole('button').closest('div')!
    expect(cell.className).toMatch(/ring-2/)
    expect(cell.className).toMatch(/ring-primary/)

    vi.useRealTimers()
  })

  it('a non-today cell does not get the ring highlight', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 3, 15)) // today is April 15

    const day = makeDay({ date: new Date(2026, 3, 16), isCurrentMonth: true }) // April 16
    renderCell(day)

    const cell = screen.getByRole('button').closest('div')!
    expect(cell.className).not.toMatch(/ring-2/)

    vi.useRealTimers()
  })

  it('a cell with workouts does NOT get role=button (workouts are clicked via chips)', () => {
    const workout = makeWorkout()
    const day = makeDay({ workouts: [workout], isCurrentMonth: true })

    renderCell(day)

    // The cell itself shouldn't be role=button when it has workouts
    // (WorkoutChip buttons will be inside, but the cell div itself won't)
    const cellDiv = screen.getByText('15').closest('div')!
    expect(cellDiv.getAttribute('role')).not.toBe('button')
  })

  it('renders the day number', () => {
    const day = makeDay({ date: new Date(2026, 3, 7) })
    renderCell(day)
    expect(screen.getByText('7')).toBeInTheDocument()
  })
})
