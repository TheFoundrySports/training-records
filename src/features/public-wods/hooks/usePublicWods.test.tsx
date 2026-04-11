import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { usePublicWods, usePublicWod } from './usePublicWods'

// Mock supabase so api.ts getAuthHeader doesn't throw
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
  },
}))

import { supabase } from '@/lib/supabase'

const mockGetSession = vi.mocked(supabase.auth.getSession)

const MOCK_TOKEN = 'mock-jwt-access-token'
const MOCK_SESSION = {
  data: {
    session: {
      access_token: MOCK_TOKEN,
      refresh_token: 'mock-refresh',
      user: { id: 'user-1', email: 'test@example.com' },
    },
  },
}

const wodRow = {
  id: 'hhhhhhhh-0000-0000-0000-000000000002',
  title: 'Fran',
  type: 'crossfit',
  duration_minutes: 10,
  wod_format: 'for_time',
  wod_text: '21-15-9 Thrusters and Pull-ups',
  payload: { rounds: 1, timeCap: 10, movements: [] },
  category: 'Girl',
  created_at: '2023-09-05T00:00:00Z',
}

const wodMapped = {
  id: 'hhhhhhhh-0000-0000-0000-000000000002',
  title: 'Fran',
  type: 'crossfit',
  durationMinutes: 10,
  wodFormat: 'for_time',
  wodText: '21-15-9 Thrusters and Pull-ups',
  payload: { rounds: 1, timeCap: 10, movements: [] },
  category: 'Girl',
  createdAt: '2023-09-05T00:00:00Z',
}

function makeWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
}

describe('usePublicWods', () => {
  beforeEach(() => {
    mockGetSession.mockResolvedValue(
      MOCK_SESSION as ReturnType<typeof supabase.auth.getSession> extends Promise<infer T>
        ? T
        : never,
    )
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('fetches public WOD list and returns mapped data', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [wodRow],
      }),
    )

    const queryClient = makeQueryClient()
    const { result } = renderHook(() => usePublicWods(), {
      wrapper: makeWrapper(queryClient),
    })

    expect(result.current.isLoading).toBe(true)

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.data).toEqual([wodMapped])
  })

  it('calls GET /api/v1/public-wods without query params when no filters', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    })
    vi.stubGlobal('fetch', mockFetch)

    const queryClient = makeQueryClient()
    const { result } = renderHook(() => usePublicWods(), {
      wrapper: makeWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    const [url] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/v1/public-wods')
  })

  it('includes q param when search filter is provided', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    })
    vi.stubGlobal('fetch', mockFetch)

    const queryClient = makeQueryClient()
    const { result } = renderHook(() => usePublicWods({ q: 'murph' }), {
      wrapper: makeWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    const [url] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toContain('q=murph')
  })

  it('includes category param when category filter is provided', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    })
    vi.stubGlobal('fetch', mockFetch)

    const queryClient = makeQueryClient()
    const { result } = renderHook(() => usePublicWods({ category: 'Hero' }), {
      wrapper: makeWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    const [url] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toContain('category=Hero')
  })

  it('returns empty array when API returns empty list', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [],
      }),
    )

    const queryClient = makeQueryClient()
    const { result } = renderHook(() => usePublicWods(), {
      wrapper: makeWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.data).toEqual([])
  })

  it('sets isError on API error', async () => {
    const errorBody = {
      error: { code: 'INTERNAL_ERROR', message: 'DB error', details: {} },
    }
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => errorBody,
      }),
    )

    const queryClient = makeQueryClient()
    const { result } = renderHook(() => usePublicWods(), {
      wrapper: makeWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toEqual(errorBody)
  })
})

describe('usePublicWod', () => {
  beforeEach(() => {
    mockGetSession.mockResolvedValue(
      MOCK_SESSION as ReturnType<typeof supabase.auth.getSession> extends Promise<infer T>
        ? T
        : never,
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('fetches single WOD by id and maps row', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => wodRow,
      }),
    )

    const queryClient = makeQueryClient()
    const { result } = renderHook(() => usePublicWod('hhhhhhhh-0000-0000-0000-000000000002'), {
      wrapper: makeWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.data).toEqual(wodMapped)
  })

  it('calls GET /api/v1/public-wods/:id with the correct path', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => wodRow,
    })
    vi.stubGlobal('fetch', mockFetch)

    const queryClient = makeQueryClient()
    const { result } = renderHook(() => usePublicWod('some-wod-id'), {
      wrapper: makeWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    const [url] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/v1/public-wods/some-wod-id')
  })

  it('is not enabled when id is empty string', () => {
    vi.stubGlobal('fetch', vi.fn())

    const queryClient = makeQueryClient()
    const { result } = renderHook(() => usePublicWod(''), {
      wrapper: makeWrapper(queryClient),
    })

    expect(result.current.isPending).toBe(true)
    expect(result.current.fetchStatus).toBe('idle')
  })

  it('sets isError on 404', async () => {
    const errorBody = {
      error: { code: 'NOT_FOUND', message: 'Public WOD not found', details: {} },
    }
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => errorBody,
      }),
    )

    const queryClient = makeQueryClient()
    const { result } = renderHook(() => usePublicWod('unknown-id'), {
      wrapper: makeWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toEqual(errorBody)
  })
})
