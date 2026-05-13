import { describe, it, expect } from 'vitest'
import { calculateProgress, calculateSectionProgress } from '../calculateProgress'

describe('calculateProgress', () => {
  it('returns 0 when no items checked', () => {
    expect(calculateProgress(0, 45)).toBe(0)
  })

  it('returns 0 when checked = 0, denominator = 45', () => {
    expect(calculateProgress(0, 45)).toBe(0)
  })

  it('returns 49 when 22/45 (22/45 = 48.88 → rounds to 49)', () => {
    expect(calculateProgress(22, 45)).toBe(49)
  })

  it('returns 100 when all 45 checked', () => {
    expect(calculateProgress(45, 45)).toBe(100)
  })

  it('guards against 0 denominator', () => {
    expect(calculateProgress(0, 0)).toBe(0)
  })

  it('guards against negative checked count', () => {
    expect(calculateProgress(-5, 45)).toBe(0)
  })

  it('guards against negative denominator', () => {
    expect(calculateProgress(10, -3)).toBe(0)
  })
})

describe('calculateSectionProgress', () => {
  it('informational section (pilares) always returns 100', () => {
    expect(calculateSectionProgress('pilares', 0, 0)).toBe(100)
    expect(calculateSectionProgress('pilares', 5, 10)).toBe(100)
  })

  it('section with checked/total', () => {
    expect(calculateSectionProgress('tecnicas', 10, 32)).toBe(31)
  })

  it('guards against negative inputs', () => {
    expect(calculateSectionProgress('tecnicas', -1, 32)).toBe(0)
    expect(calculateSectionProgress('tecnicas', 5, -4)).toBe(0)
  })
})