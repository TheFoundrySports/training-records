/**
 * RED tests for `useBJJPositions()` — the dashboard's position lookup hook.
 *
 * The hook:
 *  - calls `supabase.from('bjj_positions').select('*').order('display_order')`
 *  - uses `bjjDashboardKeys.positions()` as its query key
 *  - sets `staleTime: 60 * 60 * 1000` (REQ-PV5: 1h — the lookup changes only
 *    on migration, so we cache aggressively and trust the user to refresh
 *    the page after a position migration lands)
 *  - surfaces PostgREST errors as a thrown `Error` (same shape as
 *    `useBJJDashboard` for consistency)
 *
 * The 11 canonical rows ship in PR 1's `bjj_positions` migration. The hook
 * is consumed by `TechniqueTypeWidget` (PR 6a) and `RollReviewPanel` (PR 7).
 *
 * Refs: REQ-PV5 (bjj_positions display labels), REQ-PV6 (RPC display lookup),
 * design.md §7.4.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { useBJJPositions } from '../../hooks/useBJJPositions'
import { bjjDashboardKeys } from '../../hooks/bjjDashboardKeys'
import { supabase } from '@/lib/supabase'

// Track the chained supabase calls so we can assert on the `.order()` arg.
const mockOrder = vi.fn()
const mockSelect = vi.fn()
const mockFrom = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
  // Wire the chain: from(table) → select(cols) → order(col, opts)
  mockFrom.mockReturnValue({ select: mockSelect })
  mockSelect.mockReturnValue({ order: mockOrder })
})

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

/** Build a deterministic bjj_positions row for fixture use. */
function buildPositionRow(overrides: Record<string, unknown> = {}) {
  return {
    key: 'standing',
    display_en: 'Standing',
    display_es: 'De pie',
    display_order: 1,
    ...overrides,
  }
}

describe('useBJJPositions — bjj_positions query contract (REQ-PV5, REQ-PV6)', () => {
  it('calls supabase.from("bjj_positions").select(...).order("display_order")', async () => {
    mockOrder.mockResolvedValueOnce({
      data: [buildPositionRow()],
      error: null,
      count: null,
      status: 200,
      statusText: 'OK',
    } as never)

    const { result } = renderHook(() => useBJJPositions(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockFrom).toHaveBeenCalledTimes(1)
    expect(mockFrom).toHaveBeenCalledWith('bjj_positions')
    expect(mockSelect).toHaveBeenCalledTimes(1)
    expect(mockOrder).toHaveBeenCalledTimes(1)
    expect(mockOrder).toHaveBeenCalledWith('display_order', { ascending: true })
  })

  it('returns the rows array on success (passes through unchanged)', async () => {
    const rows = [
      buildPositionRow({ key: 'standing', display_order: 1 }),
      buildPositionRow({ key: 'closed_guard', display_order: 2 }),
      buildPositionRow({ key: 'mount', display_order: 6 }),
    ]
    mockOrder.mockResolvedValueOnce({
      data: rows,
      error: null,
      count: null,
      status: 200,
      statusText: 'OK',
    } as never)

    const { result } = renderHook(() => useBJJPositions(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(rows)
  })

  it('uses bjjDashboardKeys.positions() as the query key', async () => {
    mockOrder.mockResolvedValueOnce({
      data: [],
      error: null,
      count: null,
      status: 200,
      statusText: 'OK',
    } as never)

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children)

    renderHook(() => useBJJPositions(), { wrapper })

    await waitFor(() => {
      const cached = queryClient.getQueryCache().find({ queryKey: bjjDashboardKeys.positions() })
      expect(cached).toBeDefined()
    })
  })

  it('sets staleTime to 1 hour (3600000 ms) — REQ-PV5 1h cache', async () => {
    mockOrder.mockResolvedValueOnce({
      data: [],
      error: null,
      count: null,
      status: 200,
      statusText: 'OK',
    } as never)

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children)

    renderHook(() => useBJJPositions(), { wrapper })

    await waitFor(() => {
      const cached = queryClient
        .getQueryCache()
        .find({ queryKey: bjjDashboardKeys.positions() })
      expect(cached).toBeDefined()
    })

    // staleTime is stored on the observer options; pull from the first observer.
    const cached = queryClient.getQueryCache().find({ queryKey: bjjDashboardKeys.positions() })
    const observer = cached && cached.observers[0]
    expect(observer?.options.staleTime).toBe(60 * 60 * 1000)
  })

  it('throws when supabase returns an error (consumer renders error state)', async () => {
    mockOrder.mockResolvedValueOnce({
      data: null,
      error: { message: 'permission denied', code: '42501' },
      count: null,
      status: 403,
      statusText: 'Forbidden',
    } as never)

    const { result } = renderHook(() => useBJJPositions(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toBeDefined()
    expect(String(result.current.error)).toMatch(/permission denied/i)
  })
})
