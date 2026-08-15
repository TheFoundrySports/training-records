/**
 * `OutcomesWidget` — the fourth of 5 dashboard widgets
 * (REQ-BD4 row 2, span-4).
 *
 * Renders the outcome distribution as a 2×2 grid of MUI icon + count
 * tiles. Each tile is a full-area clickable card that navigates to
 * the workouts list filtered by outcome (REQ-BD6).
 *
 * Visual contract (CSS classes in `material-dashboard.css` lines 265-272):
 *  - `.outcome-grid` — `display: grid; grid-template-columns: repeat(2, 1fr)`.
 *  - `.outcome-tile` — flex column with label / value / pct-bar / n.
 *  - `.label` — color swatch + MUI icon + uppercase English label.
 *  - `.value` — big display-font count (the absolute number of rolls).
 *  - `.pct-bar` / `.pct-fill` — thin secondary progress bar.
 *  - `.n` — percentage copy in muted small text.
 *
 * Drill-down (REQ-BD6):
 *  - Each tile is a `react-router` `<Link>` (renders as `<a>`). The
 *    `to` prop is `/workouts?outcome={key}` (MVP+1 — the workouts list
 *    will read the query and filter; PR 9 polish wires the actual
 *    filter).
 *  - `<Link>` (anchor) is the right semantic for a full-area
 *    clickable card. The other drill-downs in this dashboard
 *    (`TechniqueTypeWidget` legend rows, `RollFlowWidget` rows) use
 *    `useNavigate` + `<button>` because their interactive surface
 *    is a single row inside a list — the button affordance fits the
 *    list-row pattern.
 *
 * Color tokens:
 *  - Each tile uses `var(--outcome-{sub|gain|loss|neutral})` for the
 *    swatch + icon tint + pct-fill. No new tokens (design §6 hard
 *    rule).
 *
 * Empty state:
 *  - When `data.tiles` is empty, the grid renders with no children.
 *    The parent `DashboardWidgetShell` shows the REQ-BD5 empty copy
 *    via its `isEmpty(data)` check (it recognizes `[]`).
 *
 * Refs: T6b.3, REQ-BD4 (grid spans), REQ-BD6 (drill-down).
 */
import { Link } from 'react-router'
import { OUTCOME_LABEL, OUTCOME_VAR } from './OutcomesWidget.constants'
import type { OutcomesData, OutcomesTile } from '../types/dashboard.types'

export interface OutcomesWidgetProps {
  /** 2×2 grid tiles + total rolls from the dashboard RPC. */
  data: OutcomesData
}

function OutcomeTileLink({ tile }: { tile: OutcomesTile }) {
  const colorVar = `var(${OUTCOME_VAR[tile.outcome]})`
  return (
    <Link
      to={`/workouts?outcome=${tile.outcome}`}
      className="outcome-tile"
      style={{ background: `color-mix(in oklab, ${colorVar} 8%, var(--surface))` }}
      aria-label={`${OUTCOME_LABEL[tile.outcome]}, ${tile.count} rolls, ${tile.pct}%`}
    >
      <div className="label">
        <span className="swatch" aria-hidden="true" style={{ background: colorVar }} />
        <span>{OUTCOME_LABEL[tile.outcome]}</span>
      </div>
      <div className="value num">{tile.pct}%</div>
      <div className="pct-bar" aria-hidden="true">
        <span
          className="pct-fill"
          style={{ width: `${tile.pct}%`, background: colorVar }}
        />
      </div>
      <div className="n num">
        {tile.count} {tile.count === 1 ? 'roll' : 'rolls'}
      </div>
    </Link>
  )
}

export function OutcomesWidget({ data }: OutcomesWidgetProps) {
  const tiles = data?.tiles ?? []
  return (
    <div className="outcome-grid">
      {tiles.map((tile) => (
        <OutcomeTileLink key={tile.outcome} tile={tile} />
      ))}
    </div>
  )
}