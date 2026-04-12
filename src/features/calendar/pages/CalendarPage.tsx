import { useSearchParams } from 'react-router'
import { addDays, addMonths, addWeeks, subDays, subMonths, subWeeks } from 'date-fns'
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
import type { CalendarView } from '../calendar.types'

export function CalendarPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { view, anchorDate } = parseCalendarParams(searchParams)

  // Compute date range based on current view
  const range =
    view === 'week'
      ? computeWeekBoundaries(anchorDate)
      : view === 'day'
        ? computeDayBoundaries(anchorDate)
        : computeMonthBoundaries(anchorDate.getFullYear(), anchorDate.getMonth() + 1)

  const { data: workouts = [], isLoading } = useWorkoutsByDateRange(range.start, range.end)

  function navigate(newView: CalendarView, newDate: Date) {
    setSearchParams(buildCalendarSearch(newView, newDate))
  }

  function handlePrev() {
    if (view === 'month') navigate(view, subMonths(anchorDate, 1))
    else if (view === 'week') navigate(view, subWeeks(anchorDate, 1))
    else navigate(view, subDays(anchorDate, 1))
  }

  function handleNext() {
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

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Training Calendar</h1>
      <CalendarHeader
        view={view}
        anchorDate={anchorDate}
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
