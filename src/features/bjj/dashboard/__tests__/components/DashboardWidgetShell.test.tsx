/**
 * RED tests for `DashboardWidgetShell`.
 *
 * Contract (T5.11 + REQ-BD5):
 *  - Wraps the children in a `.widget` + `.span-N` container (CSS layout).
 *  - While `isLoading` is true, renders the skeleton slot INSTEAD of the
 *    children.
 *  - When `data` is empty/null AND not loading AND not errored, renders
 *    the empty-state slot INSTEAD of the children (REQ-BD5 empty copy).
 *  - When `error` is set, renders the error-state slot (per-widget
 *    <ErrorBoundary> fallback) with the message + a retry button that
 *    calls `onRetry`.
 *  - The widget has a `.widget-head` block with the heading slot.
 *  - Per-widget isolation: an error in one widget doesn't propagate to
 *    siblings (the ErrorBoundary is per-shell, not global).
 *
 * RED confirmed: DashboardWidgetShell module doesn't exist yet.
 */
import { describe, it, expect, vi } from 'vitest'
import { renderWithMuiTheme } from '@/test-utils/renderWithMuiTheme'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DashboardWidgetShell } from '../../components/DashboardWidgetShell'

describe('DashboardWidgetShell \u2014 widget wrapper with skeleton/empty/error slots (T5.11, REQ-BD5)', () => {
  it('renders children when data is present and not loading or errored', () => {
    renderWithMuiTheme(
      <DashboardWidgetShell span={3} heading="Last Techniques" data={[{ id: 1 }]}>
        <p>widget content</p>
      </DashboardWidgetShell>,
    )
    expect(screen.getByText('widget content')).toBeInTheDocument()
    expect(screen.getByText('Last Techniques')).toBeInTheDocument()
  })

  it('renders the .widget + .span-3 container', () => {
    const { container } = renderWithMuiTheme(
      <DashboardWidgetShell span={3} heading="X" data={[{ id: 1 }]}>
        <p>x</p>
      </DashboardWidgetShell>,
    )
    const widget = container.querySelector('.widget.span-3')
    expect(widget).not.toBeNull()
  })

  it('renders the skeleton slot while loading (children hidden)', () => {
    renderWithMuiTheme(
      <DashboardWidgetShell span={3} heading="X" isLoading>
        <p>widget content</p>
      </DashboardWidgetShell>,
    )
    expect(screen.queryByText('widget content')).toBeNull()
    // The skeleton slot renders the .widget-skeleton class on the body.
    expect(document.querySelector('.widget-skeleton')).not.toBeNull()
  })

  it('renders the empty slot when data is empty and not loading', () => {
    renderWithMuiTheme(
      <DashboardWidgetShell span={3} heading="X" data={[]}>
        <p>widget content</p>
      </DashboardWidgetShell>,
    )
    expect(screen.queryByText('widget content')).toBeNull()
    expect(document.querySelector('.widget-empty')).not.toBeNull()
  })

  it('renders the error slot with retry button when error is set', async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()
    renderWithMuiTheme(
      <DashboardWidgetShell
        span={3}
        heading="X"
        error={new Error('boom')}
        onRetry={onRetry}
      >
        <p>widget content</p>
      </DashboardWidgetShell>,
    )
    expect(screen.queryByText('widget content')).toBeNull()
    expect(screen.getByText(/boom/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /retry/i }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })
})