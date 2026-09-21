import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router'
import { useWorkout } from '../hooks/useWorkouts'
import { useDeleteWorkout } from '../hooks/useWorkoutMutations'
import { ExportWorkoutButton } from '../components/ExportWorkoutButton'
import { useAuth } from '@/features/auth/AuthContext'
import { Button } from '@/components/ui/button'
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
import type { TrainingEvaluation } from '@/features/garmin'
import { MetadataField, MetadataGrid } from '../components/MetadataField'
import { createWorkoutsTheme, readShadcnDarkMode } from '../theme/mui-workouts-theme'
import {
  Card,
  CardContent,
  CardHeader,
  Chip,
  Container,
  Stack,
  ThemeProvider,
  Typography,
  Box,
  Divider,
  Button as MuiButton,
  IconButton,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import type { Workout } from '../workout.types'

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Category color map matching WorkoutListPage */
const CATEGORY_COLORS: Record<string, { main: string; contrastText: string }> = {
  crossfit: { main: '#ea580c', contrastText: '#ffffff' },
  functional: { main: '#0891b2', contrastText: '#ffffff' },
  bjj: { main: '#7c3aed', contrastText: '#ffffff' },
}

function WorkoutMetadataCard({ workout }: { workout: Workout }) {
  return (
    <Card sx={{ borderRadius: 2 }}>
      <CardHeader
        sx={{ borderBottom: 1, borderColor: 'divider', pb: 2 }}
        title={
          <Typography variant="h5" component="span" sx={{ fontWeight: 600 }}>
            {workout.title}
          </Typography>
        }
        titleTypographyProps={{ component: 'h1' }}
        action={
          <Chip
            label={workout.type}
            size="small"
            sx={{
              backgroundColor: CATEGORY_COLORS[workout.type]?.main ?? 'secondary.main',
              color: CATEGORY_COLORS[workout.type]?.contrastText ?? 'secondary.contrastText',
              textTransform: 'capitalize',
              fontWeight: 500,
            }}
          />
        }
      />

      <CardContent>
        <MetadataGrid>
          <MetadataField label="Date" value={formatDate(workout.performedAt)} />
          <MetadataField label="Duration" value={`${workout.durationMinutes} minutes`} />
          {workout.rpe !== undefined && (
            <MetadataField label="RPE" value={`${workout.rpe} / 10`} />
          )}
        </MetadataGrid>

        {(workout.notes || workout.enhancedNotes) && (
          <>
            <Divider sx={{ my: 2 }} />
            <WorkoutNotesSection workout={workout} />
          </>
        )}

        {workout.wodText && (
          <>
            <Divider sx={{ my: 2 }} />
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                WOD Text
              </Typography>
              <Typography
                variant="body1"
                component="pre"
                sx={{
                  fontFamily: 'inherit',
                  whiteSpace: 'pre-wrap',
                  m: 0,
                }}
              >
                {workout.wodText}
              </Typography>
            </Box>
          </>
        )}

        {workout.wodFormat &&
          workout.payload &&
          (() => {
            try {
              const handler = getFormat(workout.wodFormat as WodFormat)
              return (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      WOD Format
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500, mb: 1 }}>
                      {handler.label}
                    </Typography>
                    <Box
                      component="pre"
                      sx={{
                        fontSize: '0.75rem',
                        backgroundColor: 'action.hover',
                        borderRadius: 1,
                        p: 2,
                        overflow: 'auto',
                        m: 0,
                      }}
                    >
                      {JSON.stringify(workout.payload, null, 2)}
                    </Box>
                  </Box>
                </>
              )
            } catch {
              return null
            }
          })()}
      </CardContent>
    </Card>
  )
}

function ActionButtons({
  canEdit,
  onEdit,
  onDelete,
  workoutId,
  garminActivity,
}: {
  canEdit: boolean
  onEdit: () => void
  onDelete: () => void
  workoutId: string
  garminActivity: { id: string } | null | undefined
}) {
  if (!canEdit) return null

  return (
    <Stack direction="row" spacing={1.5} flexWrap="wrap" sx={{ mt: 3 }}>
      <MuiButton variant="outlined" startIcon={<EditIcon />} onClick={onEdit}>
        Edit
      </MuiButton>
      <MuiButton variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={onDelete}>
        Delete
      </MuiButton>
      <ExportWorkoutButton workoutId={workoutId} />
      <GarminImportTrigger
        workoutId={workoutId}
        hasExistingImport={garminActivity !== null && garminActivity !== undefined}
        onImportComplete={() => void 0}
      />
    </Stack>
  )
}

export function WorkoutDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, role } = useAuth()
  const { data: workout, isLoading, isError, error } = useWorkout(id ?? '')
  const deleteMutation = useDeleteWorkout()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [liveEvaluation] = useState<TrainingEvaluation | null>(null)

  const theme = useMemo(() => createWorkoutsTheme(readShadcnDarkMode()), [])

  const isAdmin = role === 'admin'
  const isOwner = Boolean(workout && user && workout.userId === user.id)
  const canEdit = isAdmin || isOwner

  const editPath =
    workout?.type === 'bjj' ? `/bjj/${workout.id}/edit` : `/workouts/${workout?.id}/edit`

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

  const evaluation = liveEvaluation ?? storedEvaluation ?? null



  if (isLoading) {
    return (
      <ThemeProvider theme={theme}>
        <Container maxWidth="sm" sx={{ py: 4 }}>
          <Box role="status" aria-label="Loading workout" sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ height: 32, width: 192, backgroundColor: 'action.hover', borderRadius: 1 }} />
            <Box sx={{ height: 200, backgroundColor: 'action.hover', borderRadius: 2 }} />
          </Box>
        </Container>
      </ThemeProvider>
    )
  }

  const errorCode = (error as { error?: { code?: string } })?.error?.code
  const errorMessage = (error as { error?: { message?: string } })?.error?.message

  if (isError) {
    const isNotFound = errorCode === 'NOT_FOUND' || errorCode === 'PGRST116'
    return (
      <ThemeProvider theme={theme}>
        <Container maxWidth="sm" sx={{ py: 4 }}>
          <Button
            variant="outline"
            onClick={() => void navigate('/workouts')}
            className="mb-6"
            aria-label="Back to workouts"
          >
            &larr; Back to workouts
          </Button>
          <Box
            role="alert"
            sx={{
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'error.main',
              backgroundColor: 'error.contrastText',
              p: 3,
              textAlign: 'center',
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 500 }}>
              {isNotFound ? 'Workout not found' : 'Failed to load workout'}
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary' }}>
              {isNotFound
                ? 'This workout does not exist or you do not have permission to view it.'
                : (errorMessage ?? 'An unexpected error occurred.')}
            </Typography>
          </Box>
        </Container>
      </ThemeProvider>
    )
  }

  if (!workout) return null

  async function handleDelete() {
    if (!id) return
    await deleteMutation.mutateAsync(id)
    void navigate('/workouts')
  }

  // BJJ workouts use the dedicated component
  if (workout.type === 'bjj') {
    return (
      <ThemeProvider theme={theme}>
        <Container maxWidth="sm" sx={{ py: 4 }}>
          <IconButton
            onClick={() => void navigate('/workouts')}
            aria-label="Back to workouts"
            sx={{ mb: 2 }}
          >
            <ArrowBackIcon />
          </IconButton>
          <BJJWorkoutDetail
            workoutId={workout.id}
            workout={workout}
            canEdit={canEdit}
            canDelete={canEdit}
            onDelete={() => setDeleteOpen(true)}
          />

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
        </Container>
      </ThemeProvider>
    )
  }

  return (
    <ThemeProvider theme={theme}>
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <IconButton
          onClick={() => void navigate('/workouts')}
          aria-label="Back to workouts"
          sx={{ mb: 2 }}
        >
          <ArrowBackIcon />
        </IconButton>

        <WorkoutMetadataCard workout={workout} />

        <ActionButtons
          canEdit={canEdit}
          onEdit={() => void navigate(editPath)}
          onDelete={() => setDeleteOpen(true)}
          workoutId={workout.id}
          garminActivity={garminActivity}
        />

        {garminActivity && (
          <Stack spacing={2} sx={{ mt: 3 }}>
            <TrainingMetricsPanel metrics={garminActivity.metrics} />
            <AIEvaluationCard
              garminActivityId={garminActivity.id}
              isEvaluating={isEvaluationLoading}
              evaluation={evaluation}
              adaptationWarning={adaptationWarning}
            />
          </Stack>
        )}

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
      </Container>
    </ThemeProvider>
  )
}
