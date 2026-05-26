import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useUpdateUserRole } from './useUpdateUserRole'

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

describe('useUpdateUserRole', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls POST /functions/v1/update-user-role with user_id and role', async () => {
    const queryClient = makeQueryClient()
    mockInvoke.mockResolvedValueOnce({ data: { success: true, role: 'admin' } })

    const { result } = renderHook(() => useUpdateUserRole(), {
      wrapper: makeWrapper(queryClient),
    })

    await result.current.updateRole({ userId: 'user-123', role: 'admin' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockInvoke).toHaveBeenCalledWith('update-user-role', {
      body: { user_id: 'user-123', role: 'admin' },
    })
  })

  it('invalidates users query on success', async () => {
    const queryClient = makeQueryClient()
    mockInvoke.mockResolvedValueOnce({ data: { success: true, role: 'athlete' } })

    const { result } = renderHook(() => useUpdateUserRole(), {
      wrapper: makeWrapper(queryClient),
    })

    await result.current.updateRole({ userId: 'user-456', role: 'athlete' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockInvoke).toHaveBeenCalledTimes(1)
  })

  it('rejects roles that are not admin or athlete', async () => {
    const queryClient = makeQueryClient()
    mockInvoke.mockRejectedValueOnce(new Error('Role must be admin or athlete'))

    const { result } = renderHook(() => useUpdateUserRole(), {
      wrapper: makeWrapper(queryClient),
    })

    try {
      await result.current.updateRole({ userId: 'user-123', role: 'superadmin' as 'admin' | 'athlete' })
    } catch {
      // Expected
    }

    await waitFor(() => expect(result.current.mutationError).not.toBeNull(), { timeout: 3000 })

    expect(result.current.mutationError).toBeInstanceOf(Error)
    expect(result.current.mutationError?.message).toBe('Role must be admin or athlete')
  })
})