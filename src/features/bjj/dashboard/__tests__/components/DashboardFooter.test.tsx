/**
 * RED tests for `DashboardFooter`.
 *
 * Contract (T5.9):
 *  - Renders the `.foot` container (CSS layout in material-dashboard.css
 *    line 285: justify-between, border-top, muted color).
 *  - Renders the `generatedAt` prop as the live timestamp (the RPC echoes
 *    a "Mon DD, YYYY \u00b7 HH:MI AM" string).
 *  - Renders an explanatory caption (e.g. "Live data \u00b7 scoped to your
 *    confirmed rolls") so the footer isn't a bare timestamp.
 *
 * RED confirmed: DashboardFooter module doesn't exist yet.
 */
import { describe, it, expect } from 'vitest'
import { renderWithMuiTheme } from '@/test-utils/renderWithMuiTheme'
import { screen } from '@testing-library/react'
import { DashboardFooter } from '../../components/DashboardFooter'

describe('DashboardFooter \u2014 last-refresh stamp (T5.9)', () => {
  it('renders the generatedAt timestamp verbatim', () => {
    renderWithMuiTheme(<DashboardFooter generatedAt="Jun 12, 2026 \u00b7 12:00 PM" />)
    expect(
      screen.getByText('Jun 12, 2026 \u00b7 12:00 PM'),
    ).toBeInTheDocument()
  })

  it('renders inside the .foot container', () => {
    const { container } = renderWithMuiTheme(
      <DashboardFooter generatedAt="Jun 12, 2026 \u00b7 12:00 PM" />,
    )
    expect(container.querySelector('.foot')).not.toBeNull()
  })

  it('renders a scope caption explaining what the dashboard tracks', () => {
    renderWithMuiTheme(<DashboardFooter generatedAt="Jun 12, 2026 \u00b7 12:00 PM" />)
    // The scope caption copy is generic; we just assert something beyond
    // the timestamp appears.
    expect(
      screen.getByText(/confirmed rolls/i),
    ).toBeInTheDocument()
  })
})