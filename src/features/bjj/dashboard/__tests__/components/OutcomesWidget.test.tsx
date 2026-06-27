/**
 * RED tests for `OutcomesWidget` — the fourth of 5 dashboard widgets
 * (REQ-BD4 row 2, span-4).
 *
 * Contract (T6b.3 + T6b.4 + REQ-BD6 + REQ-BD9):
 *  - Renders a 2×2 grid of tiles (one per outcome type).
 *  - Each tile renders:
 *      `.label`   — color swatch + MUI icon + English outcome label
 *      `.value`   — the absolute count (big display font)
 *      `.pct-bar` — a thin secondary progress bar
 *      `.n`       — the percentage copy
 *  - Each tile's color comes from the matching `--outcome-*` CSS
 *    variable (no new color tokens — design §6 hard rule).
 *  - Each tile is a clickable `<Link>` (`<a>`) that navigates to
 *    `/workouts?outcome={key}` (REQ-BD6). The drill-down uses
 *    `react-router`'s `<Link>` (not `useNavigate`) because the tile
 *    is a full-area clickable card — the anchor semantic is the
 *    correct affordance (vs. the button + useNavigate pattern used
 *    in `TechniqueTypeWidget` legend rows).
 *  - When `data.tiles` is empty, the widget renders no tiles without
 *    crashing. The parent `DashboardWidgetShell` shows the REQ-BD5
 *    empty copy in that case (its `isEmpty()` recognizes `[]`).
 *
 * Outcome label + icon + CSS variable mapping:
 *   submission     -> "Submission"     -> SportsMartialArts -> --outcome-sub
 *   position_gain  -> "Position Gain"  -> TrendingUp        -> --outcome-gain
 *   position_loss  -> "Position Loss"  -> TrendingDown      -> --outcome-loss
 *   neutral        -> "Neutral"        -> HorizontalRule    -> --outcome-neutral
 *
 * Refs: T6b.3, T6b.4, REQ-BD4 (grid spans), REQ-BD6 (drill-down).
 */
import { describe, it, expect } from 'vitest'
import { renderWithMuiTheme } from '@/test-utils/renderWithMuiTheme'
import { MemoryRouter } from 'react-router'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { OutcomesWidget } from '../../components/OutcomesWidget'
import type { OutcomesData } from '../../types/dashboard.types'

/**
 * The widget uses `<Link>` (an anchor) for drill-down, so the test
 * render needs a Router context. `renderWithMuiTheme` does not
 * install one (it intentionally stays Router-free so widget tests
 * that don't need navigation can use it). We wrap with
 * `MemoryRouter` here only.
 */
function renderWithRouter(ui: React.ReactElement) {
  return renderWithMuiTheme(<MemoryRouter>{ui}</MemoryRouter>)
}

function buildTiles(): OutcomesData['tiles'] {
  return [
    { outcome: 'submission', count: 12, pct: 20 },
    { outcome: 'position_gain', count: 22, pct: 37 },
    { outcome: 'position_loss', count: 18, pct: 30 },
    { outcome: 'neutral', count: 8, pct: 13 },
  ]
}

describe('OutcomesWidget — 2x2 tile grid + drill-down (T6b.3, REQ-BD6)', () => {
  it('renders exactly 4 tiles, one per outcome type', () => {
    const { container } = renderWithRouter(
      <OutcomesWidget data={{ tiles: buildTiles(), total_rolls: 60 }} />,
    )
    const grid = container.querySelector('.outcome-grid')
    expect(grid).not.toBeNull()
    const tiles = container.querySelectorAll('.outcome-tile')
    expect(tiles.length).toBe(4)
  })

  it('renders each tile as an accessible link with the outcome label, count, and pct', () => {
    renderWithRouter(
      <OutcomesWidget data={{ tiles: buildTiles(), total_rolls: 60 }} />,
    )
    // Tiles are <a> elements (react-router <Link>) — queryable by role 'link'.
    // Accessible name pattern: "{Label}, {count} rolls, {pct}%".
    expect(
      screen.getByRole('link', { name: /submission,\s*12 rolls,\s*20%/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /position gain,\s*22 rolls,\s*37%/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /position loss,\s*18 rolls,\s*30%/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /neutral,\s*8 rolls,\s*13%/i }),
    ).toBeInTheDocument()
  })

  it('renders each tile label with the matching --outcome-* CSS variable on the swatch', () => {
    const { container } = renderWithRouter(
      <OutcomesWidget data={{ tiles: buildTiles(), total_rolls: 60 }} />,
    )
    const swatches = container.querySelectorAll('.outcome-tile .label .swatch')
    expect(swatches.length).toBe(4)
    expect((swatches[0] as HTMLElement)?.style.background).toBe('var(--outcome-sub)')
    expect((swatches[1] as HTMLElement)?.style.background).toBe('var(--outcome-gain)')
    expect((swatches[2] as HTMLElement)?.style.background).toBe('var(--outcome-loss)')
    expect((swatches[3] as HTMLElement)?.style.background).toBe('var(--outcome-neutral)')
  })

  it('renders each tile pct-fill with width = pct% and matching --outcome-* color', () => {
    const { container } = renderWithRouter(
      <OutcomesWidget data={{ tiles: buildTiles(), total_rolls: 60 }} />,
    )
    const fills = container.querySelectorAll('.outcome-tile .pct-fill')
    expect(fills.length).toBe(4)
    expect((fills[0] as HTMLElement)?.style.width).toBe('20%')
    expect((fills[0] as HTMLElement)?.style.background).toBe('var(--outcome-sub)')
    expect((fills[1] as HTMLElement)?.style.width).toBe('37%')
    expect((fills[1] as HTMLElement)?.style.background).toBe('var(--outcome-gain)')
    expect((fills[2] as HTMLElement)?.style.width).toBe('30%')
    expect((fills[2] as HTMLElement)?.style.background).toBe('var(--outcome-loss)')
    expect((fills[3] as HTMLElement)?.style.width).toBe('13%')
    expect((fills[3] as HTMLElement)?.style.background).toBe('var(--outcome-neutral)')
  })

  it('clicking a tile navigates to /workouts?outcome={key} (REQ-BD6 drill-down)', async () => {
    const user = userEvent.setup()
    renderWithRouter(
      <OutcomesWidget data={{ tiles: buildTiles(), total_rolls: 60 }} />,
    )
    // Click the Submission tile.
    await user.click(screen.getByRole('link', { name: /submission,/i }))
    // Anchor href is the navigation target — react-router's <Link>
    // renders a real <a href="/workouts?outcome=submission">.
    const submissionLink = screen.getByRole('link', { name: /submission,/i })
    expect(submissionLink.getAttribute('href')).toBe('/workouts?outcome=submission')
  })

  it('renders no tiles when tiles is empty (REQ-BD5 empty-state contract)', () => {
    const { container } = renderWithRouter(
      <OutcomesWidget data={{ tiles: [], total_rolls: 0 }} />,
    )
    expect(container.querySelectorAll('.outcome-tile').length).toBe(0)
  })
})