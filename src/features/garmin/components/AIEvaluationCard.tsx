import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AdaptationWarning } from './AdaptationWarning'
import type { TrainingEvaluation } from '../garmin.types'

interface AIEvaluationCardProps {
  garminActivityId: string | null
  isEvaluating: boolean
  evaluation: TrainingEvaluation | null
  adaptationWarning: string | null
  onGenerateEvaluation?: () => void
}

const READINESS_STYLES: Record<
  TrainingEvaluation['readinessLevel'],
  { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className: string }
> = {
  excellent: { variant: 'default', className: 'bg-green-500 hover:bg-green-600 text-white' },
  good: { variant: 'default', className: 'bg-teal-500 hover:bg-teal-600 text-white' },
  moderate: { variant: 'default', className: 'bg-yellow-500 hover:bg-yellow-600 text-white' },
  low: { variant: 'default', className: 'bg-orange-500 hover:bg-orange-600 text-white' },
  rest: { variant: 'destructive', className: '' },
}

const READINESS_LABELS: Record<TrainingEvaluation['readinessLevel'], string> = {
  excellent: 'Excellent',
  good: 'Good',
  moderate: 'Moderate',
  low: 'Low',
  rest: 'Rest',
}

export function AIEvaluationCard({
  garminActivityId,
  isEvaluating,
  evaluation,
  adaptationWarning,
  onGenerateEvaluation,
}: AIEvaluationCardProps) {
  if (garminActivityId === null) return null

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">AI Training Evaluation</CardTitle>
      </CardHeader>
      <CardContent>
        {isEvaluating && (
          <div className="space-y-3" aria-label="Loading evaluation">
            <div className="h-4 w-3/4 rounded bg-muted animate-pulse" aria-hidden="true" />
            <div className="h-4 w-full rounded bg-muted animate-pulse" aria-hidden="true" />
            <div className="h-4 w-2/3 rounded bg-muted animate-pulse" aria-hidden="true" />
          </div>
        )}

        {!isEvaluating && evaluation !== null && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Readiness:</span>
              <Badge
                variant={READINESS_STYLES[evaluation.readinessLevel].variant}
                className={READINESS_STYLES[evaluation.readinessLevel].className}
              >
                {READINESS_LABELS[evaluation.readinessLevel]}
              </Badge>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-1">Summary</p>
              <p className="text-sm">{evaluation.summary}</p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-1">Next session suggestion</p>
              <p className="text-sm">{evaluation.nextSessionSuggestion}</p>
            </div>

            <AdaptationWarning warning={adaptationWarning} />
          </div>
        )}

        {!isEvaluating && evaluation === null && (
          <div className="flex flex-col items-start gap-3">
            <p className="text-sm text-muted-foreground">Evaluation not yet generated.</p>
            {onGenerateEvaluation && (
              <Button variant="outline" size="sm" onClick={onGenerateEvaluation}>
                Generate AI Evaluation
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
