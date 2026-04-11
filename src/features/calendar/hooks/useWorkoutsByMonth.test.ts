import { describe, it, expect } from 'vitest'
import { computeMonthBoundaries } from './useWorkoutsByMonth'

describe('computeMonthBoundaries', () => {
  describe('January (month=1)', () => {
    it('start is Jan 1 at 00:00:00.000 local time', () => {
      const { start } = computeMonthBoundaries(2026, 1)
      expect(start.getFullYear()).toBe(2026)
      expect(start.getMonth()).toBe(0) // 0-indexed
      expect(start.getDate()).toBe(1)
      expect(start.getHours()).toBe(0)
      expect(start.getMinutes()).toBe(0)
      expect(start.getSeconds()).toBe(0)
      expect(start.getMilliseconds()).toBe(0)
    })

    it('end is Jan 31 at 23:59:59.999 local time', () => {
      const { end } = computeMonthBoundaries(2026, 1)
      expect(end.getFullYear()).toBe(2026)
      expect(end.getMonth()).toBe(0) // 0-indexed
      expect(end.getDate()).toBe(31)
      expect(end.getHours()).toBe(23)
      expect(end.getMinutes()).toBe(59)
      expect(end.getSeconds()).toBe(59)
      expect(end.getMilliseconds()).toBe(999)
    })
  })

  describe('December (month=12)', () => {
    it('start is Dec 1 at 00:00:00.000 local time', () => {
      const { start } = computeMonthBoundaries(2026, 12)
      expect(start.getFullYear()).toBe(2026)
      expect(start.getMonth()).toBe(11) // 0-indexed
      expect(start.getDate()).toBe(1)
      expect(start.getHours()).toBe(0)
      expect(start.getMinutes()).toBe(0)
      expect(start.getSeconds()).toBe(0)
      expect(start.getMilliseconds()).toBe(0)
    })

    it('end is Dec 31 at 23:59:59.999 local time', () => {
      const { end } = computeMonthBoundaries(2026, 12)
      expect(end.getFullYear()).toBe(2026)
      expect(end.getMonth()).toBe(11) // 0-indexed
      expect(end.getDate()).toBe(31)
      expect(end.getHours()).toBe(23)
      expect(end.getMinutes()).toBe(59)
      expect(end.getSeconds()).toBe(59)
      expect(end.getMilliseconds()).toBe(999)
    })
  })

  describe('February leap year (year=2024, month=2)', () => {
    it('start is Feb 1 at 00:00:00.000 local time', () => {
      const { start } = computeMonthBoundaries(2024, 2)
      expect(start.getFullYear()).toBe(2024)
      expect(start.getMonth()).toBe(1) // 0-indexed
      expect(start.getDate()).toBe(1)
    })

    it('end is Feb 29 at 23:59:59.999 local time (leap year)', () => {
      const { end } = computeMonthBoundaries(2024, 2)
      expect(end.getFullYear()).toBe(2024)
      expect(end.getMonth()).toBe(1) // 0-indexed
      expect(end.getDate()).toBe(29)
      expect(end.getHours()).toBe(23)
      expect(end.getMinutes()).toBe(59)
      expect(end.getSeconds()).toBe(59)
      expect(end.getMilliseconds()).toBe(999)
    })
  })

  describe('February non-leap year (year=2023, month=2)', () => {
    it('start is Feb 1 at 00:00:00.000 local time', () => {
      const { start } = computeMonthBoundaries(2023, 2)
      expect(start.getFullYear()).toBe(2023)
      expect(start.getMonth()).toBe(1) // 0-indexed
      expect(start.getDate()).toBe(1)
    })

    it('end is Feb 28 at 23:59:59.999 local time (non-leap year)', () => {
      const { end } = computeMonthBoundaries(2023, 2)
      expect(end.getFullYear()).toBe(2023)
      expect(end.getMonth()).toBe(1) // 0-indexed
      expect(end.getDate()).toBe(28)
      expect(end.getHours()).toBe(23)
      expect(end.getMinutes()).toBe(59)
      expect(end.getSeconds()).toBe(59)
      expect(end.getMilliseconds()).toBe(999)
    })
  })
})
