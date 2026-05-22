import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useBJJSections } from '../hooks/useBJJSections'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import type { Workout } from '@/features/workouts/workout.types'
import type { BJJSection } from '../bjj.types'

interface BJJWorkoutDetailProps {
  workoutId: string
  workout: Workout
  canEdit?: boolean
}

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

function BJJSectionCard({ section }: { section: BJJSection }) {
  const [view, setView] = useState<'raw' | 'ai'>(section.aiDescription ? 'ai' : 'raw')

  const hasDescription = section.rawDescription || section.aiDescription
  const showRaw = view === 'raw' ? section.rawDescription : section.aiDescription

  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm font-semibold">
            Section {section.sectionNumber}: {section.goal}
          </CardTitle>
          {section.durationMinutes && (
            <Badge variant="outline" className="shrink-0 text-xs">
              {section.durationMinutes} min
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Techniques */}
        {section.techniques.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {section.techniques.map((technique) => (
              <Badge key={technique.id} variant="secondary" className="gap-1">
                {technique.name}
                {technique.youtubeUrl && (
                  <a
                    href={technique.youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Watch ${technique.name} on YouTube`}
                    className="ml-1 text-red-500 hover:text-red-600"
                    onClick={(e) => e.stopPropagation()}
                  >
                    ▶
                  </a>
                )}
              </Badge>
            ))}
          </div>
        )}

        {/* Description toggle */}
        {hasDescription && (
          <div>
            {section.rawDescription && section.aiDescription && (
              <div className="flex gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => setView('raw')}
                  className={`text-xs px-2 py-1 rounded border transition-colors ${
                    view === 'raw'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-input hover:bg-accent'
                  }`}
                >
                  Raw
                </button>
                <button
                  type="button"
                  onClick={() => setView('ai')}
                  className={`text-xs px-2 py-1 rounded border transition-colors ${
                    view === 'ai'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-input hover:bg-accent'
                  }`}
                >
                  AI Enhanced
                </button>
              </div>
            )}
            {showRaw && (
              <p className="text-sm whitespace-pre-wrap text-muted-foreground">{showRaw}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function BJJWorkoutDetail({ workoutId, workout, canEdit }: BJJWorkoutDetailProps) {
  const navigate = useNavigate()
  const { data: sections, isLoading, isError } = useBJJSections(workoutId)

  return (
    <div>
      <Card>
        <CardHeader className="border-b pb-4">
          <div className="flex items-start justify-between gap-4">
            <CardTitle className="text-xl">{workout.title}</CardTitle>
            <Badge variant="secondary" className="capitalize shrink-0">
              BJJ
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="divide-y">
          <DetailRow label="Date" value={formatDate(workout.performedAt)} />
          <DetailRow label="Duration" value={`${workout.durationMinutes} minutes`} />
          {workout.rpe !== undefined && <DetailRow label="RPE" value={`${workout.rpe} / 10`} />}
          {workout.notes && (
            <>
              <Separator className="my-2" />
              <div className="py-2">
                <p className="text-sm text-muted-foreground mb-1">Notes</p>
                <p className="text-sm whitespace-pre-wrap">{workout.notes}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {canEdit && (
        <div className="flex flex-wrap gap-3 mt-6">
          <Button variant="outline" onClick={() => void navigate(`/bjj/${workout.id}/edit`)}>
            Edit
          </Button>
        </div>
      )}

      {/* Sections */}
      <div className="mt-6">
        <h2 className="text-lg font-semibold mb-4">Sections</h2>

        {isLoading && (
          <div role="status" aria-label="Loading sections" className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" aria-hidden="true" />
            ))}
          </div>
        )}

        {isError && (
          <div
            role="alert"
            className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-destructive text-sm"
          >
            Failed to load sections.
          </div>
        )}

        {!isLoading && !isError && sections && sections.length === 0 && (
          <p className="text-sm text-muted-foreground">No sections recorded for this workout.</p>
        )}

        {!isLoading && !isError && sections && sections.length > 0 && (
          <ul aria-label="Workout sections">
            {sections.map((section) => (
              <li key={section.id}>
                <BJJSectionCard section={section} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
