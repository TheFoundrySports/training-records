import { useState } from 'react'
import { useParams, useNavigate } from 'react-router'
import { useWorkout } from '../hooks/useWorkouts'
import { useDeleteWorkout } from '../hooks/useWorkoutMutations'
import { ExportWorkoutButton } from '../components/ExportWorkoutButton'
import { useAuth } from '@/features/auth/AuthContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import '../registry/formats/index'
import { getFormat } from '../registry/index'
import type { WodFormat } from '../registry/types'
import { BJJWorkoutDetail } from '@/features/bjj/components/BJJWorkoutDetail'
import { WorkoutNotesSection } from '../components/WorkoutNotesSection'
import {
  useGarminActivity,
  useTrainingEvaluation,
  useNextWorkout,
  useAdaptationWarning,
  GarminImportTrigger,
  TrainingMetricsPanel,
  AIEvaluationCard,
} from '@/features/garmin'
import type { TrainingEvaluation, ImportResult } from '@/features/garmin'

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <span className="w-40 shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className="text-sm">{value}</span>
    </div>
  )
}

export function WorkoutDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data: workout, isLoading, isError, error } = useWorkout(id ?? '')
  const deleteMutation = useDeleteWorkout()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [liveEvaluation, setLiveEvaluation] = useState<TrainingEvaluation | null>(null)

  const { data: garminActivity } = useGarminActivity(id)
  const { data: storedEvaluation, isLoading: isEvaluationLoading } = useTrainingEvaluation(
    garminActivity?.id,
  )
  const { data: nextWorkout } = useNextWorkout(workout?.performedAt)
  const adaptationWarning = useAdaptationWarning(
    garminActivity?.metrics.recoveryTimeHours ?? null,
    workout?.performedAt ?? '',
    nextWorkout?.performedAt ?? null,
  )

  // Prefer freshly generated evaluation over stored one
  const evaluation = liveEvaluation ?? storedEvaluation ?? null

  function handleImportComplete(result: ImportResult, newEvaluation: TrainingEvaluation | null) {
    if (newEvaluation) {
      setLiveEvaluation(newEvaluation)
    }
    // garminActivity query will refetch on next render cycle
    void result
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div role="status" aria-label="Loading workout" className="space-y-4">
          <div className="h-8 w-48 rounded bg-muted animate-pulse" aria-hidden="true" />
          <div className="h-48 rounded-xl bg-muted animate-pulse" aria-hidden="true" />
        </div>
      </div>
    )
  }

  const errorCode = (error as { error?: { code?: string } })?.error?.code
  const errorMessage = (error as { error?: { message?: string } })?.error?.message

  if (isError) {
    const isNotFound = errorCode === 'NOT_FOUND' || errorCode === 'PGRST116'
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Button
          variant="outline"
          onClick={() => void navigate('/workouts')}
          className="mb-6"
          aria-label="Back to workouts"
        >
          &larr; Back to workouts
        </Button>
        <div
          role="alert"
          className="rounded-xl border border-destructive/30 bg-muted p-6 text-center"
        >
          <p className="text-lg font-medium">
            {isNotFound ? 'Workout not found' : 'Failed to load workout'}
          </p>
          <p className="text-sm mt-1">
            {isNotFound
              ? 'This workout does not exist or you do not have permission to view it.'
              : (errorMessage ?? 'An unexpected error occurred.')}
          </p>
        </div>
      </div>
    )
  }

  if (!workout) return null

  // Discriminated rendering by workout type
  if (workout.type === 'bjj') {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Button
          variant="outline"
          onClick={() => void navigate('/workouts')}
          className="mb-6"
          aria-label="Back to workouts"
        >
          &larr; Back to workouts
        </Button>
        <BJJWorkoutDetail workoutId={workout.id} workout={workout} />
      </div>
    )
  }

  const isOwner = workout.userId === user?.id

  async function handleDelete() {
    if (!id) return
    await deleteMutation.mutateAsync(id)
    void navigate('/workouts')
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Button
        variant="outline"
        onClick={() => void navigate('/workouts')}
        className="mb-6"
        aria-label="Back to workouts"
      >
        &larr; Back to workouts
      </Button>

      <Card>
        <CardHeader className="border-b pb-4">
          <div className="flex items-start justify-between gap-4">
            <CardTitle className="text-xl">{workout.title}</CardTitle>
            <Badge variant="secondary" className="capitalize shrink-0">
              {workout.type}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="divide-y">
          <DetailRow label="Date" value={formatDate(workout.performedAt)} />
          <DetailRow label="Duration" value={`${workout.durationMinutes} minutes`} />
          {workout.rpe !== undefined && <DetailRow label="RPE" value={`${workout.rpe} / 10`} />}
          {(workout.notes || workout.enhancedNotes) && (
            <>
              <Separator className="my-2" />
              <div className="py-2">
                <WorkoutNotesSection workout={workout} />
              </div>
            </>
          )}
          {workout.wodText && (
            <>
              <Separator className="my-2" />
              <div className="py-2">
                <p className="text-sm text-muted-foreground mb-1">WOD Text</p>
                <p className="text-sm whitespace-pre-wrap">{workout.wodText}</p>
              </div>
            </>
          )}
          {workout.wodFormat &&
            workout.payload &&
            (() => {
              try {
                const handler = getFormat(workout.wodFormat as WodFormat)
                return (
                  <>
                    <Separator className="my-2" />
                    <div className="py-2">
                      <p className="text-sm text-muted-foreground mb-1">WOD Format</p>
                      <p className="text-sm font-medium mb-2">{handler.label}</p>
                      <pre className="text-xs bg-muted rounded p-2 overflow-auto">
                        {JSON.stringify(workout.payload, null, 2)}
                      </pre>
                    </div>
                  </>
                )
              } catch {
                return null
              }
            })()}
        </CardContent>
      </Card>

      {isOwner && (
        <div className="flex flex-wrap gap-3 mt-6">
          <Button variant="outline" onClick={() => void navigate(`/workouts/${workout.id}/edit`)}>
            Edit
          </Button>
          <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
            Delete
          </Button>
          <ExportWorkoutButton workoutId={workout.id} />
          <GarminImportTrigger
            workoutId={workout.id}
            hasExistingImport={garminActivity !== null && garminActivity !== undefined}
            onImportComplete={handleImportComplete}
          />
        </div>
      )}

      {garminActivity && (
        <div className="mt-6 space-y-4">
          <TrainingMetricsPanel metrics={garminActivity.metrics} />
          <AIEvaluationCard
            garminActivityId={garminActivity.id}
            isEvaluating={isEvaluationLoading}
            evaluation={evaluation}
            adaptationWarning={adaptationWarning}
          />
        </div>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Delete workout</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this workout? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleDelete()}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
