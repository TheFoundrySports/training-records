import { describe, it, expect } from 'vitest'
import { computeWeekBoundaries, computeDayBoundaries } from './useWorkoutsByMonth'

describe('computeWeekBoundaries', () => {
  it('Monday input: start is same Monday, end is following Sunday', () => {
    // April 13 2026 is a Monday
    const { start, end } = computeWeekBoundaries(new Date(2026, 3, 13))
    expect(start.getDay()).toBe(1) // Monday
    expect(start.getDate()).toBe(13)
    expect(start.getMonth()).toBe(3)
    expect(end.getDay()).toBe(0) // Sunday
    expect(end.getDate()).toBe(19)
    expect(end.getMonth()).toBe(3)
  })

  it('mid-week input (Wednesday): start is previous Monday', () => {
    // April 15 2026 is a Wednesday
    const { start, end } = computeWeekBoundaries(new Date(2026, 3, 15))
    expect(start.getDay()).toBe(1)
    expect(start.getDate()).toBe(13) // Mon Apr 13
    expect(end.getDay()).toBe(0)
    expect(end.getDate()).toBe(19) // Sun Apr 19
  })

  it('Sunday input: start is previous Monday, end is same Sunday', () => {
    // April 19 2026 is a Sunday
    const { start, end } = computeWeekBoundaries(new Date(2026, 3, 19))
    expect(start.getDay()).toBe(1)
    expect(start.getDate()).toBe(13) // Mon Apr 13
    expect(end.getDay()).toBe(0)
    expect(end.getDate()).toBe(19)
  })

  it('cross-month week: start is last day of prior month', () => {
    // March 31 2026 is a Tuesday — week starts Mar 30 (Mon)
    const { start, end } = computeWeekBoundaries(new Date(2026, 2, 31))
    expect(start.getDate()).toBe(30)
    expect(start.getMonth()).toBe(2) // March
    expect(end.getDate()).toBe(5)
    expect(end.getMonth()).toBe(3) // April
  })

  it('end time is 23:59:59.999', () => {
    const { end } = computeWeekBoundaries(new Date(2026, 3, 14))
    expect(end.getHours()).toBe(23)
    expect(end.getMinutes()).toBe(59)
    expect(end.getSeconds()).toBe(59)
    expect(end.getMilliseconds()).toBe(999)
  })

  it('start time is 00:00:00.000', () => {
    const { start } = computeWeekBoundaries(new Date(2026, 3, 14))
    expect(start.getHours()).toBe(0)
    expect(start.getMinutes()).toBe(0)
    expect(start.getSeconds()).toBe(0)
    expect(start.getMilliseconds()).toBe(0)
  })

  it('always spans exactly 7 calendar days', () => {
    const { start, end } = computeWeekBoundaries(new Date(2026, 3, 14))
    // start = Mon 00:00:00, end = Sun 23:59:59.999 → ceil diff = 7 days
    const diffMs = end.getTime() - start.getTime()
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
    expect(diffDays).toBe(7)
  })
})

describe('computeDayBoundaries', () => {
  it('start is midnight 00:00:00.000', () => {
    const { start } = computeDayBoundaries(new Date(2026, 3, 10))
    expect(start.getFullYear()).toBe(2026)
    expect(start.getMonth()).toBe(3)
    expect(start.getDate()).toBe(10)
    expect(start.getHours()).toBe(0)
    expect(start.getMinutes()).toBe(0)
    expect(start.getSeconds()).toBe(0)
    expect(start.getMilliseconds()).toBe(0)
  })

  it('end is 23:59:59.999', () => {
    const { end } = computeDayBoundaries(new Date(2026, 3, 10))
    expect(end.getFullYear()).toBe(2026)
    expect(end.getMonth()).toBe(3)
    expect(end.getDate()).toBe(10)
    expect(end.getHours()).toBe(23)
    expect(end.getMinutes()).toBe(59)
    expect(end.getSeconds()).toBe(59)
    expect(end.getMilliseconds()).toBe(999)
  })

  it('start and end are the same calendar day', () => {
    const date = new Date(2026, 11, 31)
    const { start, end } = computeDayBoundaries(date)
    expect(start.getDate()).toBe(31)
    expect(end.getDate()).toBe(31)
    expect(start.getMonth()).toBe(11)
    expect(end.getMonth()).toBe(11)
  })
})
