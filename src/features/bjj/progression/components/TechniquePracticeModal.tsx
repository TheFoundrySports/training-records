'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2Icon } from 'lucide-react'
import type { WorkoutHistoryEntry } from '../types/technique-tracking.types'
import { useTechniqueWorkoutHistory } from '../hooks/useTechniqueWorkoutHistory'

interface TechniquePracticeModalProps {
  techniqueId: string
  techniqueName: string
  open: boolean
  onClose: () => void
}

function formatDate(isoString: string): string {
  return isoString.split('T')[0] // "2026-05-10" from "2026-05-10T10:00:00.000Z"
}

const MAX_DESCRIPTION_LENGTH = 80

function truncateDescription(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength).trimEnd() + '…'
}

function WorkoutCard({ entry }: { entry: WorkoutHistoryEntry }) {
  const date = formatDate(entry.performed_at)
  const truncatedDescription = truncateDescription(entry.ai_description, MAX_DESCRIPTION_LENGTH)

  return (
    <Card size="sm" data-testid={`workout-card-${entry.workout_id}`}>
      <CardContent>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">{date}</span>
            <a
              href={`/workouts/${entry.workout_id}`}
              className="text-xs text-primary hover:underline"
              aria-label={`View workout from ${date}`}
            >
              View workout
            </a>
          </div>
          <p className="text-sm font-medium">{entry.goal}</p>
          {truncatedDescription && (
            <p className="text-xs text-muted-foreground">{truncatedDescription}</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function TechniquePracticeModal({
  techniqueId,
  techniqueName,
  open,
  onClose,
}: TechniquePracticeModalProps) {
  const [userId, setUserId] = useState<string | null>(null)

  // Get authenticated user
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id)
      }
    })
  }, [])

  const {
    data: workouts,
    isLoading,
    isError,
    error,
  } = useTechniqueWorkoutHistory(techniqueId, userId ?? '')

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent aria-describedby="technique-modal-description">
        <DialogHeader>
          <DialogTitle>{techniqueName}</DialogTitle>
          <DialogDescription id="technique-modal-description">
            Practice history for this technique
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div
            className="flex items-center justify-center py-8"
            role="status"
            aria-label="Loading practice history"
          >
            <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {isError && (
          <p className="text-sm text-destructive" role="alert">
            Error loading practice history:{' '}
            {String((error as { error?: { message?: string } })?.error?.message ?? error)}
          </p>
        )}

        {!isLoading && !isError && (
          <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto">
            {workouts && workouts.length > 0 ? (
              workouts.map((entry) => <WorkoutCard key={entry.workout_id} entry={entry} />)
            ) : (
              <p
                className="text-sm text-muted-foreground py-4 text-center"
                data-testid="empty-state"
              >
                No practice sessions found for this technique.
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export { TechniquePracticeModal }
