import { format } from 'date-fns'
import { Button } from '@/components/ui/button'

interface CalendarHeaderProps {
  year: number
  month: number
  onPrev: () => void
  onNext: () => void
  onToday: () => void
}

export function CalendarHeader({ year, month, onPrev, onNext, onToday }: CalendarHeaderProps) {
  const displayDate = new Date(year, month - 1, 1)
  const title = format(displayDate, 'MMMM yyyy')

  const today = new Date()
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month

  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-xl font-semibold">{title}</h2>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onPrev} aria-label="Previous month">
          ←
        </Button>
        <Button
          variant={isCurrentMonth ? 'outline' : 'default'}
          size="sm"
          onClick={onToday}
          aria-label="Go to current month"
        >
          Today
        </Button>
        <Button variant="outline" size="sm" onClick={onNext} aria-label="Next month">
          →
        </Button>
      </div>
    </div>
  )
}
