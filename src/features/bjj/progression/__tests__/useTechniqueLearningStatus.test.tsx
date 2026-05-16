import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useTechniqueLearningStatus } from '../hooks/useTechniqueLearningStatus'
import type { TechniqueLearningStatus } from '../types/technique-tracking.types'

// ── Mock Supabase ─────────────────────────────────────────────────────────────
// Pattern: supabase.from().select().eq().then(...)
// Each step returns an object with a then() that resolves the promise chain.

function createMockChain(data: unknown, error: unknown) {
  const thenable = {
    then: (resolve: (value: { data: unknown; error: unknown }) => unknown) => {
      resolve({ data, error })
      return thenable as Promise<unknown>
    },
    catch: vi.fn().mockReturnThis(),
  }
  return thenable
}

function createMockBuilder() {
  const builder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
  }
  return builder
}

let mockChainData: unknown = []
let mockChainError: unknown = null

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockImplementation(() => {
      const builder = createMockBuilder()
      // Make each method return a thenable that resolves to the mock data
      ;(builder.select as ReturnType<typeof vi.fn>).mockImplementation(function () {
        return {
          eq: vi.fn().mockImplementation(function () {
            return createMockChain(mockChainData, mockChainError)
          }),
          order: vi.fn().mockImplementation(function () {
            return createMockChain(mockChainData, mockChainError)
          }),
        }
      })
      ;(builder.eq as ReturnType<typeof vi.fn>).mockImplementation(function () {
        return createMockChain(mockChainData, mockChainError)
      })
      return builder
    }),
  },
}))

import { supabase } from '@/lib/supabase'

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
}

function makeWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

// ── Fixtures ───────────────────────────────────────────────────────────────────

const userId = '550e8400-e29b-41d4-a716-446655440000'

const mockStatusData: TechniqueLearningStatus[] = [
  {
    user_id: userId,
    technique_id: '550e8400-e29b-41d4-a716-446655440001',
    name: 'Knee Slide Pass',
    name_es: 'Pasaje de Rodilla',
    category: 'guard_pass',
    total_practices: 12,
    required_practices: 10,
    is_learned: true,
    first_practiced_at: '2026-03-01T10:00:00.000Z',
    last_practiced_at: '2026-04-15T14:30:00.000Z',
  },
  {
    user_id: userId,
    technique_id: '550e8400-e29b-41d4-a716-446655440002',
    name: 'Closed Guard Retention',
    name_es: 'Retención de Guardia Cerrada',
    category: 'guard',
    total_practices: 5,
    required_practices: 10,
    is_learned: false,
    first_practiced_at: '2026-04-01T09:00:00.000Z',
    last_practiced_at: '2026-05-01T16:00:00.000Z',
  },
]

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('useTechniqueLearningStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockChainData = []
    mockChainError = null
  })

  it('queries technique_learning_status view filtered by user_id', async () => {
    const queryClient = makeQueryClient()
    ;(supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue(
          createMockChain(mockStatusData, null)
        ),
      }),
    })

    const { result } = renderHook(() => useTechniqueLearningStatus(userId), {
      wrapper: makeWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isFetchedAfterMount).toBe(true), { timeout: 3000 })

    expect(supabase.from).toHaveBeenCalledWith('technique_learning_status')
    expect(result.current.data).toEqual(mockStatusData)
  })

  it('returns TechniqueLearningStatus array on success', async () => {
    const queryClient = makeQueryClient()
    ;(supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue(
          createMockChain(mockStatusData, null)
        ),
      }),
    })

    const { result } = renderHook(() => useTechniqueLearningStatus(userId), {
      wrapper: makeWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isFetchedAfterMount).toBe(true), { timeout: 3000 })

    expect(result.current.data).toEqual(mockStatusData)
    expect(result.current.data).toHaveLength(2)
  })

  it('returns empty array when no practice records exist', async () => {
    const queryClient = makeQueryClient()
    ;(supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue(
          createMockChain([], null)
        ),
      }),
    })

    const { result } = renderHook(() => useTechniqueLearningStatus(userId), {
      wrapper: makeWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isFetchedAfterMount).toBe(true), { timeout: 3000 })

    expect(result.current.data).toEqual([])
  })

  it('throws structured error when query fails', async () => {
    const queryClient = makeQueryClient()
    ;(supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue(
          createMockChain(null, { code: 'PGRST204', message: 'Column not found', details: '', hint: '' })
        ),
      }),
    })

    const { result } = renderHook(() => useTechniqueLearningStatus(userId), {
      wrapper: makeWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 3000 })

    expect(result.current.error).toMatchObject({
      error: {
        code: 'PGRST204',
        message: 'Column not found',
      },
    })
  })

  it('is disabled when userId is empty string', () => {
    ;(supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
      select: vi.fn(),
    })

    const queryClient = makeQueryClient()
    const { result } = renderHook(() => useTechniqueLearningStatus(''), {
      wrapper: makeWrapper(queryClient),
    })

    expect(result.current.isPending).toBe(true)
    expect(supabase.from).not.toHaveBeenCalled()
  })
})