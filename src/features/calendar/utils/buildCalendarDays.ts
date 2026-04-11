import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  format,
} from 'date-fns'
import type { Workout } from '@/features/workouts/workout.types'
import type { CalendarDay } from '../calendar.types'

/** Group workouts by local date key 'YYYY-MM-DD' */
export function groupByDay(workouts: Workout[]): Map<string, Workout[]> {
  return workouts.reduce((acc, w) => {
    // performedAt is ISO8601; use local date representation
    const key = new Date(w.performedAt).toLocaleDateString('en-CA') // 'YYYY-MM-DD' in local tz
    acc.set(key, [...(acc.get(key) ?? []), w])
    return acc
  }, new Map<string, Workout[]>())
}

/** Build the full CalendarDay[] for a given year/month */
export function buildCalendarDays(year: number, month: number, workouts: Workout[]): CalendarDay[] {
  const monthRef = new Date(year, month - 1, 1)
  const monthStart = startOfMonth(monthRef)
  const monthEnd = endOfMonth(monthRef)
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd })
  const byDay = groupByDay(workouts)

  return days.map((date) => {
    const key = format(date, 'yyyy-MM-dd')
    return {
      date,
      isCurrentMonth: isSameMonth(date, monthRef),
      workouts: byDay.get(key) ?? [],
    }
  })
}

/**
 * Build exactly 7 CalendarDay objects for the week containing anchorDate (Mon–Sun).
 * isCurrentMonth is set to true for all cells (meaningless in week context).
 */
export function buildWeekDays(anchorDate: Date, workouts: Workout[]): CalendarDay[] {
  const weekStart = startOfWeek(anchorDate, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(anchorDate, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd })
  const byDay = groupByDay(workouts)

  return days.map((date) => {
    const key = format(date, 'yyyy-MM-dd')
    return {
      date,
      isCurrentMonth: true,
      workouts: byDay.get(key) ?? [],
    }
  })
}
