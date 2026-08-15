import type { DashboardWindow } from '../types/dashboard.types'
import {
  DASHBOARD_WINDOWS,
  DASHBOARD_WINDOW_STORAGE_KEY,
  DEFAULT_DASHBOARD_WINDOW,
} from '../components/DashboardTimeFilter.constants'

export function readStoredDashboardWindow(): DashboardWindow {
  if (typeof window === 'undefined' || !window.localStorage) {
    return DEFAULT_DASHBOARD_WINDOW
  }
  try {
    const stored = window.localStorage.getItem(DASHBOARD_WINDOW_STORAGE_KEY)
    if (stored && (DASHBOARD_WINDOWS as readonly string[]).includes(stored)) {
      return stored as DashboardWindow
    }
  } catch {
    // Private mode / quota — fall back to default.
  }
  return DEFAULT_DASHBOARD_WINDOW
}
