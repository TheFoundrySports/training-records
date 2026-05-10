import { format, parseISO, isValid } from 'date-fns'
import type { CalendarView, DateRange } from '../calendar.types'

const VALID_VIEWS: CalendarView[] = ['month', 'week', 'day']

/** Validate an ISO date string (YYYY-MM-DD). */
function isValidISODate(value: string): boolean {
  const parsed = parseISO(value)
  return isValid(parsed) && value === format(parsed, 'yyyy-MM-dd')
}

/**
 * Parse URL search params into { view, anchorDate, dateRange }.
 * - ?view must be 'month'|'week'|'day'; unknown value → 'month'
 * - ?date must be a valid ISO date string (YYYY-MM-DD); invalid/absent → today
 * - ?from and ?to must both be valid ISO dates to be included; otherwise dateRange is null
 * - Legacy ?year&?month params are silently ignored (fall back to today + month view)
 */
export function parseCalendarParams(searchParams: URLSearchParams): {
  view: CalendarView
  anchorDate: Date
  dateRange: DateRange | null
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

  // Parse dateRange (from/to)
  const rawFrom = searchParams.get('from')
  const rawTo = searchParams.get('to')
  let dateRange: DateRange | null = null
  if (rawFrom !== null && rawTo !== null && isValidISODate(rawFrom) && isValidISODate(rawTo)) {
    dateRange = { from: rawFrom, to: rawTo }
  }

  return { view, anchorDate, dateRange }
}

/**
 * Build a URLSearchParams string for the given view, date, and optional date range.
 * Returns a URLSearchParams object: { view, date: 'YYYY-MM-DD', from?: 'YYYY-MM-DD', to?: 'YYYY-MM-DD' }
 */
export function buildCalendarSearch(
  view: CalendarView,
  date: Date,
  dateRange?: DateRange | null
): URLSearchParams {
  const params: Record<string, string> = { view, date: format(date, 'yyyy-MM-dd') }
  if (dateRange) {
    params.from = dateRange.from
    params.to = dateRange.to
  }
  return new URLSearchParams(params)
}
