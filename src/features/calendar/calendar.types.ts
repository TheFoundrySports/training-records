import type { Workout } from '../workouts/workout.types'

export type CalendarView = 'month' | 'week' | 'day'

export interface CalendarDay {
  date: Date
  workouts: Workout[]
  isCurrentMonth: boolean
}
