import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CalendarPage } from './CalendarPage'
import type { useWorkoutsByDateRange } from '../hooks/useWorkoutsByMonth'

// Mock the hook so tests don't hit Supabase
vi.mock('../hooks/useWorkoutsByMonth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../hooks/useWorkoutsByMonth')>()
  return {
    ...actual,
    useWorkoutsByDateRange: vi.fn().mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
    }),
  }
})

import { useWorkoutsByDateRange as useWorkoutsByDateRangeMock } from '../hooks/useWorkoutsByMonth'

const mockUseWorkoutsByDateRange = vi.mocked(useWorkoutsByDateRangeMock)

type UseWorkoutsByDateRangeResult = ReturnType<typeof useWorkoutsByDateRange>

function mockReturn(val: Partial<UseWorkoutsByDateRangeResult> = {}) {
  mockUseWorkoutsByDateRange.mockReturnValue({
    data: [],
    isLoading: false,
    isError: false,
    error: null,
    ...val,
  } as unknown as UseWorkoutsByDateRangeResult)
}

function renderPage(initialUrl = '/calendar') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialUrl]}>
        <Routes>
          <Route path="/calendar" element={<CalendarPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('CalendarPage — defaults and URL state', () => {
  beforeEach(() => {
    mockReturn()
    vi.useRealTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('defaults to month view when no URL params', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 3, 12)) // April 12, 2026
    mockReturn()
    renderPage('/calendar')
    // Month view: shows the month title
    expect(screen.getByText('April 2026')).toBeInTheDocument()
  })

  it('legacy ?year&month params: shows today (month view fallback)', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 3, 12))
    mockReturn()
    // Legacy params are ignored — falls back to today in month view
    renderPage('/calendar?year=2025&month=6')
    // Since legacy params are ignored, we see today's month: April 2026
    expect(screen.getByText('April 2026')).toBeInTheDocument()
  })

  it('?view=month&date=2026-04-14 shows month view for April 2026', () => {
    mockReturn()
    renderPage('/calendar?view=month&date=2026-04-14')
    expect(screen.getByText('April 2026')).toBeInTheDocument()
  })
})

describe('CalendarPage — view rendering', () => {
  beforeEach(() => {
    mockReturn()
  })

  it('renders CalendarGrid (month view) for ?view=month', () => {
    renderPage('/calendar?view=month&date=2026-04-14')
    // Month view shows Mon–Sun day headers
    expect(screen.getByText('Mon')).toBeInTheDocument()
    expect(screen.getByText('Sun')).toBeInTheDocument()
  })

  it('renders WeekGrid for ?view=week', () => {
    renderPage('/calendar?view=week&date=2026-04-14')
    // WeekGrid shows Mon–Sun headers too
    expect(screen.getByText('Mon')).toBeInTheDocument()
    expect(screen.getByText('Sun')).toBeInTheDocument()
    // Header should show week range
    const heading = screen.getByRole('heading', { level: 2 })
    expect(heading.textContent).toMatch(/Apr/)
  })

  it('renders DayView for ?view=day', () => {
    renderPage('/calendar?view=day&date=2026-04-10')
    expect(screen.getByRole('button', { name: 'Add workout' })).toBeInTheDocument()
    expect(screen.getByText('No workouts on this day.')).toBeInTheDocument()
  })
})

describe('CalendarPage — hook called with correct range', () => {
  beforeEach(() => {
    mockUseWorkoutsByDateRange.mockClear()
    mockReturn()
  })

  it('calls useWorkoutsByDateRange with week range for ?view=week', () => {
    renderPage('/calendar?view=week&date=2026-04-14')
    expect(mockUseWorkoutsByDateRange).toHaveBeenCalled()
    // Find the call where the start date is in April (the week view call)
    const calls = mockUseWorkoutsByDateRange.mock.calls
    const weekCall = calls.find(([start]) => start.getMonth() === 3 && start.getDate() === 13)
    expect(weekCall).toBeDefined()
    const [start, end] = weekCall!
    // Week of Apr 14 2026 (Tue): Mon Apr 13 – Sun Apr 19
    expect(start.getDate()).toBe(13)
    expect(start.getMonth()).toBe(3) // April
    expect(end.getDate()).toBe(19)
    expect(end.getMonth()).toBe(3) // April
  })

  it('calls useWorkoutsByDateRange with day range for ?view=day', () => {
    renderPage('/calendar?view=day&date=2026-04-10')
    expect(mockUseWorkoutsByDateRange).toHaveBeenCalled()
    const calls = mockUseWorkoutsByDateRange.mock.calls
    const dayCall = calls.find(([start]) => start.getMonth() === 3 && start.getDate() === 10)
    expect(dayCall).toBeDefined()
    const [start, end] = dayCall!
    expect(start.getDate()).toBe(10)
    expect(start.getMonth()).toBe(3)
    expect(end.getDate()).toBe(10)
    expect(end.getMonth()).toBe(3)
  })
})

describe('CalendarPage — view switcher', () => {
  beforeEach(() => {
    mockReturn()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('clicking Week renders WeekGrid', async () => {
    const user = userEvent.setup()
    renderPage('/calendar?view=month&date=2026-04-14')
    await user.click(screen.getByRole('button', { name: 'Week' }))
    expect(screen.getByRole('button', { name: 'Week' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('clicking Day renders DayView', async () => {
    const user = userEvent.setup()
    renderPage('/calendar?view=month&date=2026-04-14')
    await user.click(screen.getByRole('button', { name: 'Day' }))
    expect(screen.getByRole('button', { name: 'Add workout' })).toBeInTheDocument()
  })

  it('Month button is highlighted by default', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 3, 12))
    renderPage('/calendar')
    expect(screen.getByRole('button', { name: 'Month' })).toHaveAttribute('aria-pressed', 'true')
  })
})

describe('CalendarPage — prev/next navigation', () => {
  beforeEach(() => {
    mockReturn()
  })

  it('clicking Next on month view shows next month', async () => {
    const user = userEvent.setup()
    renderPage('/calendar?view=month&date=2026-04-14')
    expect(screen.getByText('April 2026')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByText('May 2026')).toBeInTheDocument()
  })

  it('clicking Prev on month view shows previous month', async () => {
    const user = userEvent.setup()
    renderPage('/calendar?view=month&date=2026-04-14')
    expect(screen.getByText('April 2026')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Previous' }))
    expect(screen.getByText('March 2026')).toBeInTheDocument()
  })

  it('year rollover: Jan → Prev goes to December of previous year', async () => {
    const user = userEvent.setup()
    renderPage('/calendar?view=month&date=2026-01-15')
    expect(screen.getByText('January 2026')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Previous' }))
    expect(screen.getByText('December 2025')).toBeInTheDocument()
  })

  it('year rollover: Dec → Next goes to January of next year', async () => {
    const user = userEvent.setup()
    renderPage('/calendar?view=month&date=2025-12-15')
    expect(screen.getByText('December 2025')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByText('January 2026')).toBeInTheDocument()
  })
})
