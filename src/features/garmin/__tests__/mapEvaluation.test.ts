import { describe, it, expect } from 'vitest'
import { mapEvaluation, type EvaluationApiResponse } from '../hooks/useGarminImport'

const baseRaw: EvaluationApiResponse = {
  evaluation: {
    id: 'eval-1',
    summary: 'Good session, well recovered.',
    readiness_level: 'good',
    next_session_suggestion: 'Easy aerobic run tomorrow.',
    adaptation_warning: null,
  },
}

describe('mapEvaluation', () => {
  it('maps all evaluation fields to the correct TrainingEvaluation shape', () => {
    const result = mapEvaluation(baseRaw)

    expect(result.id).toBe('eval-1')
    expect(result.summary).toBe('Good session, well recovered.')
    expect(result.readinessLevel).toBe('good')
    expect(result.nextSessionSuggestion).toBe('Easy aerobic run tomorrow.')
    expect(result.adaptationWarning).toBeNull()
  })

  it('garminActivityId is "" — documents known stub', () => {
    const result = mapEvaluation(baseRaw)
    expect(result.garminActivityId).toBe('')
  })

  it('userId is "" — documents known stub', () => {
    const result = mapEvaluation(baseRaw)
    expect(result.userId).toBe('')
  })

  it('createdAt is a valid ISO date string', () => {
    const result = mapEvaluation(baseRaw)
    expect(() => new Date(result.createdAt)).not.toThrow()
    expect(new Date(result.createdAt).toISOString()).toBe(result.createdAt)
  })

  it('passes adaptation_warning: null through', () => {
    const result = mapEvaluation({
      ...baseRaw,
      evaluation: { ...baseRaw.evaluation, adaptation_warning: null },
    })
    expect(result.adaptationWarning).toBeNull()
  })

  it('passes adaptation_warning: string through', () => {
    const raw: EvaluationApiResponse = {
      evaluation: { ...baseRaw.evaluation, adaptation_warning: 'High training load this week.' },
    }
    const result = mapEvaluation(raw)
    expect(result.adaptationWarning).toBe('High training load this week.')
  })
})
