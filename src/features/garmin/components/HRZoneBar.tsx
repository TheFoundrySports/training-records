interface HRZoneBarProps {
  hrZone1Seconds: number
  hrZone2Seconds: number
  hrZone3Seconds: number
  hrZone4Seconds: number
  hrZone5Seconds: number
}

const ZONE_COLORS = [
  'bg-gray-300', // Zone 1
  'bg-blue-400', // Zone 2
  'bg-green-500', // Zone 3
  'bg-orange-400', // Zone 4
  'bg-red-500', // Zone 5
]

function formatMinutes(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  return `${minutes} min`
}

export function HRZoneBar({
  hrZone1Seconds,
  hrZone2Seconds,
  hrZone3Seconds,
  hrZone4Seconds,
  hrZone5Seconds,
}: HRZoneBarProps) {
  const zones = [hrZone1Seconds, hrZone2Seconds, hrZone3Seconds, hrZone4Seconds, hrZone5Seconds]
  const total = zones.reduce((sum, s) => sum + s, 0)

  if (total === 0) return null

  const totalMinutes = Math.floor(total / 60)

  return (
    <div className="space-y-1.5">
      <div className="flex h-4 w-full overflow-hidden rounded-full">
        {zones.map((seconds, i) => {
          if (seconds === 0) return null
          const pct = (seconds / total) * 100
          return (
            <div
              key={i}
              className={ZONE_COLORS[i]}
              style={{ width: `${pct}%` }}
              title={`Zone ${i + 1}: ${formatMinutes(seconds)}`}
              aria-label={`Zone ${i + 1}: ${formatMinutes(seconds)}`}
            />
          )
        })}
      </div>
      <p className="text-xs text-muted-foreground">{totalMinutes} min in zones</p>
    </div>
  )
}
