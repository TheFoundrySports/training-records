import { cn } from '@/lib/utils'

interface ProgressionProgressBarProps {
  value: number
  label?: string
  ariaLabel: string
  className?: string
}

function ProgressionProgressBar({
  value,
  label,
  ariaLabel,
  className,
}: ProgressionProgressBarProps) {
  const clampedValue = Math.min(100, Math.max(0, value))

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div
        className="relative h-2 flex-1 overflow-hidden rounded-full bg-gray-700"
        role="progressbar"
        aria-valuenow={clampedValue}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={ariaLabel}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-amber-400 transition-all duration-300"
          style={{ width: `${clampedValue}%` }}
        />
      </div>
      {label && (
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
          {label}
        </span>
      )}
    </div>
  )
}

export { ProgressionProgressBar }