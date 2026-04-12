import { describe, it, expect } from 'vitest'
import { isValidEvaluationResponse } from '../garmin.utils'

describe('isValidEvaluationResponse', () => {
  const validResponse = {
    summary: 'Good session with solid aerobic base work.',
    readiness_level: 'good' as const,
    next_session_suggestion: 'Consider a moderate aerobic session in 24 hours.',
    adaptation_warning: null,
  }

  it('returns true for a valid object with all required fields', () => {
    expect(isValidEvaluationResponse(validResponse)).toBe(true)
  })

  it('returns true when adaptation_warning is null', () => {
    expect(isValidEvaluationResponse({ ...validResponse, adaptation_warning: null })).toBe(true)
  })

  it('returns true when adaptation_warning is a non-empty string', () => {
    expect(
      isValidEvaluationResponse({
        ...validResponse,
        adaptation_warning: 'High training load detected.',
      }),
    ).toBe(true)
  })

  it('returns true for every valid readiness_level value', () => {
    const levels = ['excellent', 'good', 'moderate', 'low', 'rest'] as const
    for (const level of levels) {
      expect(isValidEvaluationResponse({ ...validResponse, readiness_level: level })).toBe(true)
    }
  })

  it('returns false when summary is missing', () => {
    const { summary: _, ...rest } = validResponse
    expect(isValidEvaluationResponse(rest)).toBe(false)
  })

  it('returns false when summary is an empty string', () => {
    expect(isValidEvaluationResponse({ ...validResponse, summary: '' })).toBe(false)
  })

  it('returns false when summary is whitespace only', () => {
    expect(isValidEvaluationResponse({ ...validResponse, summary: '   ' })).toBe(false)
  })

  it('returns false when readiness_level is missing', () => {
    const { readiness_level: _, ...rest } = validResponse
    expect(isValidEvaluationResponse(rest)).toBe(false)
  })

  it('returns false for an invalid readiness_level value', () => {
    expect(isValidEvaluationResponse({ ...validResponse, readiness_level: 'epic' })).toBe(false)
  })

  it('returns false for an empty string readiness_level', () => {
    expect(isValidEvaluationResponse({ ...validResponse, readiness_level: '' })).toBe(false)
  })

  it('returns false when adaptation_warning is a number (not string or null)', () => {
    expect(isValidEvaluationResponse({ ...validResponse, adaptation_warning: 42 })).toBe(false)
  })

  it('returns false when adaptation_warning is an object', () => {
    expect(isValidEvaluationResponse({ ...validResponse, adaptation_warning: {} })).toBe(false)
  })

  it('returns false for null input', () => {
    expect(isValidEvaluationResponse(null)).toBe(false)
  })

  it('returns false for array input', () => {
    expect(isValidEvaluationResponse([validResponse])).toBe(false)
  })

  it('returns false for a string input', () => {
    expect(isValidEvaluationResponse('{"summary":"x"}')).toBe(false)
  })

  it('returns false for a number input', () => {
    expect(isValidEvaluationResponse(42)).toBe(false)
  })
})
