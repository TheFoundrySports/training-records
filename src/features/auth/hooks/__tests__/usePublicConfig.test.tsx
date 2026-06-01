import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { usePublicConfig } from '../usePublicConfig'

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

describe('usePublicConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns registration_mode from public-config endpoint', async () => {
    const queryClient = makeQueryClient()
    mockInvoke.mockResolvedValueOnce({ data: { registration_mode: 'open' } })

    const { result } = renderHook(() => usePublicConfig(), {
      wrapper: makeWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.registrationMode).toBe('open'))

    expect(mockInvoke).toHaveBeenCalledWith('public-config')
  })

  it('returns invite_only when registration is restricted', async () => {
    const queryClient = makeQueryClient()
    mockInvoke.mockResolvedValueOnce({ data: { registration_mode: 'invite_only' } })

    const { result } = renderHook(() => usePublicConfig(), {
      wrapper: makeWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.registrationMode).toBe('invite_only'))
  })

  it('returns null registrationMode when fetch fails', async () => {
    const queryClient = makeQueryClient()
    mockInvoke.mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(() => usePublicConfig(), {
      wrapper: makeWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.registrationMode).toBeNull()
  })

  it('returns null registrationMode when endpoint returns error', async () => {
    const queryClient = makeQueryClient()
    // Hook checks for top-level `error` property, not inside `data`
    mockInvoke.mockResolvedValueOnce({ error: { message: 'Failed to fetch public config' } })

    const { result } = renderHook(() => usePublicConfig(), {
      wrapper: makeWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.registrationMode).toBeNull()
  })

  it('sets isLoading to true while fetching', async () => {
    const queryClient = makeQueryClient()
    mockInvoke.mockResolvedValueOnce({ data: { registration_mode: 'open' } })

    const { result } = renderHook(() => usePublicConfig(), {
      wrapper: makeWrapper(queryClient),
    })

    expect(result.current.isLoading).toBe(true)

    await waitFor(() => expect(result.current.isLoading).toBe(false))
  })
})
