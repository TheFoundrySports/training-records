/**
 * `DashboardPageHeader` — the page title + eyebrow + subtitle at the top
 * of the BJJ dashboard.
 */
import type { ReactNode } from 'react'
import { DASHBOARD_EYEBROW, DASHBOARD_PAGE_TITLE } from '../copy/dashboard-copy'

export interface DashboardPageHeaderProps {
  /** Narrative subtitle for the active window (REQ-BD2). */
  subtitle: string
  /** Optional eyebrow override; defaults to open-design copy. */
  eyebrowText?: ReactNode
  /** Slot for the time-filter control rendered on the right side. */
  actions?: ReactNode
}

const DEFAULT_EYEBROW = (
  <>
    <span className="dot" aria-hidden="true" />
    {DASHBOARD_EYEBROW}
  </>
)

export function DashboardPageHeader({
  subtitle,
  eyebrowText,
  actions,
}: DashboardPageHeaderProps) {
  return (
    <header className="page-head">
      <div>
        <p className="eyebrow">{eyebrowText ?? DEFAULT_EYEBROW}</p>
        <h1>{DASHBOARD_PAGE_TITLE}</h1>
        <p className="sub">{subtitle}</p>
      </div>
      {actions ? <div className="filterbar">{actions}</div> : null}
    </header>
  )
}
