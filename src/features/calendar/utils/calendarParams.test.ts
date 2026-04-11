import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { parseCalendarParams, buildCalendarSearch } from './calendarParams'

describe('parseCalendarParams', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // Fix "today" to 2026-04-12
    vi.setSystemTime(new Date(2026, 3, 12))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('defaults to month view and today when no params', () => {
    const params = new URLSearchParams()
    const { view, anchorDate } = parseCalendarParams(params)
    expect(view).toBe('month')
    expect(anchorDate.getFullYear()).toBe(2026)
    expect(anchorDate.getMonth()).toBe(3) // April
    expect(anchorDate.getDate()).toBe(12)
  })

  it('parses valid view=week', () => {
    const params = new URLSearchParams({ view: 'week', date: '2026-04-14' })
    const { view } = parseCalendarParams(params)
    expect(view).toBe('week')
  })

  it('parses valid view=day', () => {
    const params = new URLSearchParams({ view: 'day', date: '2026-04-10' })
    const { view } = parseCalendarParams(params)
    expect(view).toBe('day')
  })

  it('parses valid view=month', () => {
    const params = new URLSearchParams({ view: 'month', date: '2026-04-01' })
    const { view } = parseCalendarParams(params)
    expect(view).toBe('month')
  })

  it('unknown view value falls back to month', () => {
    const params = new URLSearchParams({ view: 'quarterly', date: '2026-04-01' })
    const { view } = parseCalendarParams(params)
    expect(view).toBe('month')
  })

  it('parses a valid date', () => {
    const params = new URLSearchParams({ view: 'week', date: '2026-04-14' })
    const { anchorDate } = parseCalendarParams(params)
    expect(anchorDate.getFullYear()).toBe(2026)
    expect(anchorDate.getMonth()).toBe(3) // April
    expect(anchorDate.getDate()).toBe(14)
  })

  it('invalid date falls back to today', () => {
    const params = new URLSearchParams({ view: 'month', date: 'not-a-date' })
    const { anchorDate } = parseCalendarParams(params)
    expect(anchorDate.getDate()).toBe(12)
    expect(anchorDate.getMonth()).toBe(3)
    expect(anchorDate.getFullYear()).toBe(2026)
  })

  it('legacy ?year&month params — fallback to today + month view', () => {
    const params = new URLSearchParams({ year: '2026', month: '4' })
    const { view, anchorDate } = parseCalendarParams(params)
    expect(view).toBe('month')
    // anchorDate is today (fake: 2026-04-12)
    expect(anchorDate.getDate()).toBe(12)
  })

  it('missing date param falls back to today', () => {
    const params = new URLSearchParams({ view: 'day' })
    const { anchorDate } = parseCalendarParams(params)
    expect(anchorDate.getDate()).toBe(12)
    expect(anchorDate.getFullYear()).toBe(2026)
  })
})

describe('buildCalendarSearch', () => {
  it('builds correct search params for month view', () => {
    const result = buildCalendarSearch('month', new Date(2026, 3, 14))
    expect(result.get('view')).toBe('month')
    expect(result.get('date')).toBe('2026-04-14')
  })

  it('builds correct search params for week view', () => {
    const result = buildCalendarSearch('week', new Date(2026, 3, 14))
    expect(result.get('view')).toBe('week')
    expect(result.get('date')).toBe('2026-04-14')
  })

  it('builds correct search params for day view', () => {
    const result = buildCalendarSearch('day', new Date(2026, 3, 10))
    expect(result.get('view')).toBe('day')
    expect(result.get('date')).toBe('2026-04-10')
  })

  it('round-trip: buildCalendarSearch → parseCalendarParams preserves view and date', () => {
    const originalView = 'week'
    const originalDate = new Date(2026, 3, 14)
    const params = buildCalendarSearch(originalView, originalDate)
    const { view, anchorDate } = parseCalendarParams(params)
    expect(view).toBe(originalView)
    expect(anchorDate.getFullYear()).toBe(2026)
    expect(anchorDate.getMonth()).toBe(3)
    expect(anchorDate.getDate()).toBe(14)
  })
})
