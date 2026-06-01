import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useCreateUser } from '../useCreateUser'

// ── Mock fetch ───────────────────────────────────────────────────────────────

const mockFetch = vi.fn()

vi.stubGlobal('fetch', mockFetch)

// ── Mock supabase session ───────────────────────────────────────────────────

const mockGetSession = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
    },
  },
}))

// ── Helpers ────────────────────────────────────────────────────────────────

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
}

function makeWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useCreateUser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'valid-admin-token' } },
    })
  })

  describe('fetch-based invocation', () => {
    it('parses 200 success → userId set, error null', async () => {
      const queryClient = makeQueryClient()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true, user_id: 'user-abc' }),
      })

      const { result } = renderHook(() => useCreateUser(), {
        wrapper: makeWrapper(queryClient),
      })

      await result.current.createUser({
        email: 'new@example.com',
        password: 'securepass123',
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.userId).toBe('user-abc')
      expect(result.current.error).toBeNull()
    })

    it('parses 409 error body → hook error is message only (no code prefix)', async () => {
      const queryClient = makeQueryClient()
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: () =>
          Promise.resolve({
            error: { code: 'EMAIL_ALREADY_EXISTS', message: 'A user with this email already exists' },
          }),
      })

      const { result } = renderHook(() => useCreateUser(), {
        wrapper: makeWrapper(queryClient),
      })

      try {
        await result.current.createUser({
          email: 'existing@example.com',
          password: 'securepass123',
        })
      } catch {
        // Expected
      }

      await waitFor(() => expect(result.current.isError).toBe(true))
      // Message only — no code prefix
      expect(result.current.error).toBe('A user with this email already exists')
    })
  })
})