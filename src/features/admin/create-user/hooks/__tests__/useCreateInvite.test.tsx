import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useCreateInvite } from '../useCreateInvite'

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

describe('useCreateInvite', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'valid-token' } },
    })
  })

  it('calls fetch to create_invite endpoint with email and auth header', async () => {
    const queryClient = makeQueryClient()
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ success: true, expires_at: '2026-05-30T00:00:00Z' }),
    })

    const { result } = renderHook(() => useCreateInvite(), {
      wrapper: makeWrapper(queryClient),
    })

    await result.current.createInvite({ email: 'invite@example.com' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/functions/v1/create_invite'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer valid-token',
        }),
        body: JSON.stringify({ email: 'invite@example.com' }),
      }),
    )
  })

  it('returns expires_at on success', async () => {
    const queryClient = makeQueryClient()
    const expiresAt = '2026-05-30T12:00:00Z'
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ success: true, expires_at: expiresAt }),
    })

    const { result } = renderHook(() => useCreateInvite(), {
      wrapper: makeWrapper(queryClient),
    })

    await result.current.createInvite({ email: 'invite2@example.com' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.expiresAt).toBe(expiresAt)
  })

  it('throws error when not authenticated', async () => {
    const queryClient = makeQueryClient()
    mockGetSession.mockResolvedValueOnce({ data: { session: null } })

    const { result } = renderHook(() => useCreateInvite(), {
      wrapper: makeWrapper(queryClient),
    })

    try {
      await result.current.createInvite({ email: 'invite@example.com' })
    } catch {
      // Expected
    }

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBe('Not authenticated')
  })

  it('parses 409 error body → hook error is message only (no code prefix)', async () => {
    const queryClient = makeQueryClient()
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: () =>
        Promise.resolve({
          error: {
            code: 'INVITE_EXISTS',
            message: 'A pending invitation already exists for this email',
          },
        }),
    })

    const { result } = renderHook(() => useCreateInvite(), {
      wrapper: makeWrapper(queryClient),
    })

    try {
      await result.current.createInvite({ email: 'pending@example.com' })
    } catch {
      // Expected
    }

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBe('A pending invitation already exists for this email')
  })

  it('throws error on network-level failure', async () => {
    const queryClient = makeQueryClient()
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: { message: 'Internal server error' } }),
    })

    const { result } = renderHook(() => useCreateInvite(), {
      wrapper: makeWrapper(queryClient),
    })

    try {
      await result.current.createInvite({ email: 'invite@example.com' })
    } catch {
      // Expected
    }

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBe('Internal server error')
  })
})