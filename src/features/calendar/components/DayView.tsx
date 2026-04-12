import { format, isSameDay, isAfter, startOfDay } from 'date-fns'
import { useNavigate } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { Workout } from '@/features/workouts/workout.types'
import { WorkoutChip } from './WorkoutChip'

interface DayViewProps {
  anchorDate: Date
  workouts: Workout[]
  isLoading: boolean
}

export function DayView({ anchorDate, workouts, isLoading }: DayViewProps) {
  const navigate = useNavigate()

  const dayWorkouts = workouts.filter((w) => isSameDay(new Date(w.performedAt), anchorDate))
  const isFuture = isAfter(startOfDay(anchorDate), startOfDay(new Date()))
  const dateStr = format(anchorDate, 'yyyy-MM-dd')

  function handleAddWorkout() {
    void navigate(`/workouts/new?date=${dateStr}`)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Planning badge for future dates */}
      {isFuture && (
        <div>
          <Badge variant="secondary" className="text-xs">
            Planning mode
          </Badge>
        </div>
      )}

      {/* Workout list */}
      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
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

      {/* Add workout button */}
      <div>
        <Button variant="outline" size="sm" onClick={handleAddWorkout}>
          Add workout
        </Button>
      </div>
    </div>
  )
}
