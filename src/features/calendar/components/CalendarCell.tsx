import { isSameDay } from 'date-fns'
import { cn } from '@/lib/utils'
import type { CalendarDay } from '../calendar.types'
import { WorkoutChip } from './WorkoutChip'

interface CalendarCellProps {
  day: CalendarDay
  onEmptyClick: (date: Date) => void
}

const MAX_VISIBLE_CHIPS = 3

export function CalendarCell({ day, onEmptyClick }: CalendarCellProps) {
  const today = new Date()
  const isToday = isSameDay(day.date, today)
  const hasWorkouts = day.workouts.length > 0
  const overflowCount = day.workouts.length - MAX_VISIBLE_CHIPS
  const visibleWorkouts = day.workouts.slice(0, MAX_VISIBLE_CHIPS)

  function handleCellClick() {
    if (!day.isCurrentMonth) return
    if (!hasWorkouts) {
      onEmptyClick(day.date)
    }
  }

  return (
    <div
      role={day.isCurrentMonth && !hasWorkouts ? 'button' : undefined}
      tabIndex={day.isCurrentMonth && !hasWorkouts ? 0 : undefined}
      onClick={handleCellClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') handleCellClick()
      }}
      className={cn(
        'min-h-24 p-1.5 border border-border rounded-sm flex flex-col gap-0.5',
        !day.isCurrentMonth && 'bg-muted/30 opacity-50',
        day.isCurrentMonth && !hasWorkouts && 'cursor-pointer hover:bg-muted/50 transition-colors',
        isToday && 'ring-2 ring-primary ring-inset',
      )}
      aria-label={
        day.isCurrentMonth && !hasWorkouts
          ? `Add workout on ${day.date.toLocaleDateString()}`
          : undefined
      }
    >
      {/* Day number */}
      <span
        className={cn(
          'text-xs font-medium self-start leading-none mb-0.5',
          !day.isCurrentMonth && 'text-muted-foreground',
          isToday &&
            'bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-[11px]',
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
