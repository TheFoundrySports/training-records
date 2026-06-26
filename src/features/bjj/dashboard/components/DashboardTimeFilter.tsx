/**
 * `DashboardTimeFilter` \u2014 the 4-preset segmented pill + Refresh button.
 *
 * Renders the 4 window presets (7d / 30d / 90d / 10r) as a segmented
 * pill with a Refresh IconButton on the right (REQ-BD2). The selected
 * preset is read from and persisted to `localStorage['bjj-dashboard-window']`
 * so the user's choice survives reloads.
 *
 * State machine:
 *  - On mount: read the stored window; if absent, default to '30d'.
 *  - On change: write the new window to localStorage; call `onChange(window)`.
 *  - On refresh click: call `onRefresh()`.
 *
 * The component is "uncontrolled" in the sense that it owns the
 * localStorage persistence but exposes the active window as a prop so
 * the parent (`BJJDashboardPage`) can pass it to `useBJJDashboard`.
 * A controlled parent can also pass a fixed `window` prop without
 * localStorage hydration by using the `initialWindow` prop.
 *
 * Implementation notes:
 *  - Uses MUI `ToggleButtonGroup` with `exclusive` selection. The
 *    `aria-pressed` attribute is set automatically by MUI.
 *  - The Refresh icon (`@mui/icons-material/Sync`) is already pre-bundled
 *    via `vite.config.ts` `optimizeDeps.include` (PR 4).
 *  - localStorage reads are wrapped in try/catch because jsdom / strict
 *    browser modes may throw on `localStorage` access; the dashboard
 *    must render even when storage is unavailable.
 *
 * Refs: T5.7, T5.8, REQ-BD2, NFR-07 (English copy).
 */
import { useEffect, useState } from 'react'
import {
  ToggleButton,
  ToggleButtonGroup,
  IconButton,
  Tooltip,
  Stack,
} from '@mui/material'
import SyncIcon from '@mui/icons-material/Sync'
import type { DashboardWindow } from '../types/dashboard.types'

/** The 4 window presets the dashboard exposes, in display order. */
export const DASHBOARD_WINDOWS: readonly DashboardWindow[] = ['7d', '30d', '90d', '10r'] as const

/** localStorage key for the persisted window selection. */
export const DASHBOARD_WINDOW_STORAGE_KEY = 'bjj-dashboard-window'

/** Default window preset when localStorage is empty. */
export const DEFAULT_DASHBOARD_WINDOW: DashboardWindow = '30d'

/**
 * Read the persisted window from localStorage. Falls back to the default
 * when the key is absent, malformed, or storage is unavailable.
 */
function readStoredWindow(): DashboardWindow {
  if (typeof window === 'undefined' || !window.localStorage) {
    return DEFAULT_DASHBOARD_WINDOW
  }
  try {
    const stored = window.localStorage.getItem(DASHBOARD_WINDOW_STORAGE_KEY)
    if (stored && (DASHBOARD_WINDOWS as readonly string[]).includes(stored)) {
      return stored as DashboardWindow
    }
  } catch {
    // Strict browser modes or quota errors \u2014 fall back silently.
  }
  return DEFAULT_DASHBOARD_WINDOW
}

/** Write the window to localStorage. No-op when storage is unavailable. */
function writeStoredWindow(value: DashboardWindow): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return
  }
  try {
    window.localStorage.setItem(DASHBOARD_WINDOW_STORAGE_KEY, value)
  } catch {
    // Quota exceeded / private mode \u2014 the in-memory state is the
    // source of truth for this session; persist next mount.
  }
}

export interface DashboardTimeFilterProps {
  /** Controlled window value (optional; defaults to the localStorage hydration). */
  window?: DashboardWindow
  /** Fired when the user picks a new window. */
  onChange: (window: DashboardWindow) => void
  /** Fired when the user clicks Refresh. */
  onRefresh: () => void
}

export function DashboardTimeFilter({
  window: windowProp,
  onChange,
  onRefresh,
}: DashboardTimeFilterProps) {
  // Track the effective window in state so localStorage hydration runs once
  // on mount without causing a render loop when the parent already passes a
  // matching prop.
  const [windowState, setWindowState] = useState<DashboardWindow | null>(
    windowProp ?? null,
  )

  useEffect(() => {
    if (windowProp) {
      // Controlled mode: parent owns the truth, no hydration.
      setWindowState(windowProp)
      return
    }
    setWindowState(readStoredWindow())
  }, [windowProp])

  const active: DashboardWindow = windowProp ?? windowState ?? DEFAULT_DASHBOARD_WINDOW

  function handleChange(_event: React.MouseEvent<HTMLElement>, next: DashboardWindow | null) {
    if (!next) return // ToggleButtonGroup with exclusive=true emits null on toggle-off; ignore.
    writeStoredWindow(next)
    if (!windowProp) setWindowState(next)
    onChange(next)
  }

  return (
    <Stack direction="row" spacing={1.5} alignItems="center" className="filterbar">
      <ToggleButtonGroup
        value={active}
        exclusive
        size="small"
        onChange={handleChange}
        aria-label="Dashboard time window"
        sx={{
          '& .MuiToggleButton-root': { textTransform: 'none', px: 2 },
        }}
      >
        {DASHBOARD_WINDOWS.map((preset) => (
          <ToggleButton key={preset} value={preset} aria-label={preset}>
            {preset}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
      <Tooltip title="Refresh data">
        <IconButton
          onClick={onRefresh}
          aria-label="Refresh dashboard data"
          size="small"
          sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 9999 }}
        >
          <SyncIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Stack>
  )
}