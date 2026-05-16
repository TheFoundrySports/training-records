import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useTechniqueWorkoutHistory } from '../hooks/useTechniqueWorkoutHistory'
import type { WorkoutHistoryEntry } from '../types/technique-tracking.types'

// ── Mock Supabase ─────────────────────────────────────────────────────────────

const { mockFrom, configureResponse } = vi.hoisted(() => {
  let capturedData: unknown = []
  let capturedError: unknown = null

  function configureResponse(data: unknown, error: unknown) {
    capturedData = data
    capturedError = error
  }

  function makeThenable() {
    return {
      then: (resolve: (v: { data: unknown; error: unknown }) => void) => {
        resolve({ data: capturedData, error: capturedError })
        return makeThenable()
      },
      catch: vi.fn().mockReturnThis(),
    }
  }

  const mockFrom = vi.fn().mockImplementation(() => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockImplementation(() => makeThenable()),
    then: vi.fn().mockImplementation(() => makeThenable()),
  }))

  return { mockFrom, configureResponse }
})

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: mockFrom,
  },
}))

import { supabase } from '@/lib/supabase'

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

function makeWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

// ── Fixtures ───────────────────────────────────────────────────────────────────

const USER_ID = '550e8400-e29b-41d4-a716-446655440000'
const TECHNIQUE_ID = '550e8400-e29b-41d4-a716-446655440001'

const MOCK_HISTORY: WorkoutHistoryEntry[] = [
  {
    workout_id: '550e8400-e29b-41d4-a716-446655440100',
    performed_at: '2026-04-15T10:00:00.000Z',
    section_number: 2,
    goal: 'Guard passing',
    ai_description: 'Worked on knee slide pass.',
  },
  {
    workout_id: '550e8400-e29b-41d4-a716-446655440101',
    performed_at: '2026-04-10T09:00:00.000Z',
    section_number: 1,
    goal: 'Warmup and guard work',
    ai_description: 'Drilled closed guard retention.',
  },
]

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('useTechniqueWorkoutHistory', () => {
  beforeEach(() => {
    configureResponse([], null)
    mockFrom.mockClear()
  })

  it('queries bjj_section_techniques', async () => {
    configureResponse(MOCK_HISTORY, null)
    const queryClient = makeQueryClient()

    const { result } = renderHook(() => useTechniqueWorkoutHistory(TECHNIQUE_ID, USER_ID), {
      wrapper: makeWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true), { timeout: 3000 })

    expect(supabase.from).toHaveBeenCalledWith('bjj_section_techniques')
  })

  it('calls eq with technique_id and user_id', async () => {
    configureResponse(MOCK_HISTORY, null)
    const queryClient = makeQueryClient()
    const eqCalls: [string, string][] = []

    mockFrom.mockImplementationOnce(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockImplementation(function (col: string, val: string) {
        eqCalls.push([col, val])
        return mockFrom()
      }),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockImplementation(() => ({
        then: (resolve: (v: { data: unknown; error: unknown }) => void) => {
          resolve({ data: MOCK_HISTORY, error: null })
          return { then: vi.fn(), catch: vi.fn() }
        },
        catch: vi.fn(),
      })),
      then: vi.fn(),
    }))

    const { result } = renderHook(() => useTechniqueWorkoutHistory(TECHNIQUE_ID, USER_ID), {
      wrapper: makeWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true), { timeout: 3000 })

    expect(eqCalls).toContainEqual(['technique_id', TECHNIQUE_ID])
    expect(eqCalls).toContainEqual(['workouts.user_id', USER_ID])
  })

  it('returns WorkoutHistoryEntry array when data is available', async () => {
    configureResponse(MOCK_HISTORY, null)
    const queryClient = makeQueryClient()

    const { result } = renderHook(() => useTechniqueWorkoutHistory(TECHNIQUE_ID, USER_ID), {
      wrapper: makeWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true), { timeout: 3000 })

    expect(result.current.data).toBeDefined()
    expect(Array.isArray(result.current.data)).toBe(true)
  })

  it('returns empty array when no workouts contain this technique', async () => {
    configureResponse([], null)
    const queryClient = makeQueryClient()

    const { result } = renderHook(() => useTechniqueWorkoutHistory(TECHNIQUE_ID, USER_ID), {
      wrapper: makeWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true), { timeout: 3000 })

    expect(result.current.data).toEqual([])
  })

  it('throws structured error when query fails', async () => {
    configureResponse(null, { code: 'PGRST204', message: 'Column not found', details: '', hint: '' })
    const queryClient = makeQueryClient()

    const { result } = renderHook(() => useTechniqueWorkoutHistory(TECHNIQUE_ID, USER_ID), {
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

  it('is disabled when techniqueId is empty', () => {
    configureResponse([], null)
    const queryClient = makeQueryClient()

    const { result } = renderHook(() => useTechniqueWorkoutHistory('', USER_ID), {
      wrapper: makeWrapper(queryClient),
    })
    expect(result.current.isPending).toBe(true)
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('is disabled when userId is empty', () => {
    configureResponse([], null)
    const queryClient = makeQueryClient()

    const { result } = renderHook(() => useTechniqueWorkoutHistory(TECHNIQUE_ID, ''), {
      wrapper: makeWrapper(queryClient),
    })
    expect(result.current.isPending).toBe(true)
    expect(supabase.from).not.toHaveBeenCalled()
  })
})