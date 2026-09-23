import DownloadIcon from '@mui/icons-material/Download'
import { Button } from '@mui/material'
import { useExportAllWorkouts } from '../hooks/useExportAllWorkouts'

/**
 * Export all workouts button.
 *
 * Uses MUI `Button` with `variant="outlined"` and `startIcon` so it visually
 * matches the Import button on WorkoutListPage. All three header action
 * buttons (Export All / Import / Log workout) now share the same component
 * library and the same radius/spacing token, giving a consistent stack.
 *
 * Visual hierarchy: Export All is secondary (outlined), like Import.
 * Log workout is primary (contained) and stands out.
 */
export function ExportAllWorkoutsButton() {
  const { mutate: exportAll, isPending } = useExportAllWorkouts()

  return (
    <Button
      variant="outlined"
      startIcon={<DownloadIcon aria-hidden="true" />}
      onClick={() => exportAll()}
      disabled={isPending}
      aria-label="Export all workouts"
      size="medium"
    >
      {isPending ? 'Exporting…' : 'Export All'}
    </Button>
  )
}