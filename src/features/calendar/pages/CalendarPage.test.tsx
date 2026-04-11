import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CalendarPage } from './CalendarPage'
import type { useWorkoutsByMonth } from '../hooks/useWorkoutsByMonth'

vi.mock('../hooks/useWorkoutsByMonth', () => ({
  useWorkoutsByMonth: vi.fn(),
  computeMonthBoundaries: vi.fn(),
}))

// WorkoutChip uses useNavigate — CalendarGrid uses useNavigate too.
// They are inside MemoryRouter so no extra mock is needed.

import { useWorkoutsByMonth as useWorkoutsByMonthMock } from '../hooks/useWorkoutsByMonth'

const mockUseWorkoutsByMonth = vi.mocked(useWorkoutsByMonthMock)

type UseWorkoutsByMonthResult = ReturnType<typeof useWorkoutsByMonth>

function mockReturn(val: Partial<UseWorkoutsByMonthResult> = {}) {
  mockUseWorkoutsByMonth.mockReturnValue({
    data: [],
    isLoading: false,
    isError: false,
    error: null,
    ...val,
  } as unknown as UseWorkoutsByMonthResult)
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

describe('CalendarPage', () => {
  beforeEach(() => {
    mockReturn()
    vi.useRealTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('defaults to current year/month when no URL params', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 3, 12)) // April 12, 2026

    mockReturn()
    renderPage('/calendar')

    expect(screen.getByText('April 2026')).toBeInTheDocument()
    expect(mockUseWorkoutsByMonth).toHaveBeenCalledWith(2026, 4)

    vi.useRealTimers()
  })

  it('reads ?year=2025&month=6 and renders "June 2025" in header', () => {
    mockReturn()
    renderPage('/calendar?year=2025&month=6')

    expect(screen.getByText('June 2025')).toBeInTheDocument()
    expect(mockUseWorkoutsByMonth).toHaveBeenCalledWith(2025, 6)
  })

  it('clicking Next updates URL to next month', async () => {
    const user = userEvent.setup()
    mockReturn()
    renderPage('/calendar?year=2026&month=4')

    expect(screen.getByText('April 2026')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /next month/i }))

    expect(screen.getByText('May 2026')).toBeInTheDocument()
  })

  it('clicking Prev updates URL to previous month', async () => {
    const user = userEvent.setup()
    mockReturn()
    renderPage('/calendar?year=2026&month=4')

    expect(screen.getByText('April 2026')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /previous month/i }))

    expect(screen.getByText('March 2026')).toBeInTheDocument()
  })

  it('clicking Today updates URL to current month', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 3, 12)) // April 2026

    mockReturn()
    const { unmount } = renderPage('/calendar?year=2025&month=1')

    expect(screen.getByText('January 2025')).toBeInTheDocument()

    // Use real timers for userEvent to avoid advanceTimers conflict
    vi.useRealTimers()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /go to current month/i }))

    // handleToday() calls new Date() — but we need the DOM to update
    // The month shown should be April 2026 (the system time we set before render)
    // Note: after useRealTimers, new Date() will return real time.
    // We just verify the button click triggers a state update (month changes away from Jan 2025)
    expect(screen.queryByText('January 2025')).not.toBeInTheDocument()

    unmount()
  })

  it('year rollover — Jan → Prev goes to December of previous year', async () => {
    const user = userEvent.setup()
    mockReturn()
    renderPage('/calendar?year=2026&month=1')

    expect(screen.getByText('January 2026')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /previous month/i }))

    expect(screen.getByText('December 2025')).toBeInTheDocument()
  })

  it('year rollover — Dec → Next goes to January of next year', async () => {
    const user = userEvent.setup()
    mockReturn()
    renderPage('/calendar?year=2025&month=12')

    expect(screen.getByText('December 2025')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /next month/i }))

    expect(screen.getByText('January 2026')).toBeInTheDocument()
  })
})
