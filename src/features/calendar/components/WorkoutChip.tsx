import { isAfter } from 'date-fns'
import { useNavigate } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Workout } from '@/features/workouts/workout.types'

interface WorkoutChipProps {
  workout: Workout
}

const MAX_TITLE_LENGTH = 20

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) + '…' : text
}

export function WorkoutChip({ workout }: WorkoutChipProps) {
  const navigate = useNavigate()
  const isPlanned = isAfter(new Date(workout.performedAt), new Date())

  function handleClick() {
    void navigate(`/workouts/${workout.id}`)
  }

  return (
    <button
      onClick={handleClick}
      className={cn(
        'flex w-full items-center gap-1 rounded px-1.5 py-0.5 text-left text-xs hover:bg-muted transition-colors cursor-pointer',
        isPlanned && 'opacity-70 border border-dashed border-border',
      )}
      aria-label={
        isPlanned ? `View planned workout: ${workout.title}` : `View workout: ${workout.title}`
      }
    >
      <span className="truncate flex-1 min-w-0" title={workout.title}>
        {truncate(workout.title, MAX_TITLE_LENGTH)}
      </span>
      {isPlanned && (
        <Badge variant="outline" className="shrink-0 text-[10px] h-4 px-1">
          Planned
        </Badge>
      )}
      <Badge variant="secondary" className="shrink-0 capitalize text-[10px] h-4 px-1">
        {workout.type}
      </Badge>
    </button>
  )
}
