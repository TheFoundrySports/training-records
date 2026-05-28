import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useCreateInvite } from '../useCreateInvite'

// ── Mock supabase client ────────────────────────────────────────────────────

const mockInvoke = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    functions: {
      invoke: (...args: unknown[]) => mockInvoke(...args),
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

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('useCreateInvite', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls create-invite edge function with email', async () => {
    const queryClient = makeQueryClient()
    mockInvoke.mockResolvedValueOnce({
      data: { success: true, invite_url: 'https://app.example.com/accept-invite?token=abc', expires_at: '2026-05-30T00:00:00Z' },
    })

    const { result } = renderHook(() => useCreateInvite(), {
      wrapper: makeWrapper(queryClient),
    })

    await result.current.createInvite({ email: 'invite@example.com' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockInvoke).toHaveBeenCalledWith('create-invite', {
      body: { email: 'invite@example.com' },
    })
  })

  it('returns invite_url and expires_at on success', async () => {
    const queryClient = makeQueryClient()
    const expiresAt = '2026-05-30T12:00:00Z'
    mockInvoke.mockResolvedValueOnce({
      data: {
        success: true,
        invite_url: 'https://app.example.com/accept-invite?token=xyz-789',
        expires_at: expiresAt,
      },
    })

    const { result } = renderHook(() => useCreateInvite(), {
      wrapper: makeWrapper(queryClient),
    })

    await result.current.createInvite({ email: 'invite2@example.com' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.inviteUrl).toBe('https://app.example.com/accept-invite?token=xyz-789')
    expect(result.current.expiresAt).toBe(expiresAt)
  })

  it('throws error when invite already pending for email', async () => {
    const queryClient = makeQueryClient()
    mockInvoke.mockResolvedValueOnce({ data: { error: 'Invitation already pending for this email' } })

    const { result } = renderHook(() => useCreateInvite(), {
      wrapper: makeWrapper(queryClient),
    })

    try {
      await result.current.createInvite({ email: 'pending@example.com' })
    } catch {
      // Expected
    }

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toBe('Invitation already pending for this email')
  })

  it('throws error when caller is not admin', async () => {
    const queryClient = makeQueryClient()
    mockInvoke.mockResolvedValueOnce({ data: { error: 'Admin access required' } })

    const { result } = renderHook(() => useCreateInvite(), {
      wrapper: makeWrapper(queryClient),
    })

    try {
      await result.current.createInvite({ email: 'test@example.com' })
    } catch {
      // Expected
    }

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toBe('Admin access required')
  })
})
