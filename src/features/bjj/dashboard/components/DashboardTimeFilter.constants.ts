/**
 * Constants for the dashboard's time-window filter.
 *
 * Lives in its own file (not co-located with `DashboardTimeFilter.tsx`)
 * so the filter module only exports the React component \u2014
 * `react-refresh/only-export-components` (Fast Refresh) requires the
 * module to export components only.
 *
 * Refs: REQ-BD2 (4-preset segmented pill).
 */
import type { DashboardWindow } from '../types/dashboard.types'

/** The 4 window presets the dashboard exposes, in display order. */
export const DASHBOARD_WINDOWS: readonly DashboardWindow[] = ['7d', '30d', '90d', '10r'] as const

/** localStorage key for the persisted window selection. */
export const DASHBOARD_WINDOW_STORAGE_KEY = 'bjj-dashboard-window'

/** Default window preset when localStorage is empty. */
export const DEFAULT_DASHBOARD_WINDOW: DashboardWindow = '30d'

/** Visible labels matching open-design `template.html` segmented control. */
export const DASHBOARD_WINDOW_LABELS: Record<DashboardWindow, string> = {
  '7d': '7 days',
  '30d': '30 days',
  '90d': '90 days',
  '10r': '10 rolls',
}