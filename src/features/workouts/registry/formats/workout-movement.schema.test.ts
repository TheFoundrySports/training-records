import { describe, it, expect } from 'vitest'
import { WorkoutMovementSchema } from './workout-movement.schema'

const validMovement = {
  exerciseId: '00000000-0000-0000-0000-000000000000',
  exerciseName: 'Pull-up',
}

describe('WorkoutMovementSchema — repScheme', () => {
  it('passes when repScheme is "9-7-5"', () => {
    const result = WorkoutMovementSchema.safeParse({
      ...validMovement,
      repScheme: '9-7-5',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.repScheme).toBe('9-7-5')
    }
  })

  it('passes when repScheme is a long scheme "10-9-8-7-6-5-4-3-2-1"', () => {
    const result = WorkoutMovementSchema.safeParse({
      ...validMovement,
      repScheme: '10-9-8-7-6-5-4-3-2-1',
    })
    expect(result.success).toBe(true)
  })

  it('passes when repScheme is "21-15-9"', () => {
    const result = WorkoutMovementSchema.safeParse({
      ...validMovement,
      repScheme: '21-15-9',
    })
    expect(result.success).toBe(true)
  })

  it('fails when repScheme is a single number "21" (no hyphen)', () => {
    const result = WorkoutMovementSchema.safeParse({
      ...validMovement,
      repScheme: '21',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const err = result.error.issues.find((i) => i.path.includes('repScheme'))
      expect(err?.message).toBe('Format: 9-7-5')
    }
  })

  it('fails when repScheme is "abc"', () => {
    const result = WorkoutMovementSchema.safeParse({
      ...validMovement,
      repScheme: 'abc',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const err = result.error.issues.find((i) => i.path.includes('repScheme'))
      expect(err?.message).toBe('Format: 9-7-5')
    }
  })

  it('fails when repScheme uses x separators "9x7x5"', () => {
    const result = WorkoutMovementSchema.safeParse({
      ...validMovement,
      repScheme: '9x7x5',
    })
    expect(result.success).toBe(false)
  })

  it('passes when repScheme is omitted (field is optional)', () => {
    const result = WorkoutMovementSchema.safeParse(validMovement)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.repScheme).toBeUndefined()
    }
  })

  it('passes when both reps and repScheme are present', () => {
    const result = WorkoutMovementSchema.safeParse({
      ...validMovement,
      reps: 21,
      repScheme: '21-15-9',
    })
    expect(result.success).toBe(true)
  })
})
