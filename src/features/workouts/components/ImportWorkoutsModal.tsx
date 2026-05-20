import { useRef, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useImportWorkouts } from '../hooks/useImportWorkouts'

interface ImportWorkoutsModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function ImportWorkoutsModal({ open, onClose, onSuccess }: ImportWorkoutsModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successCount, setSuccessCount] = useState<number | null>(null)

  const { mutate: importWorkouts, isPending } = useImportWorkouts()

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null)
    setSuccessCount(null)
    const file = e.target.files?.[0] ?? null
    if (!file) {
      setSelectedFile(null)
      return
    }
    if (!file.name.toLowerCase().endsWith('.json')) {
      setError('Only .json files are supported.')
      setSelectedFile(null)
      return
    }
    setSelectedFile(file)
  }

  function handleClose() {
    if (isPending) return
    setSelectedFile(null)
    setError(null)
    setSuccessCount(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    onClose()
  }

  async function handleImport() {
    if (!selectedFile) return
    try {
      setError(null)
      const count = await new Promise<number>((resolve, reject) => {
        importWorkouts(selectedFile, {
          onSuccess: (data) => resolve(data),
          onError: (err) => reject(err),
        })
      })
      setSuccessCount(count)
      setTimeout(() => {
        onSuccess()
        onClose()
      }, 1500)
    } catch (err) {
      setError(
        (err as { message?: string })?.message ?? 'Failed to import workouts. Please check the file format.'
      )
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) handleClose()
      }}
    >
      <DialogContent showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>Import Workouts</DialogTitle>
          <DialogDescription>
            Select a previously exported JSON file to import your workouts.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <input
              ref={fileInputRef}
              id="workout-file"
              type="file"
              accept=".json"
              disabled={isPending}
              onChange={handleFileChange}
              className="hidden"
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isPending}
              className="w-full"
            >
              Select file
            </Button>
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {selectedFile ? selectedFile.name : 'No file selected'}
            </p>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            {successCount !== null && (
              <p role="status" className="text-sm text-green-600">
                {successCount} workout{successCount !== 1 ? 's' : ''} imported successfully
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={() => void handleImport()} disabled={!selectedFile || isPending}>
            {isPending ? 'Importing…' : 'Import'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}