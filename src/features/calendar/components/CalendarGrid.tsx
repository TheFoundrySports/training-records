import { format } from 'date-fns'
import { useNavigate } from 'react-router'
import type { Workout } from '@/features/workouts/workout.types'
import { buildCalendarDays } from '../utils/buildCalendarDays'
import { CalendarCell } from './CalendarCell'

interface CalendarGridProps {
  year: number
  month: number
  workouts: Workout[]
  isLoading: boolean
}

const WEEK_DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function CalendarGrid({ year, month, workouts, isLoading }: CalendarGridProps) {
  const navigate = useNavigate()

  function handleEmptyClick(date: Date) {
    const dateStr = format(date, 'yyyy-MM-dd')
    void navigate(`/workouts/new?date=${dateStr}`)
  }

  const days = buildCalendarDays(year, month, workouts)
  const hasWorkouts = workouts.length > 0

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

      {/* Calendar grid */}
      <div className="overflow-x-auto">
        <div
          data-testid="calendar-day-grid"
          className="grid grid-cols-7 gap-px bg-border rounded min-w-[640px]"
        >
          {isLoading
            ? Array.from({ length: 35 }).map((_, i) => (
                <div key={i} className="min-h-24 bg-muted animate-pulse" aria-hidden="true" />
              ))
            : days.map((day) => (
                <CalendarCell
                  key={day.date.toISOString()}
                  day={day}
                  onEmptyClick={handleEmptyClick}
                />
              ))}
        </div>
      </div>

      {/* Empty state — shown after load when no workouts */}
      {!isLoading && !hasWorkouts && (
        <p className="text-center text-sm text-muted-foreground mt-6">No workouts this month.</p>
      )}
    </div>
  )
}
