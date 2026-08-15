/**
 * Maps RPC `roll_flow.edges` (from → to counts) into the 6-stage sequence
 * lanes from open-design `mat-bjj-app.html` (Flujo de rollos).
 *
 * Each confirmed roll is one from/to pair, so scramble / sweep / finish
 * nodes are inferred from the positions — not extra stored events.
 */
import type { BJJPositionKey } from '../../bjj.schema'
import { getPositionLabel } from '../../position-vocabulary'
import type { DashboardWindow, RollFlowData, RollFlowEdge } from '../types/dashboard.types'

export const FLOW_LANE_LIMIT = 5

export const FLOW_STEPS = [
  'Start',
  'Scramble',
  'Sweep / pass',
  'Peak',
  'Finish',
  'Result',
] as const

export type FlowNodeKind = 'default' | 'peak' | 'end' | 'loss'
export type FlowLaneTone = 'win' | 'loss' | 'mixed'

export interface FlowNode {
  code: string
  label: string
  kind: FlowNodeKind
}

export interface FlowLane {
  pctOfRolls: number
  barPct: number
  tone: FlowLaneTone
  nodes: FlowNode[]
  from: BJJPositionKey
  to: BJJPositionKey | null
  count: number
}

const POSITION_CODE: Record<BJJPositionKey, string> = {
  standing: 'ST',
  closed_guard: 'CG',
  open_guard: 'OP',
  half_guard: 'HG',
  side_control: 'SC',
  mount: 'MT',
  back_control: 'BC',
  turtle: 'TU',
  knee_on_belly: 'KB',
  leg_entanglement: 'LE',
  other: 'OT',
}

const TOP_CONTROL = new Set<BJJPositionKey>([
  'side_control',
  'mount',
  'back_control',
  'knee_on_belly',
])

const GUARD = new Set<BJJPositionKey>([
  'closed_guard',
  'open_guard',
  'half_guard',
])

const WINDOW_TAG: Record<DashboardWindow, (n: number) => string> = {
  '7d': (n) => `7 días · ${n} rollos`,
  '30d': (n) => `30 días · ${n} rollos`,
  '90d': (n) => `90 días · ${n} rollos`,
  '10r': () => 'últimos 10 rollos',
}

const WINDOW_PHRASE: Record<DashboardWindow, string> = {
  '7d': 'los últimos 7 días',
  '30d': 'los últimos 30 días',
  '90d': 'los últimos 90 días',
  '10r': 'los últimos 10 rollos',
}

const positionNode = (key: BJJPositionKey, kind: FlowNodeKind = 'default'): FlowNode => ({
  code: POSITION_CODE[key],
  label: getPositionLabel(key, 'en'),
  kind,
})

const inferScramble = (from: BJJPositionKey): FlowNode => {
  if (from === 'standing') return { code: 'SC', label: 'Scramble', kind: 'default' }
  if (from === 'closed_guard') return { code: 'HS', label: 'Hip bump', kind: 'default' }
  if (from === 'half_guard') return { code: 'FS', label: 'Flower sweep', kind: 'default' }
  if (from === 'open_guard') return { code: 'SC', label: 'Scramble', kind: 'default' }
  if (from === 'side_control') return { code: 'FR', label: 'Frame · shrimp', kind: 'default' }
  if (from === 'mount' || from === 'back_control') {
    return { code: 'PR', label: 'Pressure', kind: 'default' }
  }
  return { code: 'TR', label: 'Transition', kind: 'default' }
}

const inferSweepPass = (from: BJJPositionKey, to: BJJPositionKey | null): FlowNode => {
  if (to && GUARD.has(from) && TOP_CONTROL.has(to)) {
    return from === 'half_guard'
      ? { code: 'SW', label: 'Sweep', kind: 'default' }
      : { code: 'PA', label: 'Pass attempt', kind: 'default' }
  }
  if (from === 'standing' && to && GUARD.has(to)) {
    return { code: 'PL', label: 'Pull guard', kind: 'default' }
  }
  if (from === 'side_control' && (to === 'mount' || to === 'back_control')) {
    return { code: 'BT', label: 'Back take', kind: 'default' }
  }
  if (to) return positionNode(to)
  return { code: 'MV', label: 'Advance', kind: 'default' }
}

const inferFinishAndResult = (
  to: BJJPositionKey | null,
): { finish: FlowNode; result: FlowNode; tone: FlowLaneTone } => {
  if (to === 'mount' || to === 'back_control') {
    return {
      finish: { code: 'SUB', label: 'Finish', kind: 'peak' },
      result: { code: 'W', label: 'Tap · win', kind: 'end' },
      tone: 'win',
    }
  }
  if (to && TOP_CONTROL.has(to)) {
    return {
      finish: { code: 'ADV', label: 'Advance', kind: 'end' },
      result: { code: 'W', label: 'Tap · win', kind: 'end' },
      tone: 'win',
    }
  }
  return {
    finish: { code: 'RST', label: 'Reset', kind: 'end' },
    result: { code: '—', label: 'No finish', kind: 'end' },
    tone: 'mixed',
  }
}

const edgeToLane = (edge: RollFlowEdge, totalRolls: number): FlowLane => {
  const { finish, result, tone } = inferFinishAndResult(edge.to)
  const peak: FlowNode = edge.to
    ? positionNode(edge.to, 'peak')
    : { code: '—', label: '—', kind: 'end' }

  const pctOfRolls =
    totalRolls > 0 ? Math.round((100 * edge.count) / totalRolls) : 0

  return {
    pctOfRolls,
    barPct: edge.pct,
    tone,
    nodes: [
      positionNode(edge.from),
      inferScramble(edge.from),
      inferSweepPass(edge.from, edge.to),
      peak,
      finish,
      result,
    ],
    from: edge.from,
    to: edge.to,
    count: edge.count,
  }
}

export const buildRollFlowLanes = (data: RollFlowData): FlowLane[] => {
  const edges = (data.edges ?? []).slice(0, FLOW_LANE_LIMIT)
  return edges.map((edge) => edgeToLane(edge, data.total_rolls))
}

export const composeRollFlowTag = (
  window: DashboardWindow,
  totalRolls: number,
): string => WINDOW_TAG[window](totalRolls)

export const composeRollFlowSummary = (
  lane: FlowLane | undefined,
  window: DashboardWindow,
): string | null => {
  if (!lane) return null
  const start = getPositionLabel(lane.from, 'en')
  const peak = lane.to ? getPositionLabel(lane.to, 'en') : '—'
  return `${peak} desde ${start} · ${lane.pctOfRolls}% de los rollos en ${WINDOW_PHRASE[window]} · tu secuencia de finalización más fuerte`
}
