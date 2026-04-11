import { useSearchParams } from 'react-router'
import { useWorkoutsByMonth } from '../hooks/useWorkoutsByMonth'
import { CalendarHeader } from '../components/CalendarHeader'
import { CalendarGrid } from '../components/CalendarGrid'

export function CalendarPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  const today = new Date()
  const year = searchParams.has('year')
    ? parseInt(searchParams.get('year')!, 10)
    : today.getFullYear()
  const month = searchParams.has('month')
    ? parseInt(searchParams.get('month')!, 10)
    : today.getMonth() + 1

  const { data: workouts = [], isLoading } = useWorkoutsByMonth(year, month)

  function handlePrev() {
    if (month === 1) {
      setSearchParams({ year: String(year - 1), month: '12' })
    } else {
      setSearchParams({ year: String(year), month: String(month - 1) })
    }
  }

  function handleNext() {
    if (month === 12) {
      setSearchParams({ year: String(year + 1), month: '1' })
    } else {
      setSearchParams({ year: String(year), month: String(month + 1) })
    }
  }

  function handleToday() {
    const now = new Date()
    setSearchParams({ year: String(now.getFullYear()), month: String(now.getMonth() + 1) })
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Training Calendar</h1>
      <CalendarHeader
        year={year}
        month={month}
        onPrev={handlePrev}
        onNext={handleNext}
        onToday={handleToday}
      />
      <CalendarGrid year={year} month={month} workouts={workouts} isLoading={isLoading} />
    </div>
  )
}
