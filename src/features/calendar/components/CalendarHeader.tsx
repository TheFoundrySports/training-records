import { format, startOfWeek, endOfWeek, isSameDay } from 'date-fns'
import { Button } from '@/components/ui/button'
import type { CalendarView } from '../calendar.types'

interface CalendarHeaderProps {
  view: CalendarView
  anchorDate: Date
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  onViewChange: (view: CalendarView) => void
}

function getTitle(view: CalendarView, anchorDate: Date): string {
  if (view === 'month') {
    return format(anchorDate, 'MMMM yyyy')
  }
  if (view === 'week') {
    const start = startOfWeek(anchorDate, { weekStartsOn: 1 })
    const end = endOfWeek(anchorDate, { weekStartsOn: 1 })
    // "31 Mar – 6 Apr 2026" — year shown only once at the end
    if (start.getFullYear() === end.getFullYear()) {
      if (start.getMonth() === end.getMonth()) {
        return `${format(start, 'd')} – ${format(end, 'd MMM yyyy')}`
      }
      return `${format(start, 'd MMM')} – ${format(end, 'd MMM yyyy')}`
    }
    return `${format(start, 'd MMM yyyy')} – ${format(end, 'd MMM yyyy')}`
  }
  // day
  return format(anchorDate, 'EEEE, d MMMM yyyy')
}

const VIEW_LABELS: { view: CalendarView; label: string }[] = [
  { view: 'day', label: 'Day' },
  { view: 'week', label: 'Week' },
  { view: 'month', label: 'Month' },
]

export function CalendarHeader({
  view,
  anchorDate,
  onPrev,
  onNext,
  onToday,
  onViewChange,
}: CalendarHeaderProps) {
  const title = getTitle(view, anchorDate)
  const today = new Date()
  const isCurrentDay = isSameDay(anchorDate, today)

  return (
    <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-center sm:justify-between">
      {/* Title */}
      <h2 className="text-xl font-semibold">{title}</h2>

      <div className="flex items-center gap-3 flex-wrap">
        {/* Prev / Today / Next */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onPrev} aria-label="Previous">
            ←
          </Button>
          <Button
            variant={isCurrentDay ? 'outline' : 'default'}
            size="sm"
            onClick={onToday}
            aria-label="Go to today"
          >
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={onNext} aria-label="Next">
            →
          </Button>
        </div>

        {/* View switcher */}
        <div className="flex items-center gap-1" role="group" aria-label="Calendar view">
          {VIEW_LABELS.map(({ view: v, label }) => (
            <Button
              key={v}
              variant={view === v ? 'default' : 'outline'}
              size="sm"
              onClick={() => onViewChange(v)}
              aria-pressed={view === v}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}
