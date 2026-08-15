/**
 * `RollFlowWidget` — sequence timeline from open-design `mat-bjj-app.html`.
 *
 * Six columns (Start → Result) with one lane per top transition. Lanes
 * are derived from RPC from→to edges via `buildRollFlowLanes`.
 */
import { useNavigate } from 'react-router'
import type { DashboardWindow, RollFlowData } from '../types/dashboard.types'
import { WIDGET_COPY } from '../copy/dashboard-copy'
import {
  FLOW_STEPS,
  buildRollFlowLanes,
  composeRollFlowSummary,
  type FlowLane,
  type FlowNode,
  type FlowNodeKind,
} from '../utils/buildRollFlowLanes'

export interface RollFlowWidgetProps {
  data: RollFlowData
  window?: DashboardWindow
}

const CIRCLE_KIND_CLASS: Record<FlowNodeKind, string> = {
  default: '',
  peak: 'peak',
  end: 'end',
  loss: 'loss',
}

const FlowCircle = ({ node }: { node: FlowNode }) => {
  const kindClass = CIRCLE_KIND_CLASS[node.kind]
  return (
    <div className="flow-node">
      <div className={kindClass ? `flow-circle ${kindClass}` : 'flow-circle'}>
        {node.code}
      </div>
      <div className="flow-node-label">{node.label}</div>
    </div>
  )
}

const FlowLaneRow = ({ lane }: { lane: FlowLane }) => {
  const navigate = useNavigate()
  const fromLabel = lane.nodes[0]?.label ?? ''
  const toLabel = lane.nodes[3]?.label ?? '—'

  const handleClick = () => {
    void navigate('/workouts')
  }

  return (
    <button
      type="button"
      className="flow-lane"
      onClick={handleClick}
      aria-label={`From ${fromLabel} to ${toLabel}, ${lane.count} rolls, ${lane.pctOfRolls} percent`}
    >
      <div className="flow-lane-meta">
        <span className="flow-lane-pct">{lane.pctOfRolls}%</span>
        <span className="flow-lane-label">{WIDGET_COPY.rollFlow.ofRolls}</span>
        <div className="flow-lane-bar">
          <div
            className={`flow-lane-fill ${lane.tone}`}
            style={{ width: `${lane.barPct}%` }}
          />
        </div>
      </div>
      <div className={`flow-chain ${lane.tone}`}>
        {lane.nodes.map((node, index) => (
          <FlowCircle key={`${node.code}-${index}`} node={node} />
        ))}
      </div>
    </button>
  )
}

export function RollFlowWidget({ data, window = '30d' }: RollFlowWidgetProps) {
  const lanes = buildRollFlowLanes(data)
  const summary = composeRollFlowSummary(lanes[0], window)
  const summaryTitle = summary?.split(' · ')[0] ?? ''
  const summaryRest = summary?.split(' · ').slice(1).join(' · ') ?? ''

  return (
    <>
      {lanes.length > 0 ? (
        <>
          <div className="flow-head">
            <div />
            <div className="flow-steps">
              {FLOW_STEPS.map((step) => (
                <div
                  key={step}
                  className={step === 'Peak' ? 'flow-step now' : 'flow-step'}
                >
                  {step}
                </div>
              ))}
            </div>
          </div>
          <div className="flow-body">
            {lanes.map((lane) => (
              <FlowLaneRow
                key={`${lane.from}-${lane.to ?? 'null'}-${lane.count}`}
                lane={lane}
              />
            ))}
          </div>
        </>
      ) : null}
      {summary ? (
        <div className="flow-summary">
          <span className="label">{WIDGET_COPY.rollFlow.mostCommonFinish}</span>
          <span>
            <strong>{summaryTitle}</strong>
            {summaryRest ? ` · ${summaryRest}` : null}
          </span>
        </div>
      ) : null}
    </>
  )
}
