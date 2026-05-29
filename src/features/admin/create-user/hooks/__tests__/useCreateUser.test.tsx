import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useCreateUser } from '../useCreateUser'

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

describe('useCreateUser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls register-user edge function with email', async () => {
    const queryClient = makeQueryClient()
    mockInvoke.mockResolvedValueOnce({ data: { success: true, user_id: 'user-new' } })

    const { result } = renderHook(() => useCreateUser(), {
      wrapper: makeWrapper(queryClient),
    })

    await result.current.createUser({ email: 'newuser@example.com' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockInvoke).toHaveBeenCalledWith('register-user', {
      body: { email: 'newuser@example.com' },
    })
  })

  it('returns the created user_id on success', async () => {
    const queryClient = makeQueryClient()
    mockInvoke.mockResolvedValueOnce({ data: { success: true, user_id: 'user-abc-123' } })

    const { result } = renderHook(() => useCreateUser(), {
      wrapper: makeWrapper(queryClient),
    })

    await result.current.createUser({ email: 'another@example.com' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.userId).toBe('user-abc-123')
  })

  it('throws error when email is already registered', async () => {
    const queryClient = makeQueryClient()
    mockInvoke.mockResolvedValueOnce({ data: { error: 'User already exists' } })

    const { result } = renderHook(() => useCreateUser(), {
      wrapper: makeWrapper(queryClient),
    })

    try {
      await result.current.createUser({ email: 'existing@example.com' })
    } catch {
      // Expected
    }

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toBe('User already exists')
  })
})
