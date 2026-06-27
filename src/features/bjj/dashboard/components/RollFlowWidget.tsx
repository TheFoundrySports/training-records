/**
 * `RollFlowWidget` — the fifth of 5 dashboard widgets
 * (REQ-BD4 row 3, span-6, full-width).
 *
 * Renders the top-7 position-transition edges (source → target) as a
 * vertical list of horizontal bars. Each row's bar fill is wrapped in
 * `<AnimatedContent>` so the bar fades + slides in on mount (REQ-BD9:
 * React Bits adoption).
 *
 * Visual contract (CSS classes in `material-dashboard.css` lines 274-283):
 *  - `.flow` — flex column wrapping all rows.
 *  - `.flow-row` — CSS grid `120px | 1fr | 120px` (from | bar | to).
 *  - `.flow-from` — English label of the source position.
 *  - `.flow-bar` / `.flow-fill` — 28px progress bar; `.flow-fill`
 *    width = `edge.pct%` (server-normalized: 100 = widest bar in set).
 *  - `.flow-to` — English label of the target position OR `—` when
 *    `edge.to === null` (defensive — the view filters nulls but the
 *    type allows them).
 *  - `.flow-foot` — bottom footer with the total roll count.
 *
 * Position labels:
 *  - Each from/to position key is resolved via `getPositionLabel(key,
 *    'en')` (REQ-PV5). NOT the raw key. This is the first widget in
 *    the dashboard to exercise the position-vocabulary round-trip
 *    (the `useBJJPositions` hook shipped in PR 6a is the consumer
 *    of the same lookup table for form selects in PR 7).
 *
 * Drill-down (REQ-BD6):
 *  - Each row is a `<button>` (consistent with `LastTechniquesWidget`
 *    rows + `TechniqueTypeWidget` legend rows). Click → `useNavigate`
 *    to `/workouts` for MVP. PR 9 polish will add `source_workout_id`
 *    to the `RollFlowEdge` type and route to the actual workout.
 *
 * Why `<button>` (not `<Link>`):
 *  - Rows are line-items inside a list — the button affordance fits.
 *  - The button keeps the existing `:focus-visible` ring from
 *    `material-dashboard.css:124`. `<Link>` would change the markup
 *    and lose the visual focus indicator.
 *  - `useNavigate` (not `navigate()` push) is the codebase-wide
 *    pattern for these dashboard buttons.
 *
 * Empty state:
 *  - When `data.edges` is empty, the list renders with no children.
 *    The parent `DashboardWidgetShell` shows the REQ-BD5 empty copy.
 *
 * Refs: T6b.5, REQ-BD4 (grid spans), REQ-BD6 (drill-down),
 * REQ-PV5 (display labels), REQ-BD9 (React Bits via AnimatedContent).
 */
import { useNavigate } from 'react-router'
import { AnimatedContent } from '@/components/react-bits/AnimatedContent'
import { getPositionLabel } from '../../position-vocabulary'
import type { RollFlowData, RollFlowEdge } from '../types/dashboard.types'

export interface RollFlowWidgetProps {
  /** Top-7 edges + total from the dashboard RPC. */
  data: RollFlowData
}

const TOP_N = 7

/** Render an em-dash for null target positions (defensive — view filters nulls but the type allows them). */
const NULL_TARGET_LABEL = '\u2014'

function FlowRow({ edge }: { edge: RollFlowEdge }) {
  const navigate = useNavigate()
  const fromLabel = getPositionLabel(edge.from, 'en')
  const toLabel =
    edge.to === null ? NULL_TARGET_LABEL : getPositionLabel(edge.to, 'en')

  const handleClick = () => {
    // MVP drill-down: navigate to /workouts. PR 9 polish will thread
    // `source_workout_id` through `RollFlowEdge` so the row can
    // navigate to the actual workout. Until then the workouts list
    // is the reasonable fallback (matches the spec's MVP clause in
    // design.md §6.4: "MVP: render the row as informational only").
    void navigate('/workouts')
  }

  const ariaLabel = `From ${fromLabel} to ${toLabel}, ${edge.count} rolls`

  return (
    <li>
      <button
        type="button"
        className="flow-row"
        onClick={handleClick}
        aria-label={ariaLabel}
      >
        <span className="flow-from">{fromLabel}</span>
        <span className="flow-bar" aria-hidden="true">
          <AnimatedContent trigger>
            <span
              className="flow-fill"
              style={{ width: `${edge.pct}%` }}
            >
              {edge.count}
            </span>
          </AnimatedContent>
        </span>
        <span className="flow-to">{toLabel}</span>
      </button>
    </li>
  )
}

export function RollFlowWidget({ data }: RollFlowWidgetProps) {
  const edges = data.edges.slice(0, TOP_N)
  const total = data.total_rolls

  return (
    <>
      {edges.length > 0 ? (
        <ul className="flow">
          {edges.map((edge, idx) => (
            <FlowRow key={`${edge.from}-${edge.to ?? 'null'}-${idx}`} edge={edge} />
          ))}
        </ul>
      ) : null}
      <div className="flow-foot">
        <span>
          {total} total {total === 1 ? 'transition' : 'transitions'}
        </span>
      </div>
    </>
  )
}