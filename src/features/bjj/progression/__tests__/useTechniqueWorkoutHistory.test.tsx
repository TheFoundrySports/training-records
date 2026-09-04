import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useTechniqueWorkoutHistory } from '../hooks/useTechniqueWorkoutHistory'

let mockResponse: { data: unknown; error: unknown } = { data: [], error: null }
const eqCalls: [string, string][] = []
let selectArg: string | undefined
let orderArg: string | undefined

const { mockFrom, configureResponse, clearEqCalls } = vi.hoisted(() => {
  function configureResponse(data: unknown, error: unknown) {
    mockResponse = { data, error }
  }

  function clearEqCalls() {
    eqCalls.length = 0
  }

  const mockFrom = vi.fn().mockImplementation(() => {
    const builder = {
      select: vi.fn((arg: string) => {
        selectArg = arg
        return builder
      }),
      eq: vi.fn((column: string, value: string) => {
        eqCalls.push([column, value])
        return builder
      }),
      order: vi.fn((arg: string) => {
        orderArg = arg
        return builder
      }),
      limit: vi.fn(() => Promise.resolve(mockResponse)),
    }

    return builder
  })

  return { mockFrom, configureResponse, clearEqCalls }
})

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: mockFrom,
  },
}))

import { supabase } from '@/lib/supabase'

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

function makeWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

const USER_ID = '550e8400-e29b-41d4-a716-446655440000'
const TECHNIQUE_ID = '550e8400-e29b-41d4-a716-446655440001'

const MOCK_HISTORY_ROWS = [
  {
    section_number: 2,
    goal: 'Guard passing',
    ai_description: 'Worked on knee slide pass.',
    workouts: {
      id: '550e8400-e29b-41d4-a716-446655440100',
      performed_at: '2026-04-15T10:00:00.000Z',
      user_id: USER_ID,
    },
    bjj_section_techniques: [{ technique_id: TECHNIQUE_ID }],
  },
  {
    section_number: 1,
    goal: 'Warmup and guard work',
    ai_description: 'Drilled closed guard retention.',
    workouts: {
      id: '550e8400-e29b-41d4-a716-446655440101',
      performed_at: '2026-04-10T09:00:00.000Z',
      user_id: USER_ID,
    },
    bjj_section_techniques: [{ technique_id: TECHNIQUE_ID }],
  },
]

const EXPECTED_HISTORY = [
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

describe('useTechniqueWorkoutHistory', () => {
  beforeEach(() => {
    configureResponse([], null)
    clearEqCalls()
    mockFrom.mockClear()
    selectArg = undefined
    orderArg = undefined
  })

  it('queries bjj_sections (not the junction table, which has no FK to workouts)', async () => {
    configureResponse(MOCK_HISTORY_ROWS, null)
    const queryClient = makeQueryClient()

    const { result } = renderHook(() => useTechniqueWorkoutHistory(TECHNIQUE_ID, USER_ID), {
      wrapper: makeWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true), { timeout: 3000 })

    expect(supabase.from).toHaveBeenCalledWith('bjj_sections')
    expect(supabase.from).not.toHaveBeenCalledWith('bjj_section_techniques')
  })

  it('embeds both workouts and bjj_section_techniques via !inner', async () => {
    configureResponse(MOCK_HISTORY_ROWS, null)
    const queryClient = makeQueryClient()

    const { result } = renderHook(() => useTechniqueWorkoutHistory(TECHNIQUE_ID, USER_ID), {
      wrapper: makeWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true), { timeout: 3000 })

    // The two valid FK paths from bjj_sections must both be present.
    // bjj_section_techniques has NO FK to workouts — querying from it
    // and embedding workouts makes PostgREST fail with
    // "failed to parse order (workouts.performed_at.desc)".
    expect(selectArg).toMatch(/workouts!inner\s*\(/)
    expect(selectArg).toMatch(/bjj_section_techniques!inner\s*\(/)
    expect(selectArg).toMatch(/performed_at/)
  })

  it('orders parent table by workouts(performed_at) using embedded-table parent-order syntax', async () => {
    configureResponse(MOCK_HISTORY_ROWS, null)
    const queryClient = makeQueryClient()

    const { result } = renderHook(() => useTechniqueWorkoutHistory(TECHNIQUE_ID, USER_ID), {
      wrapper: makeWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true), { timeout: 3000 })

    // PostgREST's order-spec parser does NOT accept dotted column names like
    // 'workouts.performed_at' — it expects the embedded-table parent-order
    // form 'workouts(performed_at)'. The dotted form produces
    // `?order=workouts.performed_at.desc` and fails with
    // PGRST100 / "failed to parse order (workouts.performed_at.desc)".
    expect(orderArg).toBe('workouts(performed_at)')
  })

  it('filters by workouts.user_id and bjj_section_techniques.technique_id', async () => {
    configureResponse(MOCK_HISTORY_ROWS, null)
    const queryClient = makeQueryClient()

    const { result } = renderHook(() => useTechniqueWorkoutHistory(TECHNIQUE_ID, USER_ID), {
      wrapper: makeWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true), { timeout: 3000 })

    expect(eqCalls).toContainEqual(['workouts.user_id', USER_ID])
    expect(eqCalls).toContainEqual(['bjj_section_techniques.technique_id', TECHNIQUE_ID])
  })

  it('returns WorkoutHistoryEntry array when data is available', async () => {
    configureResponse(MOCK_HISTORY_ROWS, null)
    const queryClient = makeQueryClient()

    const { result } = renderHook(() => useTechniqueWorkoutHistory(TECHNIQUE_ID, USER_ID), {
      wrapper: makeWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true), { timeout: 3000 })

    expect(result.current.data).toEqual(EXPECTED_HISTORY)
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
    configureResponse(null, {
      code: 'PGRST204',
      message: 'Column not found',
      details: '',
      hint: '',
    })
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
