import { useEffect, useRef, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useGarminImport } from '../hooks/useGarminImport'
import type { ImportResult, TrainingEvaluation } from '../garmin.types'

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB

interface GarminImportModalProps {
  workoutId: string
  isOpen: boolean
  onClose: () => void
  hasExistingImport: boolean
  onSuccess: (result: ImportResult, evaluation: TrainingEvaluation | null) => void
}

export function GarminImportModal({
  workoutId,
  isOpen,
  onClose,
  hasExistingImport,
  onSuccess,
}: GarminImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const { importAndEvaluate, isImporting, isEvaluating, importResult, evaluation, error } =
    useGarminImport()

  const isBusy = isImporting || isEvaluating

  // When import succeeds (importResult is set and we're no longer busy), call onSuccess
  useEffect(() => {
    if (!isImporting && !isEvaluating && importResult) {
      onSuccess(importResult, evaluation)
    }
    // We intentionally only react to importResult changes here
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [importResult, isImporting, isEvaluating])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFileError(null)
    const file = e.target.files?.[0] ?? null

    if (!file) {
      setSelectedFile(null)
      return
    }

    if (!file.name.toLowerCase().endsWith('.fit')) {
      setFileError('Only .fit files are supported.')
      setSelectedFile(null)
      return
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setFileError('File size must be under 10 MB.')
      setSelectedFile(null)
      return
    }

    setSelectedFile(file)
  }

  function handleClose() {
    if (isBusy) return
    setSelectedFile(null)
    setFileError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    onClose()
  }

  async function handleImport() {
    if (!selectedFile) return
    await importAndEvaluate(selectedFile, workoutId)
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) handleClose()
      }}
    >
      <DialogContent showCloseButton={!isBusy}>
        <DialogHeader>
          <DialogTitle>Import Garmin Activity</DialogTitle>
          <DialogDescription>
            Upload a .fit file from your Garmin device to import activity data and generate an AI
            training evaluation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {hasExistingImport && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              This will replace your existing Garmin data.
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="fit-file" className="text-sm font-medium leading-none">
              Activity file (.fit)
            </label>
            <input
              ref={fileInputRef}
              id="fit-file"
              type="file"
              accept=".fit"
              disabled={isBusy}
              onChange={handleFileChange}
              className="block w-full text-sm file:mr-3 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-1 file:text-sm file:font-medium hover:file:bg-accent disabled:opacity-50"
            />
            {fileError && <p className="text-sm text-destructive">{fileError}</p>}
          </div>

          {isImporting && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div
                className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"
                aria-hidden="true"
              />
              Parsing activity…
            </div>
          )}

          {isEvaluating && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div
                className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"
                aria-hidden="true"
              />
              Generating evaluation…
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isBusy}>
            Cancel
          </Button>
          <Button onClick={() => void handleImport()} disabled={!selectedFile || isBusy}>
            {isBusy ? 'Importing…' : 'Import'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
