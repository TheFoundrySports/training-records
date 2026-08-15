/**
 * Constants for `OutcomesWidget`.
 */
import type { OutcomesTile } from '../types/dashboard.types'

export const OUTCOME_LABEL: Record<OutcomesTile['outcome'], string> = {
  submission: 'Submission',
  position_gain: 'Position gain',
  position_loss: 'Position loss',
  neutral: 'Neutral',
}

export const OUTCOME_VAR: Record<OutcomesTile['outcome'], string> = {
  submission: '--outcome-sub',
  position_gain: '--outcome-gain',
  position_loss: '--outcome-loss',
  neutral: '--outcome-neutral',
}
