/**
 * RED tests for `BJJDashboardPage` \u2014 the top-level dashboard page.
 *
 * Contract (T5.14):
 *  - Renders the page header with title "BJJ Evolution Dashboard" and
 *    the resolved subtitle (e.g. "May 13 \u2013 Jun 12 \u00b7 14 workouts").
 *  - Renders the DashboardTimeFilter with the active window preset
 *    pressed.
 *  - Renders 5 widget shells (one per widget position per REQ-BD4).
 *  - Renders the DashboardFooter with the `generated_at` timestamp.
 *  - Mounts MUI ThemeProvider (the .widget-card backgrounds inherit the
 *    MUI palette \u2014 if the ThemeProvider is missing, the bg would not
 *    match the dashboard CSS).
 *
 * RED confirmed: BJJDashboardPage module doesn't exist yet.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { render, screen, type RenderResult } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BJJDashboardPage } from '../../pages/BJJDashboardPage'
import { ThemeProvider } from '@/theme/ThemeContext'

// Stub the data hook so the page renders with controlled data without
// requiring a real Supabase RPC.
const mockUseBJJDashboard = vi.fn()
vi.mock('../../hooks/useBJJDashboard', () => ({
  useBJJDashboard: (window: string) => mockUseBJJDashboard(window),
}))

function buildPayload(overrides: Record<string, unknown> = {}) {
  return {
    window: '30d' as const,
    title: 'BJJ Evolution Dashboard',
    subtitle: 'Your game over 30 days: techniques, role balance, and how your rolls end.',
    start_date: '2026-05-13',
    end_date: '2026-06-12',
    total_rolls: 78,
    total_workouts: 14,
    total_techniques: 23,
    last_techniques: { rows: [] },
    technique_types: { total: 0, segments: [], insights: [] },
    role_balance: { segments: [], total_rolls: 0 },
    outcomes: { tiles: [], total_rolls: 0 },
    roll_flow: { edges: [], total_transitions: 0, top_n: 7 },
    generated_at: 'Jun 12, 2026 \u00b7 12:00 PM',
    generated_at_tz: 'UTC',
    ...overrides,
  }
}

// The page mounts its own ThemeProvider so we only need to wrap with
// QueryClientProvider (for the useQueryClient call) + a minimal CSS
// reset so the dashboard grid class works.
function renderWithProviders(): RenderResult {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    React.createElement(
      MemoryRouter,
      null,
      React.createElement(
        QueryClientProvider,
        { client: queryClient },
        React.createElement(ThemeProvider, null, React.createElement(BJJDashboardPage)),
      ),
    ),
  )
}

beforeEach(() => {
  mockUseBJJDashboard.mockReturnValue({
    data: buildPayload(),
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  })
})

describe('BJJDashboardPage \u2014 page assembly (T5.14)', () => {
  it('renders the page title', () => {
    renderWithProviders()
    expect(
      screen.getByRole('heading', { level: 1, name: /bjj evolution dashboard/i }),
    ).toBeInTheDocument()
  })

  it('renders the narrative subtitle for the active window', () => {
    renderWithProviders()
    expect(
      screen.getByText(/Your game over 30 days: techniques, role balance, and how your rolls end\./),
    ).toBeInTheDocument()
  })

  it('renders the DashboardTimeFilter with 4 toggle buttons', () => {
    renderWithProviders()
    expect(screen.getByRole('tab', { name: '7 days' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: '30 days' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: '90 days' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: '10 rolls' })).toBeInTheDocument()
  })

  it('renders 5 widget shells (REQ-BD4 5-widget grid)', () => {
    const { container } = renderWithProviders()
    const widgets = container.querySelectorAll('.widget')
    expect(widgets.length).toBe(5)
  })

  it('renders the LastTechniquesWidget rows when rows exist', () => {
    mockUseBJJDashboard.mockReturnValue({
      data: buildPayload({
        last_techniques: {
          rows: [
            {
              technique_id: 't1',
              technique_name: 'Triangle Choke',
              category: 'submission',
              last_practiced_at: '2026-06-10T10:00:00.000Z',
              practice_count: 12,
            },
          ],
        },
      }),
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    })
    renderWithProviders()
    expect(screen.getByText('Triangle Choke')).toBeInTheDocument()
  })

  it('renders the DashboardFooter with the generated_at stamp', () => {
    renderWithProviders()
    expect(screen.getByText(/Live data · last updated/)).toBeInTheDocument()
    expect(screen.getByText('Jun 12, 2026 · 12:00 PM')).toBeInTheDocument()
  })

  it('window change calls the hook with the new window', async () => {
    const user = userEvent.setup()
    renderWithProviders()
    await user.click(screen.getByRole('tab', { name: '7 days' }))
    const calls = mockUseBJJDashboard.mock.calls
    expect(calls.some((c) => c[0] === '7d')).toBe(true)
  })

  it('shows the loading skeleton while useBJJDashboard is pending', () => {
    mockUseBJJDashboard.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
    })
    renderWithProviders()
    expect(screen.getByRole('status', { busy: true })).toBeInTheDocument()
  })

  it('shows the error fallback when useBJJDashboard errors', () => {
    mockUseBJJDashboard.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('boom'),
      refetch: vi.fn(),
    })
    renderWithProviders()
    expect(screen.getAllByText(/boom/i).length).toBeGreaterThan(0)
  })
})

/**
 * PR 6b integration tests — verify the 3 new widgets (RoleBalance,
 * Outcomes, RollFlow) render with real data when the RPC payload
 * includes segments / tiles / edges.
 */
describe('BJJDashboardPage — PR 6b 3-widget integration (T6b.7)', () => {
  it('renders the RoleBalance stacked bar + legend when role_balance has segments', () => {
    mockUseBJJDashboard.mockReturnValue({
      data: buildPayload({
        role_balance: {
          segments: [
            { role: 'attacking', pct: 60, count: 47 },
            { role: 'defending', pct: 30, count: 23 },
            { role: 'neutral', pct: 10, count: 8 },
          ],
          total_rolls: 78,
        },
      }),
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    })
    const { container } = renderWithProviders()
    // The .role-stacked wrapper + 3 segment children render inside the
    // RoleBalance widget shell.
    const stacked = container.querySelector('.role-stacked')
    expect(stacked).not.toBeNull()
    expect(stacked?.children.length).toBe(3)
    expect(screen.getByText('Attacking')).toBeInTheDocument()
    expect(screen.getByText('Defending')).toBeInTheDocument()
    expect(screen.getByText('Neutral')).toBeInTheDocument()
  })

  it('renders the Outcomes 2x2 tile grid when outcomes has tiles', () => {
    mockUseBJJDashboard.mockReturnValue({
      data: buildPayload({
        outcomes: {
          tiles: [
            { outcome: 'submission', count: 12, pct: 20 },
            { outcome: 'position_gain', count: 22, pct: 37 },
            { outcome: 'position_loss', count: 18, pct: 30 },
            { outcome: 'neutral', count: 8, pct: 13 },
          ],
          total_rolls: 60,
        },
      }),
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    })
    const { container } = renderWithProviders()
    const grid = container.querySelector('.outcome-grid')
    expect(grid).not.toBeNull()
    expect(container.querySelectorAll('.outcome-tile').length).toBe(4)
  })

  it('renders the RollFlow top-7 rows when roll_flow has edges', () => {
    mockUseBJJDashboard.mockReturnValue({
      data: buildPayload({
        roll_flow: {
          edges: [
            { from: 'closed_guard', to: 'mount', count: 10, pct: 100 },
            { from: 'half_guard', to: 'side_control', count: 7, pct: 70 },
          ],
          total_transitions: 17,
          total_rolls: 78,
          top_n: 7,
        },
      }),
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    })
    const { container } = renderWithProviders()
    const lanes = container.querySelectorAll('.flow-lane')
    expect(lanes.length).toBe(2)
    const summary = container.querySelector('.flow-summary')
    expect(summary).not.toBeNull()
  })

  it('applies the correct grid spans (2 / 4 / 6) for the PR 6b widgets', () => {
    mockUseBJJDashboard.mockReturnValue({
      data: buildPayload({
        role_balance: { segments: [{ role: 'attacking', pct: 100, count: 1 }], total_rolls: 1 },
        outcomes: { tiles: [{ outcome: 'submission', count: 1, pct: 100 }], total_rolls: 1 },
        roll_flow: {
          edges: [{ from: 'standing', to: 'mount', count: 1, pct: 100 }],
          total_transitions: 1,
          total_rolls: 78,
          top_n: 7,
        },
      }),
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    })
    const { container } = renderWithProviders()
    // Each PR 6b widget card carries the correct span class.
    const span2 = container.querySelector('.widget.span-2')
    const span4 = container.querySelector('.widget.span-4')
    const span6 = container.querySelector('.widget.span-6')
    expect(span2).not.toBeNull()
    expect(span4).not.toBeNull()
    expect(span6).not.toBeNull()
  })
})