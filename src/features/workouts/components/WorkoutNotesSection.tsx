import { useState, useRef } from 'react'
import { useWorkoutNotesAI } from '../hooks/useWorkoutNotesAI'
import { useUpdateWorkout } from '../hooks/useWorkoutMutations'
import { AINotesPreviewPanel } from './AINotesPreviewPanel'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { Workout } from '../workout.types'

interface WorkoutNotesSectionProps {
  workout: Workout
}

export function WorkoutNotesSection({ workout }: WorkoutNotesSectionProps) {
  const [preview, setPreview] = useState<string | null>(null)
  const [aiError, setAiError] = useState<string | null>(null)
  /** Blocks a second click before React re-renders with `isAIPending` (TanStack Query updates async). */
  const enhanceInFlightRef = useRef(false)

  const { enhance, isPending: isAIPending } = useWorkoutNotesAI()
  const updateMutation = useUpdateWorkout()

  const hasNotes = (workout.notes ?? '').trim().length > 0

  function handleEnhance() {
    if (enhanceInFlightRef.current || isAIPending || !hasNotes) return

    enhanceInFlightRef.current = true
    setAiError(null)
    enhance(
      { notes: workout.notes ?? '' },
      {
        onSuccess: (result) => {
          setPreview(result.enhanced_notes)
        },
        onError: (err) => {
          const message = err instanceof Error ? err.message : 'AI enhancement failed'
          setAiError(message)
        },
        onSettled: () => {
          enhanceInFlightRef.current = false
        },
      },
    )
  }

  function handleApply(enhancedNotes: string) {
    setPreview(null)
    void updateMutation.mutateAsync({
      id: workout.id,
      data: {
        title: workout.title,
        type: workout.type,
        performedAt: workout.performedAt,
        durationMinutes: workout.durationMinutes,
        notes: workout.notes,
        enhancedNotes,
      },
    })
  }

  function handleDiscard() {
    setPreview(null)
  }

  return (
    <div className="space-y-3">
      {/* Original notes */}
      {workout.notes && (
        <div>
          <p className="text-sm text-muted-foreground mb-1">Notes</p>
          <p className="text-sm whitespace-pre-wrap">{workout.notes}</p>
        </div>
      )}

      {/* AI Enhance button — only shown when there are notes */}
      {hasNotes && (
        <div className="space-y-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleEnhance}
            disabled={isAIPending || updateMutation.isPending}
          >
            {isAIPending ? 'Enhancing…' : '✦ Enhance with AI'}
          </Button>

          {aiError && (
            <p className="text-sm text-destructive rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2">
              {aiError}
            </p>
          )}

          {preview && !aiError && (
            <AINotesPreviewPanel
              enhanced_notes={preview}
              onApply={handleApply}
              onDiscard={handleDiscard}
            />
          )}
        </div>
      )}

      {/* Enhanced notes — shown below notes when they exist (read-only, not in preview) */}
      {workout.enhancedNotes && !preview && (
        <div className="rounded-md border bg-muted/50 px-3 py-3">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="secondary" className="text-xs">AI Enhanced</Badge>
          </div>
          <p className="text-sm whitespace-pre-wrap">{workout.enhancedNotes}</p>
        </div>
      )}
    </div>
  )
}
