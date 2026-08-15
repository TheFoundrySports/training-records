/**
 * `DashboardTimeFilter` — the 4-preset segmented pill + Refresh button.
 *
 * Uses the Open Design `.segmented` + `.refresh-btn` classes from
 * `material-dashboard.css` (template.html filterbar) instead of MUI
 * toggle buttons so the control matches the artifact visually.
 */
import { useState } from 'react'
import type { DashboardWindow } from '../types/dashboard.types'
import { readStoredDashboardWindow } from '../utils/readStoredDashboardWindow'
import { RefreshIcon } from './RefreshIcon'
import {
  DASHBOARD_WINDOWS,
  DASHBOARD_WINDOW_LABELS,
  DASHBOARD_WINDOW_STORAGE_KEY,
  DEFAULT_DASHBOARD_WINDOW,
} from './DashboardTimeFilter.constants'

function readStoredWindow(): DashboardWindow {
  return readStoredDashboardWindow()
}

function writeStoredWindow(value: DashboardWindow): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return
  }
  try {
    window.localStorage.setItem(DASHBOARD_WINDOW_STORAGE_KEY, value)
  } catch {
    // Quota exceeded / private mode — in-memory state is enough for this session.
  }
}

export interface DashboardTimeFilterProps {
  window?: DashboardWindow
  onChange: (window: DashboardWindow) => void
  onRefresh: () => void
}

export function DashboardTimeFilter({
  window: windowProp,
  onChange,
  onRefresh,
}: DashboardTimeFilterProps) {
  const [windowState, setWindowState] = useState<DashboardWindow>(
    () => windowProp ?? readStoredWindow(),
  )

  const active: DashboardWindow = windowProp ?? windowState ?? DEFAULT_DASHBOARD_WINDOW

  function handlePresetClick(next: DashboardWindow) {
    if (next === active) return
    writeStoredWindow(next)
    if (!windowProp) setWindowState(next)
    onChange(next)
  }

  return (
    <>
      <div className="segmented" role="tablist" aria-label="Dashboard time window">
        {DASHBOARD_WINDOWS.map((preset) => (
          <button
            key={preset}
            type="button"
            role="tab"
            aria-pressed={active === preset}
            data-window={preset}
            onClick={() => handlePresetClick(preset)}
          >
            {DASHBOARD_WINDOW_LABELS[preset]}
          </button>
        ))}
      </div>
      <button
        type="button"
        className="refresh-btn"
        aria-label="Refresh dashboard data"
        onClick={onRefresh}
      >
        <RefreshIcon />
        Refresh
      </button>
    </>
  )
}
