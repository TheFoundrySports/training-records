import { format } from 'date-fns'
import { useNavigate } from 'react-router'
import { isSameDay } from 'date-fns'
import type { Workout } from '@/features/workouts/workout.types'
import { buildCalendarDays } from '../utils/buildCalendarDays'
import { CalendarCell } from './CalendarCell'

interface CalendarGridProps {
  year: number
  month: number
  workouts: Workout[]
  isLoading: boolean
  /** Currently selected day (controlled — drives MobileDayDetailPanel via CalendarPage). */
  selectedDay?: Date | null
  /** Called when the user taps a cell with workouts. Pass to sync external state. */
  onSelectDay?: (date: Date | null) => void
}

const WEEK_DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function CalendarGrid({
  year,
  month,
  workouts,
  isLoading,
  selectedDay = null,
  onSelectDay,
}: CalendarGridProps) {
  const navigate = useNavigate()

  function handleEmptyClick(date: Date) {
    const dateStr = format(date, 'yyyy-MM-dd')
    void navigate(`/workouts/new?date=${dateStr}`)
  }

  function handleWorkoutClick(date: Date) {
    // Toggle: tapping the already-selected day deselects
    const next = selectedDay !== null && isSameDay(selectedDay, date) ? null : date
    onSelectDay?.(next)
  }

  const days = buildCalendarDays(year, month, workouts)
  const hasWorkouts = workouts.length > 0

  return (
    <div>
      {/*
        Scroll wrapper is intentionally shared by the weekday-header row AND the day
        grid so they co-scroll and stay column-aligned at every viewport width.
        Previously (issue #99) the header was a sibling of the wrapper while the day
        grid was a `min-w-[640px]` child of it, which broke mobile: headers fit the
        viewport (~55px / col) while cells forced 640px and required horizontal scroll,
        leaving "Mon" and "Sun" misaligned.
        The inner div uses `min-w-[18rem] sm:min-w-0`:
          - 18rem (~288px) keeps cells tappable on the narrowest phones (320–390px viewport).
          - `sm:min-w-0` (>= 640px viewport) lets the grid fill the parent naturally.
          - `overflow-x-auto` is a safety net for sub-288px viewports.
      */}
      <div className="overflow-x-auto">
        <div className="min-w-[18rem] sm:min-w-0">
          {/* Day-of-week header row — co-scrolled with the day grid */}
          <div className="grid grid-cols-7 mb-1">
            {WEEK_DAY_LABELS.map((label) => (
              <div
                key={label}
                className="text-center text-xs font-medium text-muted-foreground py-1"
              >
                {label}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div
            data-testid="calendar-day-grid"
            className="grid grid-cols-7 gap-px bg-border rounded"
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
                    selected={selectedDay !== null && isSameDay(selectedDay, day.date)}
                    onWorkoutClick={handleWorkoutClick}
                  />
                ))}
          </div>
        </div>
      </div>

      {/* Empty state — shown after load when no workouts */}
      {!isLoading && !hasWorkouts && (
        <p className="text-center text-sm text-muted-foreground mt-6">No workouts this month.</p>
      )}
    </div>
  )
}
