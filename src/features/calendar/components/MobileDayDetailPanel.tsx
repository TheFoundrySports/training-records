import { format, isSameDay } from 'date-fns'
import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import type { Workout } from '@/features/workouts/workout.types'
import { WorkoutChip } from './WorkoutChip'

interface MobileDayDetailPanelProps {
  /** The currently selected date (null = panel hidden). */
  selectedDate: Date | null
  /** All workouts fetched for the current month/week view. */
  workouts: Workout[]
  isLoading: boolean
}

/**
 * Mobile day detail panel — visible on small screens (< md).
 *
 * Appears below the calendar grid when the user taps a day cell that has
 * workouts. Shows that day's workout list and a link to add a new workout.
 *
 * On desktop (md+) this component renders nothing, so the existing desktop
 * behaviour is completely unchanged.
 */
export function MobileDayDetailPanel({ selectedDate, workouts, isLoading }: MobileDayDetailPanelProps) {
  const navigate = useNavigate()

  if (selectedDate === null) return null

  const dayWorkouts = workouts.filter((w) =>
    isSameDay(new Date(w.performedAt), selectedDate),
  )

  function handleAddWorkout() {
    const dateStr = format(selectedDate, 'yyyy-MM-dd')
    void navigate(`/workouts/new?date=${dateStr}`)
  }

  return (
    <div
      data-testid="mobile-day-detail-panel"
      className="mt-4 md:hidden border rounded-lg p-4 bg-card"
      aria-label={`Workouts for ${format(selectedDate, 'EEEE d MMMM yyyy')}`}
    >
      {/* Panel heading */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold" aria-live="polite">
          {format(selectedDate, 'EEEE, d MMMM')}
        </h2>
        <Button variant="outline" size="sm" onClick={handleAddWorkout}>
          + Add workout
        </Button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-8 bg-muted animate-pulse rounded" aria-hidden="true" />
          ))}
        </div>
      ) : dayWorkouts.length === 0 ? (
        <p className="text-sm text-muted-foreground">No workouts on this day.</p>
      ) : (
        <div className="flex flex-col gap-1">
          {dayWorkouts.map((workout) => (
            <WorkoutChip key={workout.id} workout={workout} />
          ))}
        </div>
      )}
    </div>
  )
}
