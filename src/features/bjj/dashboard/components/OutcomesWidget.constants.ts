/**
 * Constants for `OutcomesWidget` — extracted to a sibling file so the
 * component module exports ONLY components (Fast Refresh / react-refresh
 * / only-export-components lint rule).
 *
 * The mapping:
 *   outcome key -> English label (NFR-07)
 *   outcome key -> MUI icon component (visual hint per outcome)
 *   outcome key -> CSS custom property (--outcome-*) for the
 *                   swatch + icon tint + pct-bar fill
 */
import SportsMartialArts from '@mui/icons-material/SportsMartialArts'
import TrendingUp from '@mui/icons-material/TrendingUp'
import TrendingDown from '@mui/icons-material/TrendingDown'
import HorizontalRule from '@mui/icons-material/HorizontalRule'
import type { OutcomesTile } from '../types/dashboard.types'

export const OUTCOME_LABEL: Record<OutcomesTile['outcome'], string> = {
  submission: 'Submission',
  position_gain: 'Position Gain',
  position_loss: 'Position Loss',
  neutral: 'Neutral',
}

export const OUTCOME_VAR: Record<OutcomesTile['outcome'], string> = {
  submission: '--outcome-sub',
  position_gain: '--outcome-gain',
  position_loss: '--outcome-loss',
  neutral: '--outcome-neutral',
}

export const OUTCOME_ICON: Record<
  OutcomesTile['outcome'],
  typeof SportsMartialArts
> = {
  submission: SportsMartialArts,
  position_gain: TrendingUp,
  position_loss: TrendingDown,
  neutral: HorizontalRule,
}