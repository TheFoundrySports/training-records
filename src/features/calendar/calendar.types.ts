import type { Workout } from '../workouts/workout.types'

export interface CalendarDay {
  date: Date
  workouts: Workout[]
  isCurrentMonth: boolean
}
