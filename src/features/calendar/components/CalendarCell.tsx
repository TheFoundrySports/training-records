import { isSameDay } from 'date-fns'
import { cn } from '@/lib/utils'
import type { CalendarDay } from '../calendar.types'
import { WorkoutChip } from './WorkoutChip'

interface CalendarCellProps {
  day: CalendarDay
  onEmptyClick: (date: Date) => void
  disableOutOfMonthClick?: boolean
}

const MAX_VISIBLE_CHIPS = 3

export function CalendarCell({
  day,
  onEmptyClick,
  disableOutOfMonthClick = true,
}: CalendarCellProps) {
  const today = new Date()
  const isToday = isSameDay(day.date, today)
  const hasWorkouts = day.workouts.length > 0
  const overflowCount = day.workouts.length - MAX_VISIBLE_CHIPS
  const visibleWorkouts = day.workouts.slice(0, MAX_VISIBLE_CHIPS)

  // When disableOutOfMonthClick=true: only current-month empty cells are clickable (original behavior)
  // When disableOutOfMonthClick=false: any empty cell is clickable (needed for WeekGrid)
  const isClickable = !hasWorkouts && (disableOutOfMonthClick ? day.isCurrentMonth : true)

  function handleCellClick() {
    if (disableOutOfMonthClick && !day.isCurrentMonth) return
    if (!hasWorkouts) {
      onEmptyClick(day.date)
    }
  }

  return (
    <div
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={handleCellClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') handleCellClick()
      }}
      className={cn(
        'min-h-24 p-1.5 border border-border rounded-sm flex flex-col gap-0.5',
        disableOutOfMonthClick && !day.isCurrentMonth && 'bg-muted',
        isClickable && 'cursor-pointer hover:bg-muted/50 transition-colors',
        isToday && 'ring-2 ring-primary ring-inset',
      )}
      aria-label={isClickable ? `Add workout on ${day.date.toLocaleDateString()}` : undefined}
    >
      {/* Day number */}
      <span
        className={cn(
          'text-xs font-medium self-start leading-none mb-0.5',
          isToday
            ? 'bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-[11px]'
            : 'text-foreground',
        )}
      >
        {day.date.getDate()}
      </span>

      {/* Workout chips */}
      {visibleWorkouts.map((workout) => (
        <WorkoutChip key={workout.id} workout={workout} />
      ))}

      {/* Overflow indicator */}
      {overflowCount > 0 && (
        <span className="text-[10px] text-muted-foreground px-1.5">+{overflowCount} more</span>
      )}
    </div>
  )
}
