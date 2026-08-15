/**
 * Type definitions for the BJJ Evolution Dashboard.
 *
 * These mirror the JSONB shape returned by the `bjj_dashboard_data(p_window)`
 * RPC (PR 1, migration `20260612000004_bjj_dashboard_rpc.sql`) and the 5
 * widget contracts the dashboard renders (REQ-BD3, REQ-BD4).
 *
 * Why a separate types module (not co-located in the hook):
 *  - The hook (`useBJJDashboard`) imports `BJJDashboardData` for its return
 *    type; the page (`BJJDashboardPage`) imports it for prop typing; the
 *    widget tests import it for fixture construction.
 *  - Co-locating would either couple the hook to all consumers or force
 *    a barrel re-export. A dedicated module keeps each importer honest.
 *
 * Why no Zod schema here:
 *  - The RPC is the source of truth; if a future PR tightens the SQL
 *    response, this file gets a single edit and TS catches every consumer.
 *  - The dashboard widget tests already validate the consumer contract
 *    via structural assertions; adding a Zod parse layer would only
 *    duplicate the runtime check the DB already performs.
 *
 * Refs: REQ-BD3 (response shape), REQ-BD4 (5-widget grid spans),
 * design.md §3.4 (RPC contract), PRD §6.11 (BJJDashboardData spec).
 */
import type { BJJCategory, BJJPositionKey } from '../../bjj.schema'

/** The 4 window presets the RPC accepts. Mirrors `BJJDashboardWindow`. */
export type DashboardWindow = '7d' | '30d' | '90d' | '10r'

/** Grid column-span values for the 5 widgets on the desktop layout. */
export type WidgetSpan = 2 | 3 | 4 | 6

// ── Widget data shapes ────────────────────────────────────────────────

/**
 * One row of the "Last Techniques" widget. The RPC returns this ordered
 * by `last_practiced_at` desc, capped at 10 rows.
 */
export interface LastTechniqueRow {
  /** bjj_section_techniques row id; the modal fetches workout history by this. */
  technique_id: string
  /** Resolved technique name (already localized by the RPC). */
  technique_name: string
  /** Category used for the chip color; one of the 7 BJJ categories. */
  category: BJJCategory
  /** ISO timestamp of the most recent practice. */
  last_practiced_at: string
  /** Total confirmed practices of this technique in the window. */
  practice_count: number
}

export interface LastTechniquesData {
  rows: LastTechniqueRow[]
}

export interface TechniqueTypesSegment {
  category: BJJCategory
  /** 0..100, sum of segments <= 100 (the remaining = "untagged"). */
  pct: number
  /** Raw count for the legend label "Nx". */
  count: number
}

export interface TechniqueTypesInsight {
  /** Flat insight sentence (template `insight_rows[].text`). */
  text: string
}

export interface TechniqueTypesData {
  /** Total technique practices in the window (donut center). */
  total: number
  segments: TechniqueTypesSegment[]
  insights: TechniqueTypesInsight[]
}

export interface RoleBalanceSegment {
  role: 'attacking' | 'defending' | 'neutral'
  pct: number
  count: number
}

export interface RoleBalanceData {
  segments: RoleBalanceSegment[]
  /** Total confirmed rolls in the window. */
  total_rolls: number
}

export interface OutcomesTile {
  outcome: 'submission' | 'position_gain' | 'position_loss' | 'neutral'
  count: number
  /** 0..100, derived from `count / total_rolls`. */
  pct: number
}

export interface OutcomesData {
  tiles: OutcomesTile[]
  total_rolls: number
}

/**
 * One edge in the roll-flow widget. `pct` is normalized to the max edge
 * in the set (100 = widest bar) per REQ-BD3 and the `topTransitions` util
 * contract (PR 3, `rollFlow.ts`).
 */
export interface RollFlowEdge {
  /** Position key, resolved to display label via `getPositionLabel` at render time. */
  from: BJJPositionKey
  to: BJJPositionKey | null
  count: number
  /** 0..100, normalized to max in result set. */
  pct: number
  /** Bar fill color (template `edge.color`). */
  color?: string
}

export interface RollFlowData {
  edges: RollFlowEdge[]
  /** Sum of transition counts across edges in the window. */
  total_transitions: number
  /** Confirmed rolls in the window (footer denominator). */
  total_rolls: number
  /** Display limit echoed from RPC (default 7). */
  top_n: number
}

// ── Top-level RPC payload ────────────────────────────────────────────

/**
 * The full JSONB payload returned by `bjj_dashboard_data(p_window)`.
 *
 * 13 top-level fields per REQ-BD3. Optional fields are present when the
 * window has at least one confirmed roll; absent on a brand-new account.
 *
 * Field naming: snake_case to match the SQL JSONB keys exactly (TS does
 * not remap, so the RPC payload and the prop chain stay in lock-step).
 */
export interface BJJDashboardData {
  /** Window the RPC was invoked with; echoes back so the page can render the subtitle. */
  window: DashboardWindow
  /** Page title echoed from RPC (REQ-BD3). */
  title: string
  /** Narrative subtitle for the active window (REQ-BD2 / template.html). */
  subtitle: string
  /** ISO start of the resolved range; null for "10r". */
  start_date: string | null
  /** ISO end of the resolved range (today, UTC midnight); null for "10r". */
  end_date: string | null
  /** Total confirmed rolls in the window. */
  total_rolls: number
  /** Total confirmed-roll workouts in the window (denominator for the subtitle). */
  total_workouts: number
  /** Total confirmed techniques practiced in the window. */
  total_techniques: number
  /** Hero widget data (REQ-BD4 row 1, span-3). */
  last_techniques: LastTechniquesData
  /** Donut widget (REQ-BD4 row 1, span-3, PR 6a). */
  technique_types: TechniqueTypesData
  /** Stacked-bar widget (REQ-BD4 row 2, span-2, PR 6b). */
  role_balance: RoleBalanceData
  /** 2x2 tile widget (REQ-BD4 row 2, span-4, PR 6b). */
  outcomes: OutcomesData
  /** Full-width flow widget (REQ-BD4 row 3, span-6, PR 6b). */
  roll_flow: RollFlowData
  /** RFC-style timestamp the RPC stamped onto the payload. */
  generated_at: string
  /** IANA timezone of the `generated_at` stamp (always 'UTC' in MVP). */
  generated_at_tz: string
}

/** Subtitle string for the page header; reads from the RPC echo. */
export interface DashboardSubtitle {
  /** The resolved range as a human-readable string (e.g. "May 13 - Jun 12"). */
  range: string
  /** Workout-count caption (e.g. "from 14 workouts · 78 confirmed rolls"). */
  caption: string
}