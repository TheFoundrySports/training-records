/**
 * Constants for `RoleBalanceWidget` — extracted to a sibling file so the
 * component module exports ONLY components (Fast Refresh / react-refresh
 * / only-export-components lint rule).
 *
 * The mapping:
 *   role key -> English label (NFR-07)
 *   role key -> CSS custom property (--role-*) used by the segment
 *               fill + legend swatch + per-row thin pct bar
 */
import type { RoleBalanceSegment } from '../types/dashboard.types'

export const ROLE_LABEL: Record<RoleBalanceSegment['role'], string> = {
  attacking: 'Attacking',
  defending: 'Defending',
  neutral: 'Neutral',
}

export const ROLE_VAR: Record<RoleBalanceSegment['role'], string> = {
  attacking: '--role-attack',
  defending: '--role-defend',
  neutral: '--role-neutral',
}