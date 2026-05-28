import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useRegister } from '../useRegister'

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

describe('useRegister', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls POST /functions/v1/register-user with email and password', async () => {
    const queryClient = makeQueryClient()
    mockInvoke.mockResolvedValueOnce({ data: { success: true, user_id: 'user-123' } })

    const { result } = renderHook(() => useRegister(), {
      wrapper: makeWrapper(queryClient),
    })

    await result.current.register({ email: 'test@example.com', password: 'password123' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockInvoke).toHaveBeenCalledWith('register-user', {
      body: { email: 'test@example.com', password: 'password123' },
    })
  })

  it('includes token in body when provided', async () => {
    const queryClient = makeQueryClient()
    mockInvoke.mockResolvedValueOnce({ data: { success: true, user_id: 'user-456' } })

    const { result } = renderHook(() => useRegister(), {
      wrapper: makeWrapper(queryClient),
    })

    await result.current.register({
      email: 'invited@example.com',
      password: 'password123',
      token: 'abc-123-def',
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockInvoke).toHaveBeenCalledWith('register-user', {
      body: { email: 'invited@example.com', password: 'password123', token: 'abc-123-def' },
    })
  })

  it('throws error when edge function returns error', async () => {
    const queryClient = makeQueryClient()
    mockInvoke.mockResolvedValueOnce({ data: { error: 'Registration by invitation only' } })

    const { result } = renderHook(() => useRegister(), {
      wrapper: makeWrapper(queryClient),
    })

    try {
      await result.current.register({ email: 'test@example.com', password: 'password123' })
    } catch {
      // Expected - error is thrown
    }

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toBe('Registration by invitation only')
  })

  it('throws error when edge function invocation fails', async () => {
    const queryClient = makeQueryClient()
    mockInvoke.mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(() => useRegister(), {
      wrapper: makeWrapper(queryClient),
    })

    try {
      await result.current.register({ email: 'test@example.com', password: 'password123' })
    } catch {
      // Expected - error is thrown
    }

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toBe('Network error')
  })
})
