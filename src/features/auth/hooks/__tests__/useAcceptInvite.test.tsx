import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useAcceptInvite } from '../useAcceptInvite'

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

describe('useAcceptInvite', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls POST /functions/v1/accept-invite with token and password', async () => {
    const queryClient = makeQueryClient()
    mockInvoke.mockResolvedValueOnce({ data: { success: true, user_id: 'user-123' } })

    const { result } = renderHook(() => useAcceptInvite(), {
      wrapper: makeWrapper(queryClient),
    })

    await result.current.acceptInvite({ token: 'abc-123-def', password: 'Newpassword1!' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockInvoke).toHaveBeenCalledWith('accept-invite', {
      body: { token: 'abc-123-def', password: 'Newpassword1!' },
    })
  })

  it('throws error when token is invalid', async () => {
    const queryClient = makeQueryClient()
    mockInvoke.mockResolvedValueOnce({ data: { error: 'Invalid or expired token' } })

    const { result } = renderHook(() => useAcceptInvite(), {
      wrapper: makeWrapper(queryClient),
    })

    try {
      await result.current.acceptInvite({ token: 'bad-token', password: 'Newpassword1!' })
    } catch {
      // Expected
    }

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toBe('Invalid or expired token')
  })

  it('throws error when token is already used', async () => {
    const queryClient = makeQueryClient()
    mockInvoke.mockResolvedValueOnce({ data: { error: 'Invitation already used' } })

    const { result } = renderHook(() => useAcceptInvite(), {
      wrapper: makeWrapper(queryClient),
    })

    try {
      await result.current.acceptInvite({ token: 'used-token', password: 'Newpassword1!' })
    } catch {
      // Expected
    }

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toBe('Invitation already used')
  })

  it('throws error when password is weak (no uppercase)', async () => {
    const queryClient = makeQueryClient()

    const { result } = renderHook(() => useAcceptInvite(), {
      wrapper: makeWrapper(queryClient),
    })

    try {
      await result.current.acceptInvite({ token: 'abc-123-def', password: 'newpassword1!' })
    } catch {
      // Expected
    }

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toBe('Password must contain an uppercase letter')
  })

  it('throws error when password is weak (no number)', async () => {
    const queryClient = makeQueryClient()

    const { result } = renderHook(() => useAcceptInvite(), {
      wrapper: makeWrapper(queryClient),
    })

    try {
      await result.current.acceptInvite({ token: 'abc-123-def', password: 'Newpassword!' })
    } catch {
      // Expected
    }

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toBe('Password must contain a number')
  })

  it('throws error when password is weak (no symbol)', async () => {
    const queryClient = makeQueryClient()

    const { result } = renderHook(() => useAcceptInvite(), {
      wrapper: makeWrapper(queryClient),
    })

    try {
      await result.current.acceptInvite({ token: 'abc-123-def', password: 'Newpassword1' })
    } catch {
      // Expected
    }

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toBe('Password must contain a symbol (!@#$%^&*(),.?"{}|<>)')
  })
})
