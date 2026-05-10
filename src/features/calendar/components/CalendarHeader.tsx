import { format, startOfWeek, endOfWeek, isSameDay } from 'date-fns'
import { Button } from '@/components/ui/button'
import type { CalendarView } from '../calendar.types'

function getTitle(view: CalendarView, anchorDate: Date): string {
  if (view === 'month') {
    return format(anchorDate, 'MMMM yyyy')
  }
  if (view === 'week') {
    const start = startOfWeek(anchorDate, { weekStartsOn: 1 })
    const end = endOfWeek(anchorDate, { weekStartsOn: 1 })
    if (start.getFullYear() === end.getFullYear()) {
      if (start.getMonth() === end.getMonth()) {
        return `${format(start, 'd')} – ${format(end, 'd MMM yyyy')}`
      }
      return `${format(start, 'd MMM')} – ${format(end, 'd MMM yyyy')}`
    }
    return `${format(start, 'd MMM yyyy')} – ${format(end, 'd MMM yyyy')}`
  }
  return format(anchorDate, 'EEEE, d MMMM yyyy')
}

interface CalendarHeaderProps {
  view: CalendarView
  anchorDate: Date
  title?: string
  dateRangePicker?: React.ReactNode
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  onViewChange: (view: CalendarView) => void
}

export function CalendarHeader({
  view,
  anchorDate,
  title,
  dateRangePicker,
  onPrev,
  onNext,
  onToday,
  onViewChange,
}: CalendarHeaderProps) {
  const computedTitle = title ?? getTitle(view, anchorDate)
  const today = new Date()
  const isCurrentDay = isSameDay(anchorDate, today)

  return (
    <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-center sm:justify-between">
      {/* Title + DateRangePicker */}
      <div className="flex items-center gap-3 flex-wrap">
        <h2 className="text-xl font-semibold">{computedTitle}</h2>
        {dateRangePicker}
      </div>

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

const VIEW_LABELS: { view: CalendarView; label: string }[] = [
  { view: 'day', label: 'Day' },
  { view: 'week', label: 'Week' },
  { view: 'month', label: 'Month' },
]