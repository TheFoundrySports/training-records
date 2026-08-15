/**
 * `DashboardFooter` — muted bottom row matching open-design `template.html`.
 */
import { DASHBOARD_FOOTER_RIGHT } from '../copy/dashboard-copy'

export interface DashboardFooterProps {
  /** RFC-style timestamp from the RPC (`generated_at`). */
  generatedAt: string
}

export function DashboardFooter({ generatedAt }: DashboardFooterProps) {
  return (
    <footer className="foot">
      <div className="stamp">
        <span className="dot" aria-hidden="true" />
        Live data · last updated <span className="num">{generatedAt}</span>
      </div>
      <div>{DASHBOARD_FOOTER_RIGHT}</div>
    </footer>
  )
}
