import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { useWorkouts } from '../hooks/useWorkouts'
import { ExportAllWorkoutsButton } from '../components/ExportAllWorkoutsButton'
import { ImportWorkoutsModal } from '../components/ImportWorkoutsModal'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import type { Workout, WorkoutType } from '../workout.types'

type FilterType = 'all' | WorkoutType

const FILTER_OPTIONS: { label: string; value: FilterType }[] = [
  { label: 'All', value: 'all' },
  { label: 'CrossFit', value: 'crossfit' },
  { label: 'Functional', value: 'functional' },
  { label: 'BJJ', value: 'bjj' },
]

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function WorkoutCard({ workout }: { workout: Workout }) {
  return (
    <Link
      to={`/workouts/${workout.id}`}
      className="block hover:no-underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none rounded-xl"
    >
      <Card className="hover:ring-primary/40 focus-visible:ring-primary/50 transition-shadow cursor-pointer">
        <CardContent className="flex items-start justify-between gap-4 py-4">
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{workout.title}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {formatDate(workout.performedAt)} &bull; {workout.durationMinutes} min
            </p>
          </div>
          <Badge variant="secondary" className="shrink-0 capitalize">
            {workout.type}
          </Badge>
        </CardContent>
      </Card>
    </Link>
  )
}

function LoadingSkeleton() {
  return (
    <div role="status" aria-label="Loading workouts" className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" aria-hidden="true" />
      ))}
    </div>
  )
}

function TypeFilter({ value, onChange }: { value: FilterType; onChange: (v: FilterType) => void }) {
  return (
    <div role="group" aria-label="Filter workouts by type" className="flex flex-wrap gap-1 mb-6">
      {FILTER_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          aria-pressed={value === opt.value}
          className={`px-3 py-1 rounded-full text-sm border transition-colors ${
            value === opt.value
              ? 'bg-primary text-primary-foreground border-primary'
              : 'border-input hover:bg-accent'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

export function WorkoutListPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<FilterType>('all')
  const [importModalOpen, setImportModalOpen] = useState(false)
  const { data: workouts, isLoading, isError, error } = useWorkouts({ type: filter })

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Workouts</h1>
        <div className="flex items-center gap-2">
          <ExportAllWorkoutsButton />
          <Button variant="outline" onClick={() => setImportModalOpen(true)}>
            Import
          </Button>
          <Button onClick={() => void navigate('/workouts/new')}>Log workout</Button>
        </div>
      </div>

      <TypeFilter value={filter} onChange={setFilter} />

      {isLoading && <LoadingSkeleton />}

      {isError && (
        <div
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-destructive"
        >
          <p className="font-medium">Failed to load workouts</p>
          <p className="text-sm mt-1 text-destructive/80">
            {(error as { error?: { message?: string } })?.error?.message ??
              'An unexpected error occurred. Please try again.'}
          </p>
        </div>
      )}

      {!isLoading && !isError && workouts && workouts.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg font-medium">No workouts yet</p>
          <p className="text-sm mt-1">Log your first workout to get started.</p>
          <Button className="mt-4" onClick={() => void navigate('/workouts/new')}>
            Log workout
          </Button>
        </div>
      )}

      {!isLoading && !isError && workouts && workouts.length > 0 && (
        <ul aria-label="Workout list" className="space-y-3">
          {workouts.map((workout) => (
            <li key={workout.id}>
              <WorkoutCard workout={workout} />
            </li>
          ))}
        </ul>
      )}

      <ImportWorkoutsModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onSuccess={() => {
          setImportModalOpen(false)
          void queryClient.invalidateQueries({ queryKey: ['workouts'] })
        }}
      />
    </div>
  )
}
