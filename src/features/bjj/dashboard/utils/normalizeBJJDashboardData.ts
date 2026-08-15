/**
 * Maps the raw `bjj_dashboard_data` RPC JSON into `BJJDashboardData`.
 *
 * The SQL migration and the widget types drifted during development (the
 * RPC once returned a bare array for `last_techniques` and legacy field
 * names like `name`/`count`/`label`/`n`). Normalizing at the hook boundary
 * keeps widgets simple and prevents white-screen crashes when the payload
 * is partial or from an older migration revision.
 */
import type { BJJPositionKey } from '../../bjj.schema'
import { BJJPositionKeySchema } from '../../bjj.schema'
import type {
  BJJDashboardData,
  DashboardWindow,
  LastTechniqueRow,
  LastTechniquesData,
  OutcomesData,
  OutcomesTile,
  RoleBalanceData,
  RoleBalanceSegment,
  RollFlowData,
  RollFlowEdge,
  TechniqueTypesData,
} from '../types/dashboard.types'
import { composeDashboardSubtitle } from '../copy/dashboard-copy'

const DASHBOARD_WINDOWS = new Set<DashboardWindow>(['7d', '30d', '90d', '10r'])

const ROLE_LABEL_TO_KEY: Record<string, RoleBalanceSegment['role']> = {
  attacking: 'attacking',
  defending: 'defending',
  neutral: 'neutral',
  Attacking: 'attacking',
  Defending: 'defending',
  Neutral: 'neutral',
}

const FLOW_EDGE_COLORS = [
  '#1a73e8',
  '#7c3aed',
  '#188038',
  '#dc2626',
  '#d97706',
  '#0891b2',
  '#5f6368',
] as const

/** Open Design data.json colors keyed by canonical from|to (not display labels). */
const FLOW_EDGE_COLOR_BY_PAIR: Record<string, string> = {
  'standing|closed_guard': '#1a73e8',
  'closed_guard|side_control': '#1a73e8',
  'side_control|back_control': '#7c3aed',
  'back_control|mount': '#188038',
  'closed_guard|open_guard': '#dc2626',
  'half_guard|mount': '#d97706',
  'side_control|mount': '#7c3aed',
}

function flowEdgeColor(
  from: BJJPositionKey,
  to: BJJPositionKey | null,
  index: number,
): string {
  const mapped = to ? FLOW_EDGE_COLOR_BY_PAIR[`${from}|${to}`] : undefined
  return mapped ?? FLOW_EDGE_COLORS[index % FLOW_EDGE_COLORS.length]
}

const OUTCOME_VALUES = new Set<OutcomesTile['outcome']>([
  'submission',
  'position_gain',
  'position_loss',
  'neutral',
])

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }
  return value as Record<string, unknown>
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function normalizeLastTechniqueRow(raw: unknown): LastTechniqueRow | null {
  const row = asRecord(raw)
  if (!row) return null

  const techniqueId = asString(row.technique_id)
  const techniqueName = asString(row.technique_name || row.name)
  const category = asString(row.category)

  if (!techniqueName || !category) return null

  return {
    technique_id: techniqueId,
    technique_name: techniqueName,
    category: category as LastTechniqueRow['category'],
    last_practiced_at: asString(row.last_practiced_at),
    practice_count: asNumber(row.practice_count ?? row.count),
  }
}

function normalizeLastTechniques(raw: unknown): LastTechniquesData {
  if (Array.isArray(raw)) {
    return {
      rows: raw
        .map(normalizeLastTechniqueRow)
        .filter((row): row is LastTechniqueRow => row != null),
    }
  }

  const object = asRecord(raw)
  const items = asArray(object?.rows ?? object?.items)

  return {
    rows: items
      .map(normalizeLastTechniqueRow)
      .filter((row): row is LastTechniqueRow => row != null),
  }
}

function normalizeTechniqueTypes(raw: unknown): TechniqueTypesData {
  const object = asRecord(raw)
  const segments = asArray(object?.segments ?? object?.legend).map((segment) => {
    const row = asRecord(segment)
    return {
      category: asString(row?.category ?? row?.label) as TechniqueTypesData['segments'][number]['category'],
      count: asNumber(row?.count),
      pct: asNumber(row?.pct),
    }
  })

  const insights = asArray(object?.insights ?? object?.insight_rows)
    .map((insight) => {
      const row = asRecord(insight)
      if (!row) return null
      const text = asString(row.text ?? row.body ?? row.title)
      if (!text) return null
      return { text }
    })
    .filter((insight): insight is TechniqueTypesData['insights'][number] => insight != null)

  const total =
    asNumber(object?.total) || segments.reduce((sum, segment) => sum + segment.count, 0)

  return { total, segments, insights }
}

function normalizeRoleBalance(raw: unknown): RoleBalanceData {
  const object = asRecord(raw)
  const segments = asArray(object?.segments ?? object?.legend).map((segment) => {
    const row = asRecord(segment)
    const roleRaw = asString(row?.role ?? row?.label)
    const role = ROLE_LABEL_TO_KEY[roleRaw] ?? 'neutral'

    return {
      role,
      count: asNumber(row?.count ?? row?.event_count),
      pct: asNumber(row?.pct),
    }
  })

  const totalRolls =
    asNumber(object?.total_rolls) ||
    segments.reduce((sum, segment) => sum + segment.count, 0)

  return { segments, total_rolls: totalRolls }
}

function normalizeOutcomes(raw: unknown): OutcomesData {
  const object = asRecord(raw)
  const tiles = asArray(object?.tiles).map((tile) => {
    const row = asRecord(tile)
    const outcomeRaw = asString(row?.outcome ?? row?.label)
    const outcome = OUTCOME_VALUES.has(outcomeRaw as OutcomesTile['outcome'])
      ? (outcomeRaw as OutcomesTile['outcome'])
      : 'neutral'

    return {
      outcome,
      count: asNumber(row?.count ?? row?.n),
      pct: asNumber(row?.pct),
    }
  })

  const totalRolls =
    asNumber(object?.total_rolls) ||
    tiles.reduce((sum, tile) => sum + tile.count, 0)

  return { tiles, total_rolls: totalRolls }
}

function resolvePositionKey(value: unknown): BJJPositionKey | null {
  const key = asString(value)
  if (!key) return null
  const parsed = BJJPositionKeySchema.safeParse(key)
  return parsed.success ? parsed.data : null
}

function normalizeRollFlowEdge(raw: unknown): RollFlowEdge | null {
  const row = asRecord(raw)
  if (!row) return null

  const from = resolvePositionKey(row.from ?? row.position_from)
  if (!from) return null

  const toValue = row.to ?? row.position_to
  const to =
    toValue == null || toValue === ''
      ? null
      : resolvePositionKey(toValue)

  return {
    from,
    to,
    count: asNumber(row.count ?? row.transition_count),
    pct: asNumber(row.pct),
    color: asString(row.color) || undefined,
  }
}

function normalizeRollFlow(raw: unknown, confirmedRolls: number): RollFlowData {
  const object = asRecord(raw)
  const edges = asArray(object?.edges)
    .map(normalizeRollFlowEdge)
    .filter((edge): edge is RollFlowEdge => edge != null)
    .map((edge, index) => ({
      ...edge,
      color: edge.color ?? flowEdgeColor(edge.from, edge.to, index),
    }))

  const edgeSum = edges.reduce((sum, edge) => sum + edge.count, 0)
  const totalTransitions =
    asNumber(object?.total_transitions) || edgeSum || asNumber(object?.total_rolls)

  return {
    edges,
    total_transitions: totalTransitions,
    total_rolls: confirmedRolls,
    top_n: asNumber(object?.top_n, 7),
  }
}

export function normalizeBJJDashboardData(raw: unknown): BJJDashboardData {
  const payload = asRecord(raw) ?? {}

  const windowRaw = asString(payload.window, '30d')
  const window = DASHBOARD_WINDOWS.has(windowRaw as DashboardWindow)
    ? (windowRaw as DashboardWindow)
    : '30d'

  const totalRolls = asNumber(payload.total_rolls)
  const rpcSubtitle = asString(payload.subtitle)

  return {
    window,
    title: asString(payload.title, 'BJJ Evolution Dashboard'),
    subtitle: rpcSubtitle.includes('selected window')
      ? composeDashboardSubtitle(window)
      : rpcSubtitle || composeDashboardSubtitle(window),
    start_date: payload.start_date == null ? null : asString(payload.start_date),
    end_date: payload.end_date == null ? null : asString(payload.end_date),
    total_rolls: totalRolls,
    total_workouts: asNumber(payload.total_workouts),
    total_techniques: asNumber(payload.total_techniques),
    last_techniques: normalizeLastTechniques(payload.last_techniques),
    technique_types: normalizeTechniqueTypes(payload.technique_types),
    role_balance: normalizeRoleBalance(payload.role_balance),
    outcomes: normalizeOutcomes(payload.outcomes),
    roll_flow: normalizeRollFlow(payload.roll_flow, totalRolls),
    generated_at: asString(payload.generated_at, '—'),
    generated_at_tz: asString(payload.generated_at_tz, 'UTC'),
  }
}
