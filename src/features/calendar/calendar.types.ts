import type { Workout } from '../workouts/workout.types'

export type CalendarView = 'month' | 'week' | 'day'

export interface CalendarDay {
  date: Date
  workouts: Workout[]
  isCurrentMonth: boolean
}

/** Validated date range with ISO date strings (YYYY-MM-DD). */
export interface DateRange {
  from: string
  to: string
}
