import { describe, it, expect } from 'vitest'
import { buildWeekDays } from './buildCalendarDays'
import type { Workout } from '@/features/workouts/workout.types'

function makeWorkout(performedAt: string, id = performedAt): Workout {
  return {
    id,
    userId: 'u1',
    title: 'Test Workout',
    type: 'crossfit',
    performedAt,
    durationMinutes: 45,
    createdAt: performedAt,
    updatedAt: performedAt,
  }
}

describe('buildWeekDays', () => {
  it('always returns exactly 7 days', () => {
    const days = buildWeekDays(new Date(2026, 3, 14), [])
    expect(days).toHaveLength(7)
  })

  it('week starts on Monday (getDay() === 1)', () => {
    const days = buildWeekDays(new Date(2026, 3, 14), []) // Tuesday Apr 14
    expect(days[0].date.getDay()).toBe(1) // Monday
  })

  it('week ends on Sunday (getDay() === 0)', () => {
    const days = buildWeekDays(new Date(2026, 3, 14), [])
    expect(days[6].date.getDay()).toBe(0) // Sunday
  })

  it('Mon–Sun for week of Apr 14 (Tuesday) is Apr 13 – Apr 19', () => {
    const days = buildWeekDays(new Date(2026, 3, 14), [])
    expect(days[0].date.getDate()).toBe(13) // Mon Apr 13
    expect(days[6].date.getDate()).toBe(19) // Sun Apr 19
  })

  it('all days have isCurrentMonth: true', () => {
    const days = buildWeekDays(new Date(2026, 3, 14), [])
    days.forEach((d) => expect(d.isCurrentMonth).toBe(true))
  })

  it('workout on Tuesday Apr 14 appears under Tuesday (index 1)', () => {
    const workout = makeWorkout('2026-04-14T10:00:00.000Z')
    const days = buildWeekDays(new Date(2026, 3, 14), [workout])
    const tuesday = days[1] // index 0=Mon, 1=Tue
    expect(tuesday.workouts).toHaveLength(1)
    expect(tuesday.workouts[0].id).toBe('2026-04-14T10:00:00.000Z')
  })

  it('multiple workouts on same day all appear in that day', () => {
    const w1 = makeWorkout('2026-04-14T08:00:00.000Z', 'w1')
    const w2 = makeWorkout('2026-04-14T18:00:00.000Z', 'w2')
    const days = buildWeekDays(new Date(2026, 3, 14), [w1, w2])
    const tuesday = days[1]
    expect(tuesday.workouts).toHaveLength(2)
  })

  it('workout on a different week does not appear', () => {
    const workout = makeWorkout('2026-04-20T10:00:00.000Z') // following Monday
    const days = buildWeekDays(new Date(2026, 3, 14), [workout])
    const total = days.reduce((sum, d) => sum + d.workouts.length, 0)
    expect(total).toBe(0)
  })

  it('cross-month week: handles days from different months', () => {
    // Week containing Mar 31 2026 (Tue): Mon Mar 30 – Sun Apr 5
    const days = buildWeekDays(new Date(2026, 2, 31), [])
    expect(days[0].date.getDate()).toBe(30) // Mon Mar 30
    expect(days[0].date.getMonth()).toBe(2) // March
    expect(days[6].date.getDate()).toBe(5) // Sun Apr 5
    expect(days[6].date.getMonth()).toBe(3) // April
  })

  it('empty workouts array returns 7 days all with empty workouts arrays', () => {
    const days = buildWeekDays(new Date(2026, 3, 14), [])
    days.forEach((d) => expect(d.workouts).toHaveLength(0))
  })
})
