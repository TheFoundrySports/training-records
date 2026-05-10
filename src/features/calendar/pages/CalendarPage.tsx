import { useSearchParams } from 'react-router'
import { addDays, addMonths, addWeeks, format, startOfWeek, endOfWeek, subDays, subMonths, subWeeks } from 'date-fns'
import {
  useWorkoutsByDateRange,
  computeMonthBoundaries,
  computeWeekBoundaries,
  computeDayBoundaries,
} from '../hooks/useWorkoutsByMonth'
import { parseCalendarParams, buildCalendarSearch } from '../utils/calendarParams'
import { CalendarHeader } from '../components/CalendarHeader'
import { CalendarGrid } from '../components/CalendarGrid'
import { WeekGrid } from '../components/WeekGrid'
import { DayView } from '../components/DayView'
import { DateRangePicker } from '../components/DateRangePicker'
import type { CalendarView } from '../calendar.types'

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

export function CalendarPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { view, anchorDate, dateRange } = parseCalendarParams(searchParams)

  // Compute date range based on current view
  const range =
    view === 'week'
      ? computeWeekBoundaries(anchorDate)
      : view === 'day'
        ? computeDayBoundaries(anchorDate)
        : dateRange
          ? { start: new Date(dateRange.from), end: new Date(dateRange.to) }
          : computeMonthBoundaries(anchorDate.getFullYear(), anchorDate.getMonth() + 1)

  const { data: workouts = [], isLoading } = useWorkoutsByDateRange(range.start, range.end)

  function navigate(newView: CalendarView, newDate: Date, newDateRange?: typeof dateRange) {
    setSearchParams(buildCalendarSearch(newView, newDate, newDateRange))
  }

  function handlePrev() {
    // Strip dateRange to preserve natural month navigation
    if (view === 'month') navigate(view, subMonths(anchorDate, 1))
    else if (view === 'week') navigate(view, subWeeks(anchorDate, 1))
    else navigate(view, subDays(anchorDate, 1))
  }

  function handleNext() {
    // Strip dateRange to preserve natural month navigation
    if (view === 'month') navigate(view, addMonths(anchorDate, 1))
    else if (view === 'week') navigate(view, addWeeks(anchorDate, 1))
    else navigate(view, addDays(anchorDate, 1))
  }

  function handleToday() {
    navigate(view, new Date())
  }

  function handleViewChange(newView: CalendarView) {
    navigate(newView, anchorDate)
  }

  function handleDateRangeChange(range: { from: string; to: string } | null) {
    // When a range is set, anchor to its start date so Prev/Next navigate from there
    const newAnchor = range ? new Date(range.from) : anchorDate
    navigate(view, newAnchor, range)
  }

  // Compute title — show range label when custom range is active
  let title: string
  if (dateRange && view === 'month') {
    title = `${format(new Date(dateRange.from), 'd MMM')} – ${format(new Date(dateRange.to), 'd MMM yyyy')}`
  } else {
    title = getTitle(view, anchorDate)
  }

  const dateRangePicker = (
    <DateRangePicker value={dateRange} onChange={handleDateRangeChange} />
  )

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Training Calendar</h1>
      <CalendarHeader
        view={view}
        anchorDate={anchorDate}
        title={title}
        dateRangePicker={dateRangePicker}
        onPrev={handlePrev}
        onNext={handleNext}
        onToday={handleToday}
        onViewChange={handleViewChange}
      />
      {view === 'month' && (
        <CalendarGrid
          year={anchorDate.getFullYear()}
          month={anchorDate.getMonth() + 1}
          workouts={workouts}
          isLoading={isLoading}
        />
      )}
      {view === 'week' && (
        <WeekGrid anchorDate={anchorDate} workouts={workouts} isLoading={isLoading} />
      )}
      {view === 'day' && (
        <DayView anchorDate={anchorDate} workouts={workouts} isLoading={isLoading} />
      )}
    </div>
  )
}
