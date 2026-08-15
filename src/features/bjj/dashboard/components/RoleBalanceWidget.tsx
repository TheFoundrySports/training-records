/**
 * `RoleBalanceWidget` — the third of 5 dashboard widgets
 * (REQ-BD4 row 2, span-2).
 *
 * Renders the role-balance distribution as a CSS-only stacked horizontal
 * bar (no chart library) with a per-role legend below. The widget is
 * informational only — **no drill-down** (REQ-BD6 only authorizes
 * drill-downs for LastTechniques / TechniqueType / Outcomes /
 * RollFlow).
 *
 * Visual contract (CSS classes in `material-dashboard.css` lines 256-263):
 *  - `.role-stacked` — the 12px-tall horizontal bar; one `<span>` child
 *    per segment, each `width: ${pct}%` and `background: var(--role-X)`.
 *  - `.role-legend` — vertical list of rows, one per segment.
 *  - `.role-row` — grid layout (`1fr | auto`) holding label + value.
 *  - `.role-label` — color swatch + English role name.
 *  - `.role-value` — `pct% · count` (mono font via CSS).
 *  - `.role-pct-bar` / `.role-pct-fill` — thin secondary progress bar
 *    under each row, mirroring the segment fill width for visual
 *    reinforcement.
 *
 * Why CSS-only (no chart lib):
 *  - The 12px-tall horizontal bar is trivial flex; the only requirement
 *    is per-segment width, which is `inline style`.
 *  - Keeps the bundle free of a chart dep (we use a custom SVG donut
 *    in `TechniqueTypeWidget` for the same reason).
 *
 * Empty state:
 *  - When `data.segments` is empty, the stacked bar renders with no
 *    children and the legend is empty. The parent `BJJDashboardPage`
 *    wraps the widget in `DashboardWidgetShell` which renders the
 *    REQ-BD5 empty copy when `data.segments.length === 0`.
 *
 * Refs: T6b.1, REQ-BD4 (grid spans), REQ-BD5 (empty copy),
 * NFR-07 (English copy).
 */
import { ROLE_LABEL, ROLE_VAR } from './RoleBalanceWidget.constants'
import type { RoleBalanceData, RoleBalanceSegment } from '../types/dashboard.types'

export interface RoleBalanceWidgetProps {
  /** Stacked bar segments + total from the dashboard RPC. */
  data: RoleBalanceData
}

function RoleStackedSegment({ segment }: { segment: RoleBalanceSegment }) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: `${segment.pct}%`,
        background: `var(${ROLE_VAR[segment.role]})`,
      }}
    />
  )
}

function RoleLegendRow({ segment }: { segment: RoleBalanceSegment }) {
  const fillVar = `var(${ROLE_VAR[segment.role]})`
  return (
    <li>
      <div className="role-row">
        <span className="role-label">
          <span className="swatch" aria-hidden="true" style={{ background: fillVar }} />
          {ROLE_LABEL[segment.role]}
        </span>
        <span className="role-value num">{segment.pct}%</span>
      </div>
      <div className="role-pct-bar" aria-hidden="true">
        <span
          className="role-pct-fill"
          style={{ width: `${segment.pct}%`, background: fillVar }}
        />
      </div>
    </li>
  )
}

export function RoleBalanceWidget({ data }: RoleBalanceWidgetProps) {
  const segments = data?.segments ?? []

  return (
    <>
      <div
        className="role-stacked"
        role="img"
        aria-label="Role balance stacked bar"
      >
        {segments.map((segment) => (
          <RoleStackedSegment key={segment.role} segment={segment} />
        ))}
      </div>

      {segments.length > 0 ? (
        <ul className="role-legend">
          {segments.map((segment) => (
            <RoleLegendRow key={segment.role} segment={segment} />
          ))}
        </ul>
      ) : null}
    </>
  )
}