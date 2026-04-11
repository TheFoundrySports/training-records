import { format } from 'date-fns'
import { useNavigate } from 'react-router'
import type { Workout } from '@/features/workouts/workout.types'
import { buildWeekDays } from '../utils/buildCalendarDays'
import { CalendarCell } from './CalendarCell'

interface WeekGridProps {
  anchorDate: Date
  workouts: Workout[]
  isLoading: boolean
}

const WEEK_DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function WeekGrid({ anchorDate, workouts, isLoading }: WeekGridProps) {
  const navigate = useNavigate()

  function handleEmptyClick(date: Date) {
    const dateStr = format(date, 'yyyy-MM-dd')
    void navigate(`/workouts/new?date=${dateStr}`)
  }

  const days = buildWeekDays(anchorDate, workouts)

  return (
    <div>
      {/* Day-of-week header row */}
      <div className="grid grid-cols-7 mb-1">
        {WEEK_DAY_LABELS.map((label) => (
          <div key={label} className="text-center text-xs font-medium text-muted-foreground py-1">
            {label}
          </div>
        ))}
      </div>

      {/* Week grid — exactly 7 cells */}
      <div className="grid grid-cols-7 gap-px bg-border rounded overflow-hidden">
        {isLoading
          ? Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="min-h-24 bg-muted animate-pulse" aria-hidden="true" />
            ))
          : days.map((day) => (
              <CalendarCell
                key={day.date.toISOString()}
                day={day}
                onEmptyClick={handleEmptyClick}
                disableOutOfMonthClick={false}
              />
            ))}
      </div>
    </div>
  )
}
