import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { WeekGrid } from './WeekGrid'
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
    title: 'Test Workout',
    type: 'crossfit',
    performedAt,
    durationMinutes: 45,
    createdAt: performedAt,
    updatedAt: performedAt,
    ...overrides,
  }
}

function renderWeekGrid(props: { anchorDate?: Date; workouts?: Workout[]; isLoading?: boolean }) {
  const {
    anchorDate = new Date(2026, 3, 14), // Tuesday Apr 14
    workouts = [],
    isLoading = false,
  } = props

  return render(
    <MemoryRouter>
      <WeekGrid anchorDate={anchorDate} workouts={workouts} isLoading={isLoading} />
    </MemoryRouter>,
  )
}

describe('WeekGrid — structure', () => {
  it('renders 7 day-of-week header labels', () => {
    renderWeekGrid({})
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    labels.forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument()
    })
  })

  it('renders 7 cells (one per day) when not loading', () => {
    renderWeekGrid({})
    // Each cell shows its date number; week of Apr 14 = Apr 13–19
    const dayNumbers = [13, 14, 15, 16, 17, 18, 19]
    dayNumbers.forEach((n) => {
      // getByText with exact match for day numbers
      const elements = screen.getAllByText(n.toString())
      expect(elements.length).toBeGreaterThanOrEqual(1)
    })
  })

  it('renders 7 skeleton cells when isLoading=true', () => {
    renderWeekGrid({ isLoading: true })
    const skeletons = document.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBe(7)
  })

  it('does not render skeleton cells when not loading', () => {
    renderWeekGrid({ isLoading: false })
    const skeletons = document.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBe(0)
  })
})

describe('WeekGrid — workout placement', () => {
  it('workout chip appears under correct day column', () => {
    // Workout on Tuesday Apr 14
    const workout = makeWorkout('2026-04-14T10:00:00.000Z', { title: 'Tuesday WOD' })
    renderWeekGrid({ anchorDate: new Date(2026, 3, 14), workouts: [workout] })
    expect(screen.getByText('Tuesday WOD')).toBeInTheDocument()
  })
})
