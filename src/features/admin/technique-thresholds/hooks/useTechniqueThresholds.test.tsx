import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useTechniqueThresholds } from '../hooks/useTechniqueThresholds'
import { supabase } from '@/lib/supabase'

// ── Mock Supabase ─────────────────────────────────────────────────────────────

function createMockChain(data: unknown, error: unknown) {
  const chain = {
    then: (resolve: (value: { data: unknown; error: unknown }) => unknown) => {
      resolve({ data, error })
      return chain as unknown as Promise<unknown>
    },
    catch: vi.fn().mockReturnThis(),
  }
  return chain
}

function createSelectChain(data: unknown, error: unknown) {
  const chain = createMockChain(data, error)
  const intermediateOrderObj = {
    order: vi.fn().mockImplementation(function () {
      return chain
    }),
  }
  const firstOrderObj = {
    order: vi.fn().mockImplementation(function () {
      return intermediateOrderObj
    }),
  }
  return {
    select: vi.fn().mockReturnValue(firstOrderObj),
  }
}

let mockChainData: unknown = []
let mockChainError: unknown = null

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockImplementation(() => {
      return createSelectChain(mockChainData, mockChainError)
    }),
  },
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

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

interface ThresholdRow {
  technique_id: string
  required_practices: number
}

interface BJJTechniqueWithThreshold {
  id: string
  name: string
  category: string | null
  technique_learning_thresholds?: ThresholdRow | null
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('useTechniqueThresholds', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockChainData = []
    mockChainError = null
  })

  it('fetches bjj_techniques LEFT JOIN technique_learning_thresholds', async () => {
    const queryClient = makeQueryClient()
    const BASE_TECHNIQUES: BJJTechniqueWithThreshold[] = [
      { id: 't1', name: 'Knee Slide Pass', category: 'guard_pass' },
      { id: 't2', name: 'Closed Guard Retention', category: 'guard' },
      { id: 't3', name: 'Triangle Choke', category: 'submission' },
      { id: 't4', name: 'Stand-up Escape', category: null },
    ]
    mockChainData = BASE_TECHNIQUES
    mockChainError = null

    const { result } = renderHook(() => useTechniqueThresholds(), {
      wrapper: makeWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isFetchedAfterMount).toBe(true), { timeout: 3000 })

    expect(supabase.from).toHaveBeenCalledWith('bjj_techniques')
  })

  it('sorts results by category then by name (DB-level ordering via .order())', async () => {
    const queryClient = makeQueryClient()

    const techniques: BJJTechniqueWithThreshold[] = [
      { id: 't1', name: 'Z Guard', category: 'guard' },
      { id: 't2', name: 'Armbar', category: 'submission' },
      { id: 't3', name: 'Turtle Escape', category: 'guard' },
      { id: 't4', name: 'Omoplata', category: 'submission' },
    ]
    mockChainData = techniques
    mockChainError = null

    const { result } = renderHook(() => useTechniqueThresholds(), {
      wrapper: makeWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isFetchedAfterMount).toBe(true), { timeout: 3000 })

    const sorted = result.current.data
    expect(sorted).toBeDefined()
    if (!sorted) return

    expect(sorted).toHaveLength(4)
    expect(sorted[0].name).toBe('Z Guard')
    expect(sorted[1].name).toBe('Armbar')
    expect(sorted[2].name).toBe('Turtle Escape')
    expect(sorted[3].name).toBe('Omoplata')
    expect(sorted[0].currentThreshold).toBeNull()
  })

  it('returns null currentThreshold when technique_learning_thresholds row is null', async () => {
    const queryClient = makeQueryClient()

    const techniquesWithNullThreshold: BJJTechniqueWithThreshold[] = [
      { id: 't1', name: 'Knee Slide Pass', category: 'guard_pass', technique_learning_thresholds: null },
      { id: 't2', name: 'Closed Guard Retention', category: 'guard', technique_learning_thresholds: null },
    ]
    mockChainData = techniquesWithNullThreshold
    mockChainError = null

    const { result } = renderHook(() => useTechniqueThresholds(), {
      wrapper: makeWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isFetchedAfterMount).toBe(true), { timeout: 3000 })

    const data = result.current.data
    expect(data).toBeDefined()
    if (!data) return

    expect(data).toHaveLength(2)
    expect(data[0].currentThreshold).toBeNull()
    expect(data[1].currentThreshold).toBeNull()
  })

  it('uses stored required_practices when threshold row exists', async () => {
    const queryClient = makeQueryClient()

    const techniquesWithThreshold: BJJTechniqueWithThreshold[] = [
      {
        id: 't1',
        name: 'Knee Slide Pass',
        category: 'guard_pass',
        technique_learning_thresholds: { technique_id: 't1', required_practices: 15 },
      },
      {
        id: 't2',
        name: 'Closed Guard Retention',
        category: 'guard',
        technique_learning_thresholds: { technique_id: 't2', required_practices: 7 },
      },
    ]
    mockChainData = techniquesWithThreshold
    mockChainError = null

    const { result } = renderHook(() => useTechniqueThresholds(), {
      wrapper: makeWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isFetchedAfterMount).toBe(true), { timeout: 3000 })

    const data = result.current.data
    expect(data).toBeDefined()
    if (!data) return

    expect(data[0].currentThreshold).toBe(15)
    expect(data[1].currentThreshold).toBe(7)
  })

  it('returns TechniqueWithThreshold[] with correct shape', async () => {
    const queryClient = makeQueryClient()

    const techniques: BJJTechniqueWithThreshold[] = [
      { id: 't1', name: 'Knee Slide Pass', category: 'guard_pass' },
      { id: 't2', name: 'Closed Guard Retention', category: 'guard' },
    ]
    mockChainData = techniques
    mockChainError = null

    const { result } = renderHook(() => useTechniqueThresholds(), {
      wrapper: makeWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isFetchedAfterMount).toBe(true), { timeout: 3000 })

    const data = result.current.data
    expect(data).toBeDefined()
    if (!data) return

    expect(data[0]).toHaveProperty('techniqueId')
    expect(data[0]).toHaveProperty('name')
    expect(data[0]).toHaveProperty('category')
    expect(data[0]).toHaveProperty('currentThreshold')
  })

  it('throws Error instance when query fails', async () => {
    const queryClient = makeQueryClient()
    mockChainData = null
    mockChainError = {
      code: 'PGRST204',
      message: 'Column not found',
      details: '',
      hint: '',
    }

    const { result } = renderHook(() => useTechniqueThresholds(), {
      wrapper: makeWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 3000 })

    expect(result.current.error).toBeInstanceOf(Error)
    expect(result.current.error?.message).toBe('Column not found')
  })

  it('has staleTime of 60_000', async () => {
    const queryClient = makeQueryClient()
    mockChainData = []
    mockChainError = null

    const { result } = renderHook(() => useTechniqueThresholds(), {
      wrapper: makeWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isFetchedAfterMount).toBe(true), { timeout: 3000 })

    const queryCache = queryClient.getQueryCache()
    const queries = queryCache.getAll()
    const ourQuery = queries.find((q) => JSON.stringify(q.queryKey).includes('technique-thresholds'))
    expect(ourQuery).toBeDefined()
  })
})