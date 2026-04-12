import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { GarminImportModal } from './GarminImportModal'
import type { ImportResult, TrainingEvaluation } from '../garmin.types'

interface GarminImportTriggerProps {
  workoutId: string
  hasExistingImport: boolean
  onImportComplete: (result: ImportResult, evaluation: TrainingEvaluation | null) => void
}

export function GarminImportTrigger({
  workoutId,
  hasExistingImport,
  onImportComplete,
}: GarminImportTriggerProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <Button variant="outline" onClick={() => setIsOpen(true)}>
        {hasExistingImport ? 'Re-import Garmin Data' : 'Import Garmin Data'}
      </Button>

      <GarminImportModal
        workoutId={workoutId}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        hasExistingImport={hasExistingImport}
        onSuccess={(result, evaluation) => {
          onImportComplete(result, evaluation)
          setIsOpen(false)
        }}
      />
    </>
  )
}
