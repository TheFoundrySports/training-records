/**
 * `DashboardFooter` \u2014 the muted bottom row of the dashboard.
 *
 * Layout-only: the `.foot` class (material-dashboard.css line 285) drives
 * the border-top, padding, and justify-between layout. The right side
 * holds the `generatedAt` timestamp the RPC echoed back; the left side
 * holds a static "scope" caption so the row is never a single line of
 * bare text.
 *
 * Why no MUI <Typography>:
 *  - The `.foot` class sets `font-size: 12px; color: var(--muted)` from
 *    the CSS file. Using MUI's `<Typography variant="caption">` would
 *    layer MUI's typography cascade on top of the design-token cascade
 *    and risk drift on theme swaps.
 *
 * Refs: T5.9, REQ-BD10 (English copy + RFC-style timestamps).
 */
export interface DashboardFooterProps {
  /**
   * The timestamp the RPC stamped onto the payload
   * (`bjj_dashboard_data.generated_at`). Rendered verbatim.
   */
  generatedAt: string
  /**
   * Optional scope caption override. Defaults to a generic
   * "Live data \u00b7 scoped to your confirmed rolls".
   */
  scopeCaption?: string
}

const DEFAULT_SCOPE = 'Live data \u00b7 scoped to your confirmed rolls'

export function DashboardFooter({ generatedAt, scopeCaption }: DashboardFooterProps) {
  return (
    <footer className="foot">
      <span className="stamp">
        <span className="dot" aria-hidden="true" />
        {scopeCaption ?? DEFAULT_SCOPE}
      </span>
      <span>
        Last updated <strong>{generatedAt}</strong>
      </span>
    </footer>
  )
}