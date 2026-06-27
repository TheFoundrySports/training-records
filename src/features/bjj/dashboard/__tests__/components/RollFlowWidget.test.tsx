/**
 * RED tests for `RollFlowWidget` — the fifth of 5 dashboard widgets
 * (REQ-BD4 row 3, span-6, full-width).
 *
 * Contract (T6b.5 + T6b.6 + REQ-BD6 + REQ-PV5 + REQ-BD9):
 *  - Renders up to 7 edges (top-7 by `count` desc — the RPC orders them).
 *  - Each row is a CSS-grid 3-column layout (120px | 1fr | 120px) with:
 *      `.flow-from` — English label of the `from` position
 *      `.flow-bar`  — 28px progress bar; `.flow-fill` width = edge.pct%
 *                     (server-normalized to max in set; 100 = widest)
 *      `.flow-to`   — English label of the `to` position (or `—` when
 *                     `edge.to === null`)
 *    The count is rendered inside the bar (right-aligned mono) per CSS.
 *  - Each row is wrapped in `<AnimatedContent trigger>` so the bar
 *    fades + slides in on mount (REQ-BD9: ≥2 React Bits adopted).
 *  - Position labels are resolved via `getPositionLabel(key, 'en')`
 *    (REQ-PV5). NOT the raw key.
 *  - Clicking a row calls `useNavigate('/workouts')` for MVP. PR 9
 *    polish will thread `source_workout_id` through the edge type so
 *    the row can navigate to the actual workout.
 *  - The footer `.flow-foot` shows the total_rolls count.
 *  - When `data.edges` is empty, the widget renders the empty bar
 *    (no rows) without crashing.
 *
 * Refs: T6b.5, T6b.6, REQ-BD4 (grid spans), REQ-BD6 (drill-down),
 * REQ-PV5 (display labels), REQ-BD9 (React Bits).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderWithMuiTheme } from '@/test-utils/renderWithMuiTheme'
import { within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { getPositionLabel } from '../../../position-vocabulary'
import { RollFlowWidget } from '../../components/RollFlowWidget'
import type { RollFlowEdge } from '../../types/dashboard.types'

const mockNavigate = vi.fn()

vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>()
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

beforeEach(() => {
  mockNavigate.mockClear()
})

function buildEdges(): RollFlowEdge[] {
  // Top 7 (or fewer) edges sorted by count desc — matches what the
  // RPC returns from the bjj_dashboard_position_transitions view.
  return [
    { from: 'closed_guard', to: 'mount', count: 10, pct: 100 },
    { from: 'half_guard', to: 'side_control', count: 7, pct: 70 },
    { from: 'open_guard', to: 'back_control', count: 6, pct: 60 },
    { from: 'standing', to: 'turtle', count: 5, pct: 50 },
    { from: 'mount', to: 'back_control', count: 4, pct: 40 },
    { from: 'side_control', to: null, count: 3, pct: 30 },
    { from: 'turtle', to: 'knee_on_belly', count: 2, pct: 20 },
  ]
}

describe('RollFlowWidget — top-7 flow rows with animated bars (T6b.5, REQ-BD6, REQ-PV5)', () => {
  it('renders one .flow-row per edge with the resolved position labels', () => {
    renderWithMuiTheme(
      <RollFlowWidget data={{ edges: buildEdges(), total_rolls: 37 }} />,
    )
    // 7 rows total (one per edge)
    const rows = document.querySelectorAll('.flow-row')
    expect(rows.length).toBe(7)
    // First row: from = closed_guard → "Closed guard", to = mount → "Mount".
    // Use getPositionLabel to compute the expected display text (real
    // helper; same module the widget imports).
    expect(
      within(rows[0] as HTMLElement).getByText(getPositionLabel('closed_guard', 'en')),
    ).toBeInTheDocument()
    expect(
      within(rows[0] as HTMLElement).getByText(getPositionLabel('mount', 'en')),
    ).toBeInTheDocument()
  })

  it('sets the bar fill width to edge.pct% (server-normalized to max in set)', () => {
    const { container } = renderWithMuiTheme(
      <RollFlowWidget data={{ edges: buildEdges(), total_rolls: 37 }} />,
    )
    const fills = container.querySelectorAll('.flow-row .flow-fill')
    expect(fills.length).toBe(7)
    // 100% (count 10), 70% (count 7), 60%, 50%, 40%, 30%, 20%.
    expect((fills[0] as HTMLElement)?.style.width).toBe('100%')
    expect((fills[1] as HTMLElement)?.style.width).toBe('70%')
    expect((fills[2] as HTMLElement)?.style.width).toBe('60%')
    expect((fills[3] as HTMLElement)?.style.width).toBe('50%')
    expect((fills[4] as HTMLElement)?.style.width).toBe('40%')
    expect((fills[5] as HTMLElement)?.style.width).toBe('30%')
    expect((fills[6] as HTMLElement)?.style.width).toBe('20%')
  })

  it('renders each row as a button (clickable drill-down — REQ-BD6 pattern)', () => {
    const { container } = renderWithMuiTheme(
      <RollFlowWidget data={{ edges: buildEdges(), total_rolls: 37 }} />,
    )
    const rows = container.querySelectorAll('.flow-row')
    // Each row is a <button> inside an <li> (consistent with the
    // other dashboard drill-downs: LastTechniques + TechniqueType
    // legend rows are <button>; the ul > li > button pattern).
    for (const row of rows) {
      expect(row.tagName).toBe('BUTTON')
    }
    expect(rows.length).toBe(7)
  })

  it('clicking a row navigates to /workouts (MVP drill-down; PR 9 polish for source_workout_id)', async () => {
    const user = userEvent.setup()
    renderWithMuiTheme(
      <RollFlowWidget data={{ edges: buildEdges(), total_rolls: 37 }} />,
    )
    // The first row's accessible name pattern: "from {From} to {To}, {count} rolls".
    // We don't assert the exact aria-label (implementation detail); we
    // click the first row and verify the navigation was triggered.
    const firstRow = document.querySelector('.flow-row') as HTMLElement
    await user.click(firstRow)
    expect(mockNavigate).toHaveBeenCalledTimes(1)
    expect(mockNavigate).toHaveBeenCalledWith('/workouts')
  })

  it('renders a dash when edge.to is null (REQ-RE4: views exclude null, but the type allows it)', () => {
    const { container } = renderWithMuiTheme(
      <RollFlowWidget data={{ edges: buildEdges(), total_rolls: 37 }} />,
    )
    // 6th row (index 5) is the edge with `to: null` — side_control → null.
    // The .flow-to span renders the literal `—` (em-dash) instead of
    // any position label, so the position label for the to side is
    // NOT in this row.
    const rows = container.querySelectorAll('.flow-row')
    const sixthRow = rows[5] as HTMLElement
    expect(within(sixthRow).queryByText(getPositionLabel('mount', 'en'))).toBeNull()
    expect(within(sixthRow).getByText('—')).toBeInTheDocument()
  })

  it('renders the footer with the total roll count (REQ-BD5 footer copy)', () => {
    renderWithMuiTheme(
      <RollFlowWidget data={{ edges: buildEdges(), total_rolls: 37 }} />,
    )
    const foot = document.querySelector('.flow-foot')
    expect(foot).not.toBeNull()
    // The footer includes "37 total transitions" or equivalent — we
    // assert on the numeric 37 presence inside the footer.
    expect(within(foot as HTMLElement).getByText(/37/)).toBeInTheDocument()
  })

  it('renders no rows when edges is empty (REQ-BD5 empty-state contract)', () => {
    const { container } = renderWithMuiTheme(
      <RollFlowWidget data={{ edges: [], total_rolls: 0 }} />,
    )
    expect(container.querySelectorAll('.flow-row').length).toBe(0)
  })
})