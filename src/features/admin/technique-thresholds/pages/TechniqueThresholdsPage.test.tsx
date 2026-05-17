import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { TechniqueThresholdsPage } from '../pages/TechniqueThresholdsPage'
import type { TechniqueWithThreshold } from '../hooks/useTechniqueThresholds'

// ── Mock hooks ───────────────────────────────────────────────────────────────

vi.mock('../hooks/useTechniqueThresholds', () => ({
  useTechniqueThresholds: vi.fn(),
}))

vi.mock('../hooks/useUpdateTechniqueThreshold', () => ({
  useUpdateTechniqueThreshold: vi.fn().mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
    isSuccess: false,
    isError: false,
    error: null,
  }),
}))

import { useTechniqueThresholds } from '../hooks/useTechniqueThresholds'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
}

function Wrapper({ children, queryClient }: { children: ReactNode; queryClient: QueryClient }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

// ── Fixtures ───────────────────────────────────────────────────────────────────

const MOCK_TECHNIQUES: TechniqueWithThreshold[] = [
  { techniqueId: 't1', name: 'Knee Slide Pass', category: 'guard_pass', currentThreshold: 10 },
  { techniqueId: 't2', name: 'Armbar', category: 'submission', currentThreshold: 15 },
  { techniqueId: 't3', name: 'Turtle Escape', category: 'guard', currentThreshold: 7 },
]

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('TechniqueThresholdsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders skeleton while loading', async () => {
    vi.mocked(useTechniqueThresholds).mockReturnValue({
      data: undefined,
      isLoading: true,
      isPending: true,
    } as ReturnType<typeof useTechniqueThresholds>)

    const queryClient = makeQueryClient()
    render(
      <Wrapper queryClient={queryClient}>
        <TechniqueThresholdsPage />
      </Wrapper>,
    )

    const skeleton = screen.getByRole('status')
    expect(skeleton).toHaveAttribute('aria-label', 'Loading techniques')
  })

  it('renders skeleton with animate-pulse rows', async () => {
    vi.mocked(useTechniqueThresholds).mockReturnValue({
      data: undefined,
      isLoading: true,
      isPending: true,
    } as ReturnType<typeof useTechniqueThresholds>)

    const queryClient = makeQueryClient()
    render(
      <QueryClientProvider client={queryClient}>
        <TechniqueThresholdsPage />
      </QueryClientProvider>,
    )

    // Check for animate-pulse divs
    const pulseElements = document.querySelectorAll('.animate-pulse')
    expect(pulseElements.length).toBeGreaterThan(0)
  })

  it('renders table rows after data loads', async () => {
    vi.mocked(useTechniqueThresholds).mockReturnValue({
      data: MOCK_TECHNIQUES,
      isLoading: false,
      isPending: false,
      isSuccess: true,
    } as ReturnType<typeof useTechniqueThresholds>)

    const queryClient = makeQueryClient()
    render(
      <QueryClientProvider client={queryClient}>
        <TechniqueThresholdsPage />
      </QueryClientProvider>,
    )

    await waitFor(() => {
      expect(screen.getByText('Knee Slide Pass')).toBeInTheDocument()
      expect(screen.getByText('Armbar')).toBeInTheDocument()
      expect(screen.getByText('Turtle Escape')).toBeInTheDocument()
    })
  })

  it('renders table with Name, Category, Threshold, Actions columns', async () => {
    vi.mocked(useTechniqueThresholds).mockReturnValue({
      data: MOCK_TECHNIQUES,
      isLoading: false,
      isPending: false,
      isSuccess: true,
    } as ReturnType<typeof useTechniqueThresholds>)

    const queryClient = makeQueryClient()
    render(
      <QueryClientProvider client={queryClient}>
        <TechniqueThresholdsPage />
      </QueryClientProvider>,
    )

    await waitFor(() => {
      // Check column headers exist
      expect(screen.getByText('Name')).toBeInTheDocument()
      expect(screen.getByText('Category')).toBeInTheDocument()
      expect(screen.getByText('Threshold')).toBeInTheDocument()
      expect(screen.getByText('Actions')).toBeInTheDocument()
    })
  })

  it('displays technique name and category in rows', async () => {
    vi.mocked(useTechniqueThresholds).mockReturnValue({
      data: MOCK_TECHNIQUES,
      isLoading: false,
      isPending: false,
      isSuccess: true,
    } as ReturnType<typeof useTechniqueThresholds>)

    const queryClient = makeQueryClient()
    render(
      <QueryClientProvider client={queryClient}>
        <TechniqueThresholdsPage />
      </QueryClientProvider>,
    )

    await waitFor(() => {
      // First row is header, data rows follow
      expect(screen.getByText('Knee Slide Pass')).toBeInTheDocument()
      expect(screen.getByText('guard_pass')).toBeInTheDocument()
    })
  })

  it('shows page title', async () => {
    vi.mocked(useTechniqueThresholds).mockReturnValue({
      data: MOCK_TECHNIQUES,
      isLoading: false,
      isPending: false,
      isSuccess: true,
    } as ReturnType<typeof useTechniqueThresholds>)

    const queryClient = makeQueryClient()
    render(
      <QueryClientProvider client={queryClient}>
        <TechniqueThresholdsPage />
      </QueryClientProvider>,
    )

    await waitFor(() => {
      expect(screen.getByText('Technique Thresholds')).toBeInTheDocument()
    })
  })
})