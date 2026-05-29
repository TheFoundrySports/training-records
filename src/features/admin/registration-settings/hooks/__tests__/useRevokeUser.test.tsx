import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useRevokeUser } from '../useRevokeUser'

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

describe('useRevokeUser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls revoke-user with ban action', async () => {
    const queryClient = makeQueryClient()
    mockInvoke.mockResolvedValueOnce({ data: { success: true, action: 'ban' } })

    const { result } = renderHook(() => useRevokeUser(), {
      wrapper: makeWrapper(queryClient),
    })

    await result.current.revokeUser({ userId: 'user-123', action: 'ban' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockInvoke).toHaveBeenCalledWith('revoke-user', {
      body: { user_id: 'user-123', action: 'ban' },
    })
  })

  it('calls revoke-user with unban action', async () => {
    const queryClient = makeQueryClient()
    mockInvoke.mockResolvedValueOnce({ data: { success: true, action: 'unban' } })

    const { result } = renderHook(() => useRevokeUser(), {
      wrapper: makeWrapper(queryClient),
    })

    await result.current.revokeUser({ userId: 'user-456', action: 'unban' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockInvoke).toHaveBeenCalledWith('revoke-user', {
      body: { user_id: 'user-456', action: 'unban' },
    })
  })

  it('throws error when revoke fails', async () => {
    const queryClient = makeQueryClient()
    mockInvoke.mockResolvedValueOnce({ data: { error: 'User not found' } })

    const { result } = renderHook(() => useRevokeUser(), {
      wrapper: makeWrapper(queryClient),
    })

    try {
      await result.current.revokeUser({ userId: 'nonexistent', action: 'ban' })
    } catch {
      // Expected
    }

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toBe('User not found')
  })

  it('throws error when caller is not admin', async () => {
    const queryClient = makeQueryClient()
    mockInvoke.mockResolvedValueOnce({ data: { error: 'Admin access required' } })

    const { result } = renderHook(() => useRevokeUser(), {
      wrapper: makeWrapper(queryClient),
    })

    try {
      await result.current.revokeUser({ userId: 'user-789', action: 'ban' })
    } catch {
      // Expected
    }

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toBe('Admin access required')
  })
})
