/**
 * RED tests for `relativeTimeEn` — `Intl.RelativeTimeFormat('en')` helper.
 *
 * NFR-07: dashboard relative dates use `Intl.RelativeTimeFormat('en')`.
 * The RPC returns `last_practiced_at` as an ISO timestamp; the client
 * formats the relative label for the user.
 *
 * Failure mode: any of these failing means the locale is wrong, the
 * formatting is non-English, or the units are off-spec.
 *
 * Refs: REQ-BD10 (relative dates use Intl.RelativeTimeFormat with en),
 * design §3.4 (client formats).
 */
import { describe, it, expect } from 'vitest'
import { relativeTimeEn } from '../../utils/relativeTime'

const NOW = new Date('2026-06-12T12:00:00.000Z')

describe('relativeTimeEn — Intl.RelativeTimeFormat("en") helper (REQ-BD10)', () => {
  it('returns "yesterday" for 1 day ago', () => {
    const yesterday = new Date(NOW)
    yesterday.setUTCDate(yesterday.getUTCDate() - 1)
    expect(relativeTimeEn(yesterday, NOW)).toBe('yesterday')
  })

  it('returns "3 days ago" for 3 days ago', () => {
    const threeDaysAgo = new Date(NOW)
    threeDaysAgo.setUTCDate(threeDaysAgo.getUTCDate() - 3)
    expect(relativeTimeEn(threeDaysAgo, NOW)).toBe('3 days ago')
  })

  it('returns "2 weeks ago" for 14 days ago', () => {
    const twoWeeksAgo = new Date(NOW)
    twoWeeksAgo.setUTCDate(twoWeeksAgo.getUTCDate() - 14)
    expect(relativeTimeEn(twoWeeksAgo, NOW)).toBe('2 weeks ago')
  })

  it('returns "in 2 days" for a future date 2 days ahead', () => {
    const future = new Date(NOW)
    future.setUTCDate(future.getUTCDate() + 2)
    expect(relativeTimeEn(future, NOW)).toBe('in 2 days')
  })

  it('uses the English locale (numeric: "auto")', () => {
    // Intl.RelativeTimeFormat with numeric: 'auto' yields "yesterday" /
    // "tomorrow" for ±1 day instead of "1 day ago" / "in 1 day".
    const oneDayAgo = new Date(NOW)
    oneDayAgo.setUTCDate(oneDayAgo.getUTCDate() - 1)
    expect(relativeTimeEn(oneDayAgo, NOW)).toBe('yesterday')
  })
})
