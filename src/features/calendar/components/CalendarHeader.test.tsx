import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { CalendarHeader } from './CalendarHeader'
import type { CalendarView } from '../calendar.types'

function renderHeader(props: {
  view?: CalendarView
  anchorDate?: Date
  onViewChange?: (v: CalendarView) => void
  onPrev?: () => void
  onNext?: () => void
  onToday?: () => void
}) {
  const {
    view = 'month',
    anchorDate = new Date(2026, 3, 14), // April 14
    onViewChange = vi.fn(),
    onPrev = vi.fn(),
    onNext = vi.fn(),
    onToday = vi.fn(),
  } = props

  return render(
    <MemoryRouter>
      <CalendarHeader
        view={view}
        anchorDate={anchorDate}
        onPrev={onPrev}
        onNext={onNext}
        onToday={onToday}
        onViewChange={onViewChange}
      />
    </MemoryRouter>,
  )
}

describe('CalendarHeader — title format per view', () => {
  it('month view: shows "April 2026"', () => {
    renderHeader({ view: 'month', anchorDate: new Date(2026, 3, 14) })
    expect(screen.getByText('April 2026')).toBeInTheDocument()
  })

  it('week view: shows range like "13 Apr – 19 Apr 2026"', () => {
    renderHeader({ view: 'week', anchorDate: new Date(2026, 3, 14) })
    // Week of Apr 14 is Mon Apr 13 – Sun Apr 19
    const heading = screen.getByRole('heading')
    expect(heading.textContent).toMatch(/Apr/)
    expect(heading.textContent).toMatch(/2026/)
  })

  it('day view: shows full day like "Tuesday, 14 April 2026"', () => {
    renderHeader({ view: 'day', anchorDate: new Date(2026, 3, 14) })
    const heading = screen.getByRole('heading')
    expect(heading.textContent).toMatch(/Tuesday/)
    expect(heading.textContent).toMatch(/14 April 2026/)
  })
})

describe('CalendarHeader — view switcher', () => {
  it('renders Day, Week, Month buttons', () => {
    renderHeader({})
    expect(screen.getByRole('button', { name: 'Day' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Week' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Month' })).toBeInTheDocument()
  })

  it('active view button has aria-pressed=true', () => {
    renderHeader({ view: 'week' })
    const weekBtn = screen.getByRole('button', { name: 'Week' })
    expect(weekBtn).toHaveAttribute('aria-pressed', 'true')
  })

  it('inactive view buttons have aria-pressed=false', () => {
    renderHeader({ view: 'week' })
    const dayBtn = screen.getByRole('button', { name: 'Day' })
    const monthBtn = screen.getByRole('button', { name: 'Month' })
    expect(dayBtn).toHaveAttribute('aria-pressed', 'false')
    expect(monthBtn).toHaveAttribute('aria-pressed', 'false')
  })

  it('clicking "Week" calls onViewChange with "week"', async () => {
    const user = userEvent.setup()
    const onViewChange = vi.fn()
    renderHeader({ view: 'month', onViewChange })
    await user.click(screen.getByRole('button', { name: 'Week' }))
    expect(onViewChange).toHaveBeenCalledOnce()
    expect(onViewChange).toHaveBeenCalledWith('week')
  })

  it('clicking "Day" calls onViewChange with "day"', async () => {
    const user = userEvent.setup()
    const onViewChange = vi.fn()
    renderHeader({ view: 'month', onViewChange })
    await user.click(screen.getByRole('button', { name: 'Day' }))
    expect(onViewChange).toHaveBeenCalledWith('day')
  })

  it('default view (month) has Month button highlighted (aria-pressed=true)', () => {
    renderHeader({ view: 'month' })
    const monthBtn = screen.getByRole('button', { name: 'Month' })
    expect(monthBtn).toHaveAttribute('aria-pressed', 'true')
  })
})

describe('CalendarHeader — navigation', () => {
  it('clicking ← calls onPrev', async () => {
    const user = userEvent.setup()
    const onPrev = vi.fn()
    renderHeader({ onPrev })
    await user.click(screen.getByRole('button', { name: 'Previous' }))
    expect(onPrev).toHaveBeenCalledOnce()
  })

  it('clicking → calls onNext', async () => {
    const user = userEvent.setup()
    const onNext = vi.fn()
    renderHeader({ onNext })
    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(onNext).toHaveBeenCalledOnce()
  })

  it('clicking Today calls onToday', async () => {
    const user = userEvent.setup()
    const onToday = vi.fn()
    renderHeader({ onToday })
    await user.click(screen.getByRole('button', { name: 'Go to today' }))
    expect(onToday).toHaveBeenCalledOnce()
  })
})
