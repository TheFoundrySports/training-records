import { Download } from 'lucide-react'
import { useExportWorkout } from '../hooks/useExportWorkout'
import { Button } from '@/components/ui/button'

interface ExportWorkoutButtonProps {
  workoutId: string
}

export function ExportWorkoutButton({ workoutId }: ExportWorkoutButtonProps) {
  const { mutate: exportWorkout, isPending } = useExportWorkout(workoutId)

  return (
    <Button
      variant="outline"
      onClick={() => exportWorkout()}
      disabled={isPending}
      aria-label="Export workout"
    >
      <Download className="h-4 w-4" aria-hidden="true" />
      {isPending ? 'Exporting…' : 'Export'}
    </Button>
  )
}