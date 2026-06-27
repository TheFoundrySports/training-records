/**
 * RED tests for `RoleBalanceWidget` — the third of 5 dashboard widgets
 * (REQ-BD4 row 2, span-2).
 *
 * Contract (T6b.1 + T6b.2 + REQ-BD6 + REQ-BD7):
 *  - Renders a 12px-tall stacked horizontal bar (CSS-only, no chart lib)
 *    with one segment per role, each segment's `width` = `segment.pct%`.
 *  - Below the bar, a legend lists every segment with:
 *      `.role-label` (swatch + name) | `.role-value` (pct + count)
 *    and a thin `.role-pct-bar` underneath for visual reinforcement.
 *  - Each segment is colored with the corresponding `--role-*` CSS
 *    variable (no new color tokens — design §6 hard rule).
 *  - **No drill-down**: this widget has no interactive rows. The
 *    legend is informational only (per REQ-BD6 which only lists
 *    drill-downs for LastTechniques, TechniqueType, Outcomes, and
 *    RollFlow — RoleBalance is explicitly NOT in that set).
 *  - When `data.segments` is empty, the widget renders the empty bar
 *    (no segments) and no legend rows without crashing.
 *
 * Role label mapping (inline, English-only per NFR-07):
 *   attacking  -> Attacking  -> var(--role-attack)
 *   defending  -> Defending  -> var(--role-defend)
 *   neutral    -> Neutral    -> var(--role-neutral)
 *
 * Refs: T6b.1, T6b.2, REQ-BD4 (grid spans), REQ-BD5 (empty copy),
 * NFR-07 (English copy).
 */
import { describe, it, expect } from 'vitest'
import { renderWithMuiTheme } from '@/test-utils/renderWithMuiTheme'
import { screen } from '@testing-library/react'
import { RoleBalanceWidget } from '../../components/RoleBalanceWidget'
import type { RoleBalanceData } from '../../types/dashboard.types'

function buildSegments(): RoleBalanceData['segments'] {
  return [
    { role: 'attacking', pct: 60, count: 47 },
    { role: 'defending', pct: 30, count: 23 },
    { role: 'neutral', pct: 10, count: 8 },
  ]
}

describe('RoleBalanceWidget — stacked bar + legend (T6b.1, REQ-BD4 row 2)', () => {
  it('renders one segment per role with width = pct% and the correct role-* color', () => {
    const { container } = renderWithMuiTheme(
      <RoleBalanceWidget data={{ segments: buildSegments(), total_rolls: 78 }} />,
    )
    // The stacked bar is a single .role-stacked wrapper with one
    // <span> child per segment (no chart library).
    const stacked = container.querySelector('.role-stacked')
    expect(stacked).not.toBeNull()
    const segments = stacked?.children ?? []
    expect(segments.length).toBe(3)

    // First segment: attacking 60% -> width 60%, color var(--role-attack).
    expect((segments[0] as HTMLElement)?.style.width).toBe('60%')
    expect((segments[0] as HTMLElement)?.style.background).toBe('var(--role-attack)')
    // Second: defending 30% / var(--role-defend).
    expect((segments[1] as HTMLElement)?.style.width).toBe('30%')
    expect((segments[1] as HTMLElement)?.style.background).toBe('var(--role-defend)')
    // Third: neutral 10% / var(--role-neutral).
    expect((segments[2] as HTMLElement)?.style.width).toBe('10%')
    expect((segments[2] as HTMLElement)?.style.background).toBe('var(--role-neutral)')
  })

  it('renders one legend row per segment with English label, pct, and count', () => {
    renderWithMuiTheme(
      <RoleBalanceWidget data={{ segments: buildSegments(), total_rolls: 78 }} />,
    )
    // Each role gets its English label.
    expect(screen.getByText('Attacking')).toBeInTheDocument()
    expect(screen.getByText('Defending')).toBeInTheDocument()
    expect(screen.getByText('Neutral')).toBeInTheDocument()
    // Pct + count are concatenated in `.role-value` (e.g. "60% · 47").
    expect(screen.getByText(/60%\s*·\s*47/)).toBeInTheDocument()
    expect(screen.getByText(/30%\s*·\s*23/)).toBeInTheDocument()
    expect(screen.getByText(/10%\s*·\s*8/)).toBeInTheDocument()
  })

  it('renders each role swatch with the matching role-* CSS variable', () => {
    const { container } = renderWithMuiTheme(
      <RoleBalanceWidget data={{ segments: buildSegments(), total_rolls: 78 }} />,
    )
    // .role-label .swatch inline style.background must reference the var.
    const swatches = container.querySelectorAll('.role-label .swatch')
    expect(swatches.length).toBe(3)
    expect((swatches[0] as HTMLElement)?.style.background).toBe('var(--role-attack)')
    expect((swatches[1] as HTMLElement)?.style.background).toBe('var(--role-defend)')
    expect((swatches[2] as HTMLElement)?.style.background).toBe('var(--role-neutral)')
  })

  it('has no interactive rows in the legend (no drill-down per REQ-BD6)', () => {
    renderWithMuiTheme(
      <RoleBalanceWidget data={{ segments: buildSegments(), total_rolls: 78 }} />,
    )
    // The legend is a <ul> with <li> children — no buttons, no links,
    // no onClick handlers. REQ-BD6 only authorizes drill-downs on
    // LastTechniques / TechniqueType / Outcomes / RollFlow.
    expect(screen.queryAllByRole('button').length).toBe(0)
    expect(screen.queryAllByRole('link').length).toBe(0)
  })

  it('renders no segments and no legend rows when segments is empty (REQ-BD5)', () => {
    const { container } = renderWithMuiTheme(
      <RoleBalanceWidget data={{ segments: [], total_rolls: 0 }} />,
    )
    const stacked = container.querySelector('.role-stacked')
    expect(stacked?.children.length ?? 0).toBe(0)
    const legendItems = container.querySelectorAll('.role-legend > li')
    expect(legendItems.length).toBe(0)
  })

  it('sums segment pcts to 100% (acceptance for the stacked bar)', () => {
    const { container } = renderWithMuiTheme(
      <RoleBalanceWidget data={{ segments: buildSegments(), total_rolls: 78 }} />,
    )
    const segments = container.querySelector('.role-stacked')?.children ?? []
    const total = Array.from(segments).reduce<number>((sum, seg) => {
      const width = (seg as HTMLElement).style.width
      const pct = parseFloat(width)
      return sum + (Number.isFinite(pct) ? pct : 0)
    }, 0)
    expect(total).toBe(100)
  })
})