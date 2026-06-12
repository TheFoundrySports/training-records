import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { AcceptInvitePage } from '../AcceptInvitePage'

// ── Mock useAcceptInvite ───────────────────────────────────────────────────

const mockAcceptInvite = vi.fn()

const acceptInviteState = {
  isLoading: false,
  isSuccess: false,
  isError: false,
  error: null as string | null,
  warning: null as string | null,
}

vi.mock('@/features/auth/hooks/useAcceptInvite', () => ({
  useAcceptInvite: () => ({
    acceptInvite: async (...args: unknown[]) => {
      acceptInviteState.isLoading = true
      acceptInviteState.isSuccess = false
      acceptInviteState.isError = false
      acceptInviteState.error = null
      try {
        await mockAcceptInvite(...args)
        acceptInviteState.isLoading = false
        acceptInviteState.isSuccess = true
      } catch (err) {
        acceptInviteState.isLoading = false
        acceptInviteState.isError = true
        acceptInviteState.error = err instanceof Error ? err.message : 'Unknown error'
      }
    },
    get isLoading() { return acceptInviteState.isLoading },
    get isSuccess() { return acceptInviteState.isSuccess },
    get isError() { return acceptInviteState.isError },
    get error() { return acceptInviteState.error },
    get warning() { return acceptInviteState.warning },
  }),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: (callback: (event: string, session: unknown) => void) => {
        // Defer to next tick so React can commit the initial render first
        setTimeout(() => {
          callback('INITIAL_SESSION', { id: 'user-123', access_token: 'invite-token' })
        }, 1)
        return {
          data: {
            subscription: { unsubscribe: vi.fn() },
          },
        }
      },
      getSession: () =>
        Promise.resolve({
          data: { session: { access_token: 'invite-token', user: { id: 'user-123' } } },
        }),
      updateUser: () => Promise.resolve({ error: null }),
      signOut: () => Promise.resolve({ error: null }),
    },
  },
}))

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router')
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  }
})

// ── Helpers ────────────────────────────────────────────────────────────────

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
}

function renderPage() {
  const queryClient = makeQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AcceptInvitePage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AcceptInvitePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    acceptInviteState.isLoading = false
    acceptInviteState.isSuccess = false
    acceptInviteState.isError = false
    acceptInviteState.error = null
    acceptInviteState.warning = null
  })

  it('renders warning as non-blocking notice when hook returns warning', async () => {
    acceptInviteState.warning = 'No pending invitation found for this session'

    renderPage()

    await waitFor(() => {
      const warningEl = screen.getByRole('status')
      expect(warningEl).toHaveTextContent('No pending invitation found for this session')
    })
  })

  it('warning notice is visually distinct from error (no text-destructive class)', async () => {
    acceptInviteState.warning = 'No pending invitation found for this session'

    renderPage()

    await waitFor(() => {
      const warningEl = screen.getByRole('status')
      expect(warningEl).not.toHaveClass(/text-destructive/)
    })
  })

  it('renders error in red when isError is true (not replaced by warning)', async () => {
    acceptInviteState.isError = true
    acceptInviteState.error = 'Password too weak'

    renderPage()

    await waitFor(() => {
      const alertEl = screen.getByRole('alert')
      expect(alertEl).toHaveTextContent('Password too weak')
    })

    // warning should not be rendered when there's an error
    expect(screen.queryByRole('status')).toBeNull()
  })
})