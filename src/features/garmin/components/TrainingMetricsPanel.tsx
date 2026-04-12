import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { HRZoneBar } from './HRZoneBar'
import type { GarminMetrics } from '../garmin.types'

interface TrainingMetricsPanelProps {
  metrics: GarminMetrics
}

function formatElapsedTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  if (hours === 0) return `${minutes}m`
  return `${hours}h ${minutes}m`
}

function MetricRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  )
}

export function TrainingMetricsPanel({ metrics }: TrainingMetricsPanelProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Garmin Metrics</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 divide-y">
        <MetricRow label="Elapsed time" value={formatElapsedTime(metrics.elapsedTimeSeconds)} />
        {metrics.avgHeartRate !== null && (
          <MetricRow label="Avg heart rate" value={`${metrics.avgHeartRate} bpm`} />
        )}
        {metrics.maxHeartRate !== null && (
          <MetricRow label="Max heart rate" value={`${metrics.maxHeartRate} bpm`} />
        )}
        <div className="py-1.5">
          <p className="text-sm text-muted-foreground mb-1.5">HR Zones</p>
          <HRZoneBar
            hrZone1Seconds={metrics.hrZone1Seconds}
            hrZone2Seconds={metrics.hrZone2Seconds}
            hrZone3Seconds={metrics.hrZone3Seconds}
            hrZone4Seconds={metrics.hrZone4Seconds}
            hrZone5Seconds={metrics.hrZone5Seconds}
          />
        </div>
        {metrics.trainingLoad !== null && (
          <MetricRow label="Training load" value={metrics.trainingLoad} />
        )}
        {metrics.recoveryTimeHours !== null && (
          <MetricRow label="Recovery time" value={`${metrics.recoveryTimeHours} hours`} />
        )}
        {metrics.calories !== null && (
          <MetricRow label="Calories" value={`${metrics.calories} kcal`} />
        )}
        {metrics.vo2max !== null && <MetricRow label="VO2max" value={metrics.vo2max} />}
      </CardContent>
    </Card>
  )
}
