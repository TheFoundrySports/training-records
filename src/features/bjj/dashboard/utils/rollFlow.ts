/**
 * Pure helper: `topTransitions` reduces a list of `Transition` rows into
 * the top-N edges with `pct` normalized to the max edge in the set.
 *
 * The RPC returns `roll_flow.edges[]` already pre-normalized, so this
 * helper is for the client-side optimistic path (and the unit tests
 * that lock the normalization contract).
 *
 * PRD \u00a76.11: `pct` is "relative to max edge in set (100 = widest bar)".
 * This is NOT a percentage of total \u2014 it scales bar widths so the most
 * common transition is full-width.
 *
 * Refs: REQ-BD3 (roll_flow shape), design \u00a73.4.
 */

export interface Transition {
  from: string
  to: string
  count: number
}

export interface RollFlowEdge extends Transition {
  /** 0..100, normalized to the max edge in the result set (100 = widest). */
  pct: number
}

/**
 * Reduce a list of transitions to the top-N edges with normalized pct.
 *
 * - Empty input returns `[]` (no crash).
 * - Single edge returns `[edge, pct=100]`.
 * - `pct` is rounded to the nearest integer (the UI uses a CSS `width: N%`,
 *   no decimals needed).
 * - `count` is preserved on each edge so the widget can render the raw
 *   "Nx" label inside the bar.
 */
export function topTransitions(transitions: Transition[], topN: number): RollFlowEdge[] {
  if (transitions.length === 0) return []

  // Sort by count desc, then by `from` asc for a stable order when counts tie.
  const sorted = [...transitions].sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count
    return a.from.localeCompare(b.from)
  })

  const sliced = sorted.slice(0, Math.max(0, topN))
  const maxCount = sliced[0]?.count ?? 0

  if (maxCount === 0) {
    // Defensive: if every edge has count=0, return the slice as-is with pct=0.
    return sliced.map((t) => ({ from: t.from, to: t.to, count: t.count, pct: 0 }))
  }

  return sliced.map((t) => ({
    from: t.from,
    to: t.to,
    count: t.count,
    pct: Math.round((t.count / maxCount) * 100),
  }))
}
