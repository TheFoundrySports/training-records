import { format, parseISO, isValid } from 'date-fns'
import type { CalendarView } from '../calendar.types'

const VALID_VIEWS: CalendarView[] = ['month', 'week', 'day']

/**
 * Parse URL search params into { view, anchorDate }.
 * - ?view must be 'month'|'week'|'day'; unknown value → 'month'
 * - ?date must be a valid ISO date string (YYYY-MM-DD); invalid/absent → today
 * - Legacy ?year&?month params are silently ignored (fall back to today + month view)
 */
export function parseCalendarParams(searchParams: URLSearchParams): {
  view: CalendarView
  anchorDate: Date
} {
  const today = new Date()

  // Parse view
  const rawView = searchParams.get('view')
  const view: CalendarView =
    rawView !== null && (VALID_VIEWS as string[]).includes(rawView)
      ? (rawView as CalendarView)
      : 'month'

  // Parse date
  const rawDate = searchParams.get('date')
  let anchorDate = today
  if (rawDate !== null) {
    const parsed = parseISO(rawDate)
    if (isValid(parsed)) {
      anchorDate = parsed
    }
  }

  return { view, anchorDate }
}

/**
 * Build a URLSearchParams string for the given view and date.
 * Returns a URLSearchParams object: { view, date: 'YYYY-MM-DD' }
 */
export function buildCalendarSearch(view: CalendarView, date: Date): URLSearchParams {
  return new URLSearchParams({ view, date: format(date, 'yyyy-MM-dd') })
}
