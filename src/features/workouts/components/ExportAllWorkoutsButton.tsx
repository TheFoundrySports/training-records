import { Download } from 'lucide-react'
import { useExportAllWorkouts } from '../hooks/useExportAllWorkouts'
import { Button } from '@/components/ui/button'

export function ExportAllWorkoutsButton() {
  const { mutate: exportAll, isPending } = useExportAllWorkouts()

  return (
    <Button
      variant="outline"
      onClick={() => exportAll()}
      disabled={isPending}
      aria-label="Export all workouts"
    >
      <Download className="h-4 w-4" aria-hidden="true" />
      {isPending ? 'Exporting…' : 'Export All'}
    </Button>
  )
}