import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TechniqueSuggestionPanel } from '../components/TechniqueSuggestionPanel'
import type { TechniqueSuggestion } from '../types/technique-tracking.types'

// ── Mock Supabase (module-level — hoisted by vitest) ─────────────────────────

const MOCK_USER_ID = '550e8400-e29b-41d4-a716-446655440000'

function createMockThenable(data: unknown, error: unknown) {
  return {
    then: (resolve: (value: { data: unknown; error: unknown }) => unknown) => {
      resolve({ data, error })
      return createMockThenable(data, error) as unknown as Promise<unknown>
    },
    catch: () => createMockThenable(data, error) as unknown as Promise<unknown>,
  }
}

let mockSuggestionData: Array<{
  technique_id: string
  bjj_techniques: { name: string; name_es: string | null }
  total_practices: number
  last_practiced_at: string
}> = []
let mockError: unknown = null

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => createMockThenable(mockSuggestionData, mockError)),
      })),
    })),
    auth: {
      getUser: vi.fn(() =>
        Promise.resolve({ data: { user: { id: MOCK_USER_ID } } })
      ),
    },
  },
}))

// ── Mock localStorage ─────────────────────────────────────────────────────────

const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
  }
})()

Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
}

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={makeQueryClient()}>{children}</QueryClientProvider>
  )
}

// ── Fixtures ───────────────────────────────────────────────────────────────────

const mockSuggestions = [
  {
    technique_id: 't1',
    bjj_techniques: { name: 'Knee Slide Pass', name_es: 'Pasaje de Rodilla' },
    total_practices: 8,
    last_practiced_at: '2026-05-10T10:00:00.000Z',
  },
  {
    technique_id: 't2',
    bjj_techniques: { name: 'Closed Guard Retention', name_es: 'Retención de Guardia Cerrada' },
    total_practices: 5,
    last_practiced_at: '2026-05-08T14:00:00.000Z',
  },
  {
    technique_id: 't3',
    bjj_techniques: { name: 'Armbar from Guard', name_es: 'Armbar desde Guardia' },
    total_practices: 12,
    last_practiced_at: '2026-05-05T09:00:00.000Z',
  },
]

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('TechniqueSuggestionPanel', () => {
  beforeEach(() => {
    mockSuggestionData = []
    mockError = null
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  it('renders panel with title', async () => {
    mockSuggestionData = mockSuggestions
    render(<TechniqueSuggestionPanel userId={MOCK_USER_ID} />, {
      wrapper: Wrapper,
    })

    await waitFor(() => {
      expect(screen.getByText('Suggested Techniques')).toBeInTheDocument()
    })
  })

  it('renders up to 5 suggestions when data is present', async () => {
    mockSuggestionData = mockSuggestions
    render(<TechniqueSuggestionPanel userId={MOCK_USER_ID} />, {
      wrapper: Wrapper,
    })

    await waitFor(() => {
      expect(screen.getByText('Knee Slide Pass')).toBeInTheDocument()
    })
    expect(screen.getByText('Closed Guard Retention')).toBeInTheDocument()
    expect(screen.getByText('Armbar from Guard')).toBeInTheDocument()
  })

  it('shows empty state when no suggestions', async () => {
    mockSuggestionData = []
    render(<TechniqueSuggestionPanel userId={MOCK_USER_ID} />, {
      wrapper: Wrapper,
    })

    await waitFor(() => {
      expect(screen.getByTestId('empty-suggestions')).toBeInTheDocument()
    })
  })

  it('renders "Mark as Complete" button per suggestion', async () => {
    mockSuggestionData = mockSuggestions
    render(<TechniqueSuggestionPanel userId={MOCK_USER_ID} />, {
      wrapper: Wrapper,
    })

    await waitFor(() => {
      expect(screen.getByText('Knee Slide Pass')).toBeInTheDocument()
    })

    const buttons = screen.getAllByRole('button', { name: /mark as complete/i })
    expect(buttons).toHaveLength(3)
  })

  it('per-item dismiss button sets localStorage', async () => {
    mockSuggestionData = mockSuggestions
    render(<TechniqueSuggestionPanel userId={MOCK_USER_ID} />, {
      wrapper: Wrapper,
    })

    await waitFor(() => {
      expect(screen.getByText('Knee Slide Pass')).toBeInTheDocument()
    })

    const dismissButtons = screen.getAllByRole('button', { name: /dismiss/i })
    await userEvent.click(dismissButtons[0])

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      `suggestions_dismissed_${MOCK_USER_ID}`,
      expect.stringContaining('t1')
    )
  })

  it('"Dismiss all" button removes all suggestions from view', async () => {
    mockSuggestionData = mockSuggestions
    render(<TechniqueSuggestionPanel userId={MOCK_USER_ID} />, {
      wrapper: Wrapper,
    })

    await waitFor(() => {
      expect(screen.getByText('Knee Slide Pass')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByRole('button', { name: /dismiss all/i }))
    expect(screen.queryByText('Knee Slide Pass')).not.toBeInTheDocument()
  })

  it('panel starts expanded', async () => {
    mockSuggestionData = mockSuggestions
    render(<TechniqueSuggestionPanel userId={MOCK_USER_ID} />, {
      wrapper: Wrapper,
    })

    await waitFor(() => {
      expect(screen.getByText('Knee Slide Pass')).toBeInTheDocument()
    })
  })

  it('collapse button hides suggestions', async () => {
    mockSuggestionData = mockSuggestions
    render(<TechniqueSuggestionPanel userId={MOCK_USER_ID} />, {
      wrapper: Wrapper,
    })

    await waitFor(() => {
      expect(screen.getByText('Knee Slide Pass')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByRole('button', { name: /collapse/i }))
    expect(screen.queryByText('Knee Slide Pass')).not.toBeInTheDocument()
  })

  it('expand button shows suggestions again', async () => {
    mockSuggestionData = mockSuggestions
    render(<TechniqueSuggestionPanel userId={MOCK_USER_ID} />, {
      wrapper: Wrapper,
    })

    await waitFor(() => {
      expect(screen.getByText('Knee Slide Pass')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByRole('button', { name: /collapse/i }))
    expect(screen.queryByText('Knee Slide Pass')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /expand/i }))
    expect(screen.getByText('Knee Slide Pass')).toBeInTheDocument()
  })
})