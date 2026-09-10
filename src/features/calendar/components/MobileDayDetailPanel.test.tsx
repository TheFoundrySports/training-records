import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { format } from 'date-fns'
import { MobileDayDetailPanel } from './MobileDayDetailPanel'
import type { Workout } from '@/features/workouts/workout.types'
import { MemoryRouter } from 'react-router'

function makeWorkout(performedAt: string, overrides: Partial<Workout> = {}): Workout {
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

function renderPanel(props: {
  selectedDate?: Date | null
  workouts?: Workout[]
  isLoading?: boolean
}) {
  const { selectedDate = null, workouts = [], isLoading = false } = props
  return render(
    <MemoryRouter>
      <MobileDayDetailPanel
        selectedDate={selectedDate}
        workouts={workouts}
        isLoading={isLoading}
      />
    </MemoryRouter>,
  )
}

describe('MobileDayDetailPanel', () => {
  it('is hidden (returns null) when selectedDate is null', () => {
    const { container } = renderPanel({ selectedDate: null, workouts: [] })
    expect(container).toBeEmptyDOMElement()
  })

  it('renders the selected date as a heading', () => {
    const date = new Date(2026, 3, 15)
    const { container } = renderPanel({ selectedDate: date, workouts: [] })
    // Panel should contain the formatted date
    expect(container.textContent).toMatch(/15/)
    expect(container.textContent).toMatch(/Apr/)
  })

  it('shows loading skeletons when isLoading=true', () => {
    const date = new Date(2026, 3, 15)
    renderPanel({ selectedDate: date, workouts: [], isLoading: true })

    const skeletons = document.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('shows empty message when no workouts for the selected day', () => {
    const date = new Date(2026, 3, 15)
    const unrelatedWorkout = makeWorkout('2026-04-16T10:00:00.000Z')
    renderPanel({ selectedDate: date, workouts: [unrelatedWorkout] })

    expect(screen.getByText(/no workouts on this day/i)).toBeInTheDocument()
  })

  it('renders workout chips for workouts on the selected day', () => {
    const date = new Date(2026, 3, 15)
    const w1 = makeWorkout('2026-04-15T08:00:00.000Z', {
      id: 'w1',
      title: 'Morning WOD',
    })
    const w2 = makeWorkout('2026-04-15T18:00:00.000Z', {
      id: 'w2',
      title: 'Evening HIIT',
    })
    renderPanel({ selectedDate: date, workouts: [w1, w2] })

    expect(screen.getByText('Morning WOD')).toBeInTheDocument()
    expect(screen.getByText('Evening HIIT')).toBeInTheDocument()
  })

  it('does not render workouts from other days', () => {
    const date = new Date(2026, 3, 15)
    const wApr16 = makeWorkout('2026-04-16T10:00:00.000Z', {
      id: 'w-apr-16',
      title: 'Apr 16 WOD',
    })
    const wApr14 = makeWorkout('2026-04-14T10:00:00.000Z', {
      id: 'w-apr-14',
      title: 'Apr 14 WOD',
    })
    renderPanel({ selectedDate: date, workouts: [wApr16, wApr14] })

    expect(screen.queryByText('Apr 16 WOD')).not.toBeInTheDocument()
    expect(screen.queryByText('Apr 14 WOD')).not.toBeInTheDocument()
  })

  it('panel heading shows the full formatted date', () => {
    const date = new Date(2026, 3, 15)
    renderPanel({ selectedDate: date, workouts: [] })

    // Heading should show "Wednesday, 15 April 2026" (locale format)
    expect(screen.getByRole('heading')).toBeInTheDocument()
    expect(screen.getByRole('heading').textContent).toMatch(/15/)
  })
})
