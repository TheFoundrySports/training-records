/**
 * RED tests for `DashboardFooter`.
 */
import { describe, it, expect } from 'vitest'
import { renderWithMuiTheme } from '@/test-utils/renderWithMuiTheme'
import { screen } from '@testing-library/react'
import { DashboardFooter } from '../../components/DashboardFooter'

describe('DashboardFooter — last-refresh stamp (T5.9)', () => {
  it('renders the generatedAt timestamp in the live-data stamp', () => {
    const stamp = 'Jun 12, 2026 · 12:00 PM'
    renderWithMuiTheme(<DashboardFooter generatedAt={stamp} />)
    expect(screen.getByText(/Live data · last updated/)).toBeInTheDocument()
    expect(screen.getByText(stamp)).toBeInTheDocument()
  })

  it('renders inside the .foot container', () => {
    const { container } = renderWithMuiTheme(
      <DashboardFooter generatedAt="Jun 12, 2026 · 12:00 PM" />,
    )
    expect(container.querySelector('.foot')).not.toBeNull()
  })

  it('renders the template right-side caption', () => {
    renderWithMuiTheme(<DashboardFooter generatedAt="Jun 12, 2026 · 12:00 PM" />)
    expect(screen.getByText('BJJ Evolution Dashboard · v0.1 · Material UI')).toBeInTheDocument()
  })
})
