/**
 * RED tests for `TechniqueTypeWidget` — the second of 5 dashboard widgets
 * (REQ-BD4 row 1, span-3).
 *
 * Contract (T6a.1 + T6a.2 + REQ-BD6 + REQ-PV5):
 *  - Renders a custom SVG donut (r=50, no chart library) with one
 *    `<circle>` per segment. The math: `C = 2πr ≈ 314.159`,
 *    `arcLength = (pct / 100) * C`, `offset = -(cumulativePct / 100) * C`.
 *  - The donut's center label shows `totalRolls` (the sum of confirmed
 *    rolls for the selected window) per REQ-BD3.
 *  - The legend on the right shows one row per category, with the
 *    localized label via `categoryLabel(category, 'en')` (REQ-PV5 +
 *    NFR-07 English copy).
 *  - Each segment color is the corresponding CSS variable
 *    `--cat-<category>` (no new color tokens — design §6 hard rule).
 *  - Insight rows render below the donut for `data.insights[].title`
 *    and `data.insights[].body`.
 *  - Clicking a legend row navigates to
 *    `/bjj/blue-belt-progression?category={key}` (REQ-BD6).
 *  - When `data.segments` is empty, the widget still renders the donut
 *    skeleton (zero segments, zero center value) without crashing.
 *
 * Drill-down choice — `useNavigate` (not `<Link>`):
 *  - `useNavigate` is what every other drill-down in this codebase
 *    uses (`WorkoutChip`, `CalendarGrid`, `AIChatPage`, …) so the
 *    visual UX is keyboard-activatable on a `<button>`. `<Link>` would
 *    change the markup from `<button>` to `<a>`, which loses the
 *    `:focus-visible` ring already styled for buttons.
 *  - The legend row is a button (not a link) because the "drill down"
 *    semantic is a nav action, not a content link — keeping markup
 *    consistent with the other dashboard buttons.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderWithMuiTheme } from '@/test-utils/renderWithMuiTheme'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TechniqueTypeWidget } from '../../components/TechniqueTypeWidget'
import type { TechniqueTypesData } from '../../types/dashboard.types'

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

function buildSegments(): TechniqueTypesData['segments'] {
  return [
    { category: 'submission', pct: 40, count: 31 },
    { category: 'guard', pct: 25, count: 19 },
    { category: 'escape', pct: 20, count: 16 },
    { category: 'transition', pct: 15, count: 12 },
  ]
}

function buildInsights(): TechniqueTypesData['insights'] {
  return [
    {
      title: 'Submissions are 40% of your game',
      body: 'Strong submission focus — keep building from the guard.',
    },
  ]
}

describe('TechniqueTypeWidget — custom SVG donut + legend + drill-down (T6a.1, REQ-BD6)', () => {
  it('renders one <circle> per segment with the right stroke-dasharray math', () => {
    const { container } = renderWithMuiTheme(
      <TechniqueTypeWidget data={{ segments: buildSegments(), insights: [] }} totalRolls={78} />,
    )
    // 4 segments → 4 circle elements (the donut-track is also a circle, so
    // we filter to those that have a stroke-dasharray attribute set).
    const circles = Array.from(container.querySelectorAll('circle'))
    const segments = circles.filter((c) => c.getAttribute('stroke-dasharray'))
    expect(segments.length).toBe(4)
    // C = 2πr, r=50 → ~314.159
    const C = 2 * Math.PI * 50
    // First segment (submission 40%): arc = 0.4 * C
    const submissionArc = 0.4 * C
    expect(segments[0]?.getAttribute('stroke-dasharray')).toMatch(/^125/)
    // stroke-dashoffset of the first segment is 0 (it starts at the top).
    expect(segments[0]?.getAttribute('stroke-dashoffset')).toBe('0')
    // Second segment (guard 25%) starts after 40% → offset = -(0.4 * C) = -125.66
    expect(segments[1]?.getAttribute('stroke-dashoffset')).toMatch(/^-125/)
  })

  it('renders the center label with the total roll count', () => {
    const { container } = renderWithMuiTheme(
      <TechniqueTypeWidget data={{ segments: buildSegments(), insights: [] }} totalRolls={78} />,
    )
    const center = container.querySelector('.donut .center')
    expect(center).not.toBeNull()
    expect(center?.querySelector('.n')?.textContent).toBe('78')
    expect(center?.querySelector('.l')?.textContent).toMatch(/total rolls/i)
  })

  it('renders one legend row per segment with the localized label and percentage', () => {
    renderWithMuiTheme(
      <TechniqueTypeWidget data={{ segments: buildSegments(), insights: [] }} totalRolls={78} />,
    )
    // categoryLabel('en') returns: submission=Submissions, guard=Guard,
    // escape=Escapes, transition=Transitions (PR 3 map)
    expect(screen.getByText('Submissions')).toBeInTheDocument()
    expect(screen.getByText('Guard')).toBeInTheDocument()
    expect(screen.getByText('Escapes')).toBeInTheDocument()
    expect(screen.getByText('Transitions')).toBeInTheDocument()
    // 40%, 25%, 20%, 15%
    expect(screen.getByText('40%')).toBeInTheDocument()
    expect(screen.getByText('25%')).toBeInTheDocument()
    expect(screen.getByText('20%')).toBeInTheDocument()
    expect(screen.getByText('15%')).toBeInTheDocument()
  })

  it('colors each legend swatch with the CSS variable --cat-{category}', () => {
    const { container } = renderWithMuiTheme(
      <TechniqueTypeWidget data={{ segments: buildSegments(), insights: [] }} totalRolls={78} />,
    )
    const swatches = container.querySelectorAll('.legend-row .swatch')
    // submission → --cat-submission, guard → --cat-guard, etc.
    // The exact color string is the computed CSS var value, but the inline
    // `style.background` set on the swatch must use `var(--cat-...)`.
    expect((swatches[0] as HTMLElement)?.style.background).toBe('var(--cat-submission)')
    expect((swatches[1] as HTMLElement)?.style.background).toBe('var(--cat-guard)')
    expect((swatches[2] as HTMLElement)?.style.background).toBe('var(--cat-escape)')
    expect((swatches[3] as HTMLElement)?.style.background).toBe('var(--cat-transition)')
  })

  it('renders the insight row(s) when data.insights is non-empty', () => {
    renderWithMuiTheme(
      <TechniqueTypeWidget
        data={{ segments: buildSegments(), insights: buildInsights() }}
        totalRolls={78}
      />,
    )
    expect(screen.getByText(/Submissions are 40%/)).toBeInTheDocument()
    expect(screen.getByText(/Strong submission focus/)).toBeInTheDocument()
  })

  it('clicking a legend row navigates to /bjj/blue-belt-progression?category={key} (REQ-BD6)', async () => {
    const user = userEvent.setup()
    renderWithMuiTheme(
      <TechniqueTypeWidget data={{ segments: buildSegments(), insights: [] }} totalRolls={78} />,
    )

    // Click the Submissions legend row (button role, not link)
    await user.click(screen.getByRole('button', { name: /submissions/i }))

    expect(mockNavigate).toHaveBeenCalledTimes(1)
    expect(mockNavigate).toHaveBeenCalledWith('/bjj/blue-belt-progression?category=submission')
  })

  it('clicking the Guard legend row navigates with category=guard', async () => {
    const user = userEvent.setup()
    renderWithMuiTheme(
      <TechniqueTypeWidget data={{ segments: buildSegments(), insights: [] }} totalRolls={78} />,
    )

    await user.click(screen.getByRole('button', { name: /^guard/i }))

    expect(mockNavigate).toHaveBeenCalledWith('/bjj/blue-belt-progression?category=guard')
  })

  it('renders each legend row as a button (keyboard-focusable, no <a> tag)', () => {
    const { container } = renderWithMuiTheme(
      <TechniqueTypeWidget data={{ segments: buildSegments(), insights: [] }} totalRolls={78} />,
    )
    const rows = container.querySelectorAll('.legend-row')
    for (const row of rows) {
      expect(row.tagName).toBe('BUTTON')
    }
  })

  it('does not crash on empty segments (renders the donut skeleton)', () => {
    const { container } = renderWithMuiTheme(
      <TechniqueTypeWidget data={{ segments: [], insights: [] }} totalRolls={0} />,
    )
    const center = container.querySelector('.donut .center')
    expect(center?.querySelector('.n')?.textContent).toBe('0')
    // No segment circles
    const segments = container.querySelectorAll('circle[stroke-dasharray]')
    expect(segments.length).toBe(0)
    // No legend rows
    expect(container.querySelectorAll('.legend-row').length).toBe(0)
  })

  it('uses the legend row as the accessible label source for screen readers', () => {
    renderWithMuiTheme(
      <TechniqueTypeWidget data={{ segments: buildSegments(), insights: [] }} totalRolls={78} />,
    )
    // Each row has an accessible name that includes the category label + pct.
    const submission = screen.getByRole('button', { name: /submissions,?\s+40%/i })
    expect(submission).toBeInTheDocument()
    // The label includes the count too.
    const labeled = within(submission).getByText(/40%/)
    expect(labeled).toBeInTheDocument()
  })
})
