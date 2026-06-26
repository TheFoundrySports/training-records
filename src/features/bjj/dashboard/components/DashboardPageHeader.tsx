/**
 * `DashboardPageHeader` \u2014 the page title + eyebrow + subtitle at the top
 * of the BJJ dashboard.
 *
 * The component is layout-only: it owns the `.page-head` flex container
 * (defined in `material-dashboard.css` lines 172-176) and the `.eyebrow`
 * stamp (line 175). All copy is passed in by the parent (`BJJDashboardPage`)
 * so the data layer stays the source of truth for the resolved window
 * subtitle and "last updated" timestamp.
 *
 * Props contract:
 *  - `subtitle`: a human-readable string the parent composes from the
 *    RPC's echoed window/range data (e.g. "May 13 \u2013 Jun 12 \u00b7 14 workouts").
 *  - `eyebrowText`: optional override for the eyebrow copy; defaults to
 *    "Live data \u00b7 evolution in motion" (matches `template.html` line 472).
 *
 * Why no MUI <Typography>:
 *  - The `.page-head h1` selector in `material-dashboard.css` drives the
 *    Google Sans display font (font-family: var(--font-display), 48px,
 *    tracking -0.02em). MUI's Typography would layer its own font +
 *    sizing cascade and fight the CSS. Inline `<h1>` keeps the design
 *    system single-sourced from the CSS file.
 *
 * Refs: T5.5, REQ-BD7 (visual parity with template.html).
 */
import type { ReactNode } from 'react'

export interface DashboardPageHeaderProps {
  /** Resolved window range + workout caption (passed verbatim). */
  subtitle: string
  /** Optional eyebrow override; defaults to a generic live-data stamp. */
  eyebrowText?: ReactNode
  /** Slot for the time-filter control rendered on the right side. */
  actions?: ReactNode
}

const DEFAULT_EYEBROW = (
  <>
    <span className="dot" aria-hidden="true" />
    Live data \u00b7 evolution in motion
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
        <h1>BJJ Evolution Dashboard</h1>
        <p className="sub">{subtitle}</p>
      </div>
      {actions ? <div className="filterbar">{actions}</div> : null}
    </header>
  )
}