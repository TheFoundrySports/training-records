import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useRegister } from '../useRegister'

// ── Mock fetch ───────────────────────────────────────────────────────────────

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

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

describe('useRegister', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'valid-token' } },
    })
  })

  it('calls fetch to register-user endpoint with email and password', async () => {
    const queryClient = makeQueryClient()
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ success: true, user_id: 'user-123' }),
    })

    const { result } = renderHook(() => useRegister(), {
      wrapper: makeWrapper(queryClient),
    })

    await result.current.register({ email: 'test@example.com', password: 'password123' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/functions/v1/register-user'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com', password: 'password123' }),
      }),
    )
  })

  it('includes token in body when provided', async () => {
    const queryClient = makeQueryClient()
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ success: true, user_id: 'user-456' }),
    })

    const { result } = renderHook(() => useRegister(), {
      wrapper: makeWrapper(queryClient),
    })

    await result.current.register({
      email: 'invited@example.com',
      password: 'password123',
      token: 'abc-123-def',
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({ email: 'invited@example.com', password: 'password123', token: 'abc-123-def' }),
      }),
    )
  })

  it('parses 400 error body → error is message only (no code prefix)', async () => {
    const queryClient = makeQueryClient()
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: () =>
        Promise.resolve({
          error: { code: 'WEAK_PASSWORD', message: 'Password must be at least 8 characters' },
        }),
    })

    const { result } = renderHook(() => useRegister(), {
      wrapper: makeWrapper(queryClient),
    })

    try {
      await result.current.register({ email: 'test@example.com', password: 'weak' })
    } catch {
      // Expected
    }

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBe('Password must be at least 8 characters')
  })

  it('throws error on network-level failure', async () => {
    const queryClient = makeQueryClient()
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(() => useRegister(), {
      wrapper: makeWrapper(queryClient),
    })

    try {
      await result.current.register({ email: 'test@example.com', password: 'password123' })
    } catch {
      // Expected
    }

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBe('Network error')
  })
})