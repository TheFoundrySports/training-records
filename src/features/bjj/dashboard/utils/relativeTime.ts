/**
 * Pure helper: `relativeTimeEn` formats a date as a relative-time English
 * string using `Intl.RelativeTimeFormat`.
 *
 * PRD \u00a76.11 + REQ-BD10: the dashboard's `last_label` is "3 days ago",
 * "yesterday", "2 weeks ago", etc. We use the standard `Intl` API with
 * `numeric: 'auto'` so \u00b11 day becomes "yesterday" / "tomorrow" instead
 * of the awkward "1 day ago" / "in 1 day".
 *
 * Refs: NFR-07 (all UI copy is English), REQ-BD10.
 */

/**
 * Format a past or future date as a relative-time English string.
 *
 * Examples (with `now` = 2026-06-12):
 *   - 1 day before now  \u2192 "yesterday"
 *   - 3 days before now \u2192 "3 days ago"
 *   - 14 days before now \u2192 "2 weeks ago"
 *   - 2 days after now  \u2192 "in 2 days"
 *
 * @param date   the target date (typically `last_practiced_at` from the DB)
 * @param now    the "current" time; defaults to `new Date()`. Tests pass an
 *               explicit value for determinism.
 */
export function relativeTimeEn(date: Date, now: Date = new Date()): string {
  const diffMs = date.getTime() - now.getTime()
  const diffSeconds = Math.round(diffMs / 1000)
  const diffMinutes = Math.round(diffSeconds / 60)
  const diffHours = Math.round(diffMinutes / 60)
  const diffDays = Math.round(diffHours / 24)
  const diffWeeks = Math.round(diffDays / 7)
  const diffMonths = Math.round(diffDays / 30)
  const diffYears = Math.round(diffDays / 365)

  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

  // Pick the largest unit that doesn't round to 0 \u2014 this is the standard
  // pattern for "humanized relative time". The thresholds match the
  // Intl.RelativeTimeFormat spec: anything \u2265 1 of a larger unit uses that
  // unit. For the dashboard's "last practiced" data the realistic spread
  // is hours..months; seconds/minutes are for safety.
  if (Math.abs(diffYears) >= 1) return rtf.format(diffYears, 'year')
  if (Math.abs(diffMonths) >= 1) return rtf.format(diffMonths, 'month')
  if (Math.abs(diffWeeks) >= 1) return rtf.format(diffWeeks, 'week')
  if (Math.abs(diffDays) >= 1) return rtf.format(diffDays, 'day')
  if (Math.abs(diffHours) >= 1) return rtf.format(diffHours, 'hour')
  if (Math.abs(diffMinutes) >= 1) return rtf.format(diffMinutes, 'minute')
  return rtf.format(diffSeconds, 'second')
}
