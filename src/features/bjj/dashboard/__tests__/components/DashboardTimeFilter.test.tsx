/**
 * RED tests for `DashboardTimeFilter`.
 *
 * Contract (T5.7 + REQ-BD2):
 *  - Renders 4 toggle buttons for the 4 window presets (7d / 30d / 90d / 10r).
 *  - The currently-selected preset has `aria-pressed="true"` (a11y for
 *    the segmented-pill pattern).
 *  - On mount, reads `localStorage['bjj-dashboard-window']`; if absent,
 *    defaults to '30d'.
 *  - On change, writes the new window back to `localStorage` AND calls
 *    `onChange(window)`.
 *  - Refresh IconButton calls `onRefresh()`.
 *  - All copy is English (NFR-07).
 *
 * RED confirmed: DashboardTimeFilter module doesn't exist yet.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fireEvent, renderWithMuiTheme, screen } from '@/test-utils/renderWithMuiTheme'
import { DashboardTimeFilter } from '../../components/DashboardTimeFilter'
import type { DashboardWindow } from '../../types/dashboard.types'

const STORAGE_KEY = 'bjj-dashboard-window'

function setStoredWindow(value: DashboardWindow | null) {
  if (value === null) {
    window.localStorage.removeItem(STORAGE_KEY)
  } else {
    window.localStorage.setItem(STORAGE_KEY, value)
  }
}

describe('DashboardTimeFilter \u2014 4-preset segmented control (T5.7, REQ-BD2)', () => {
  beforeEach(() => {
    setStoredWindow(null)
  })
  afterEach(() => {
    setStoredWindow(null)
  })

  it('renders 4 toggle buttons for the window presets', () => {
    renderWithMuiTheme(
      <DashboardTimeFilter window="30d" onChange={() => {}} onRefresh={() => {}} />,
    )
    expect(screen.getByRole('button', { name: '7d' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '30d' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '90d' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '10r' })).toBeInTheDocument()
  })

  it('marks the currently-selected window with aria-pressed=true', () => {
    renderWithMuiTheme(
      <DashboardTimeFilter window="90d" onChange={() => {}} onRefresh={() => {}} />,
    )
    expect(screen.getByRole('button', { name: '90d' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '30d' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('defaults to 30d on first mount when localStorage is empty', () => {
    // localStorage is empty from beforeEach
    const onChange = vi.fn()
    renderWithMuiTheme(<DashboardTimeFilter onChange={onChange} onRefresh={() => {}} />)
    // First effect-run may fire onChange for the hydration \u2014 but the
    // visible default is 30d.
    expect(screen.getByRole('button', { name: '30d' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('hydrates from localStorage on mount when a stored value exists', () => {
    setStoredWindow('90d')
    renderWithMuiTheme(
      <DashboardTimeFilter onChange={() => {}} onRefresh={() => {}} />,
    )
    expect(screen.getByRole('button', { name: '90d' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('writes the new window to localStorage on change', () => {
    setStoredWindow('30d')
    const onChange = vi.fn()
    renderWithMuiTheme(
      <DashboardTimeFilter window="30d" onChange={onChange} onRefresh={() => {}} />,
    )
    fireEvent.click(screen.getByRole('button', { name: '7d' }))
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('7d')
    expect(onChange).toHaveBeenCalledWith('7d')
  })

  it('refresh button calls onRefresh', () => {
    const onRefresh = vi.fn()
    renderWithMuiTheme(
      <DashboardTimeFilter window="30d" onChange={() => {}} onRefresh={onRefresh} />,
    )
    fireEvent.click(screen.getByRole('button', { name: /refresh/i }))
    expect(onRefresh).toHaveBeenCalledTimes(1)
  })
})