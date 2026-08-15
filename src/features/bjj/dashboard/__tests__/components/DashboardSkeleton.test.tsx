/**
 * RED tests for `DashboardSkeleton`.
 *
 * Contract (T5.10):
 *  - Renders 5 widget-sized placeholders inside the dashboard grid.
 *  - Each placeholder has the .widget class plus the right .span-N class
 *    matching the 5-widget desktop layout (REQ-BD4: 3/3/2/4/6).
 *  - Each placeholder contains MUI Skeleton blocks (the visual loading
 *    state used while `useBJJDashboard` is pending).
 *  - The skeleton renders inside an aria-busy=true container so
 *    assistive tech announces the loading state.
 *
 * RED confirmed: DashboardSkeleton module doesn't exist yet.
 */
import { describe, it, expect } from 'vitest'
import { renderWithMuiTheme } from '@/test-utils/renderWithMuiTheme'
import { screen } from '@testing-library/react'
import { DashboardSkeleton } from '../../components/DashboardSkeleton'

describe('DashboardSkeleton \u2014 5-card grid placeholder (T5.10, REQ-BD4)', () => {
  it('renders 5 widget placeholders', () => {
    const { container } = renderWithMuiTheme(<DashboardSkeleton />)
    // The skeleton uses `.widget` cards (same class as real widgets).
    // Count by querying the grid and counting .widget children.
    const grid = container.querySelector('.grid')
    expect(grid).not.toBeNull()
    const widgets = grid?.querySelectorAll(':scope > .widget')
    expect(widgets?.length).toBe(5)
  })

  it('uses the desktop span classes (3/3/2/4/6) per REQ-BD4', () => {
    const { container } = renderWithMuiTheme(<DashboardSkeleton />)
    const grid = container.querySelector('.grid')
    const widgets = grid?.querySelectorAll(':scope > .widget') ?? []
    const spans = Array.from(widgets).map((w) =>
      Array.from(w.classList).find((c) => c.startsWith('span-')),
    )
    // Row 1: LastTechniques(3) + TechniqueTypes(3). Row 2: RoleBalance(2)
    // + Outcomes(4). Row 3: RollFlow(6).
    expect(spans).toEqual(['span-3', 'span-3', 'span-2', 'span-4', 'span-6'])
  })

  it('marks the skeleton container as aria-busy', () => {
    renderWithMuiTheme(<DashboardSkeleton />)
    const busy = screen.getByRole('status', { busy: true })
    expect(busy).toBeInTheDocument()
  })
})