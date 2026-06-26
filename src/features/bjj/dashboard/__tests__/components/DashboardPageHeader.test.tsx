/**
 * RED tests for `DashboardPageHeader`.
 *
 * Contract (T5.5 + REQ-BD7):
 *  - Renders the page title ("BJJ Evolution Dashboard" or similar).
 *  - Renders the eyebrow line ("Live data \u00b7 last updated {stamp}" or a
 *    generic eyebrow text \u2014 exact copy is locked by the visual-parity
 *    review on PR 5/6b).
 *  - Renders the subtitle prop verbatim (the resolved window range
 *    "May 13 \u2013 Jun 12" or "Last 10 workouts with confirmed rolls").
 *  - Renders inside an element with the `.page-head` class (the CSS port
 *    in `material-dashboard.css` targets this class for layout).
 *
 * Why class assertions are acceptable here:
 *  - The CSS isolation rule says `src/features/bjj/dashboard/` is a
 *    Tailwind-utility-free zone; components own their layout via the
 *    typed CSS classes in `material-dashboard.css`.
 *  - The header needs the `.page-head` class to pick up the page-head
 *    flex layout (justify-between, gap, wrap on mobile). This is a
 *    PUBLIC CONTRACT between the component and the CSS \u2014 not a styling
 *    detail.
 */
import { describe, it, expect } from 'vitest'
import { renderWithMuiTheme } from '@/test-utils/renderWithMuiTheme'
import { screen } from '@testing-library/react'
import { DashboardPageHeader } from '../../components/DashboardPageHeader'

describe('DashboardPageHeader \u2014 page title + subtitle (T5.5)', () => {
  it('renders the page title', () => {
    renderWithMuiTheme(<DashboardPageHeader subtitle="Last 30 days" />)
    expect(
      screen.getByRole('heading', { level: 1, name: /bjj evolution dashboard/i }),
    ).toBeInTheDocument()
  })

  it('renders the subtitle text verbatim', () => {
    const subtitle = 'May 13 – Jun 12 · 14 workouts'
    renderWithMuiTheme(<DashboardPageHeader subtitle={subtitle} />)
    expect(screen.getByText(subtitle)).toBeInTheDocument()
  })

  it('renders inside the .page-head container', () => {
    const { container } = renderWithMuiTheme(<DashboardPageHeader subtitle="Last 30 days" />)
    const head = container.querySelector('.page-head')
    expect(head).not.toBeNull()
  })

  it('renders an eyebrow line (live data stamp)', () => {
    renderWithMuiTheme(<DashboardPageHeader subtitle="Last 30 days" />)
    // Eyebrow copy is implementation detail; we just assert SOME visible
    // status indicator above the title.
    const eyebrow = document.querySelector('.eyebrow')
    expect(eyebrow).not.toBeNull()
  })
})