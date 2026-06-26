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
import { render, screen, type RenderResult } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BJJDashboardPage } from '../../pages/BJJDashboardPage'

// Stub the data hook so the page renders with controlled data without
// requiring a real Supabase RPC.
const mockUseBJJDashboard = vi.fn()
vi.mock('../../hooks/useBJJDashboard', () => ({
  useBJJDashboard: (window: string) => mockUseBJJDashboard(window),
}))

function buildPayload(overrides: Record<string, unknown> = {}) {
  return {
    window: '30d' as const,
    start_date: '2026-05-13',
    end_date: '2026-06-12',
    total_rolls: 78,
    total_workouts: 14,
    total_techniques: 23,
    last_techniques: { rows: [] },
    technique_types: { segments: [], insights: [] },
    role_balance: { segments: [], total_rolls: 0 },
    outcomes: { tiles: [], total_rolls: 0 },
    roll_flow: { edges: [], total_rolls: 0 },
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
      QueryClientProvider,
      { client: queryClient },
      React.createElement(BJJDashboardPage),
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

  it('renders the subtitle derived from the resolved window + workout count', () => {
    renderWithProviders()
    expect(screen.getByText(/14 workouts/)).toBeInTheDocument()
  })

  it('renders the DashboardTimeFilter with 4 toggle buttons', () => {
    renderWithProviders()
    expect(screen.getByRole('button', { name: '7d' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '30d' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '90d' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '10r' })).toBeInTheDocument()
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
    const strong = screen.getByText('Jun 12, 2026 \u00b7 12:00 PM')
    expect(strong.tagName).toBe('STRONG')
  })

  it('window change calls the hook with the new window', async () => {
    const user = userEvent.setup()
    renderWithProviders()
    await user.click(screen.getByRole('button', { name: '7d' }))
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