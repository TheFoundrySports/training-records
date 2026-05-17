import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useUpdateTechniqueThreshold } from '../hooks/useUpdateTechniqueThreshold'
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
  const orderObj = {
    order: vi.fn().mockImplementation(function () {
      return chain
    }),
  }
  return {
    select: vi.fn().mockReturnValue(orderObj),
  }
}

function createUpsertChain(data: unknown, error: unknown) {
  const chain = createMockChain(data, error)
  return {
    select: vi.fn().mockReturnValue(chain),
  }
}

let mockUpsertData: unknown = null
let mockUpsertError: unknown = null

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'technique_learning_thresholds') {
        return {
          upsert: vi.fn().mockReturnValue(createUpsertChain(mockUpsertData, mockUpsertError)),
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue(createMockChain([], null)),
          }),
        } as unknown as ReturnType<typeof vi.fn>
      }
      return createSelectChain([], null) as unknown as ReturnType<typeof vi.fn>
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

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('useUpdateTechniqueThreshold', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUpsertData = null
    mockUpsertError = null
  })

  it('calls upsert with technique_id and required_practices', async () => {
    const queryClient = makeQueryClient()
    mockUpsertData = null
    mockUpsertError = null

    const { result } = renderHook(() => useUpdateTechniqueThreshold(), {
      wrapper: makeWrapper(queryClient),
    })

    result.current.mutate({ techniqueId: 'tech-123', requiredPractices: 15 })

    await waitFor(() => expect(result.current.isSuccess).toBe(true), { timeout: 3000 })

    expect(supabase.from).toHaveBeenCalledWith('technique_learning_thresholds')

    const mockBuilder = vi.mocked(supabase.from).mock.results[0].value
    const upsertMock = mockBuilder.upsert as ReturnType<typeof vi.fn>
    expect(upsertMock).toHaveBeenCalledWith(
      { technique_id: 'tech-123', required_practices: 15 },
      { onConflict: 'technique_id' },
    )
  })

  it('invalidates technique-thresholds AND technique-learning-status queries on success', async () => {
    const queryClient = makeQueryClient()
    mockUpsertData = null
    mockUpsertError = null

    const { result } = renderHook(() => useUpdateTechniqueThreshold(), {
      wrapper: makeWrapper(queryClient),
    })

    result.current.mutate({ techniqueId: 'tech-456', requiredPractices: 20 })

    await waitFor(() => expect(result.current.isSuccess).toBe(true), { timeout: 3000 })

    expect(result.current.isSuccess).toBe(true)
  })

  it('accepts requiredPractices of 1 (minimum valid value)', async () => {
    const queryClient = makeQueryClient()
    mockUpsertData = null
    mockUpsertError = null

    const { result } = renderHook(() => useUpdateTechniqueThreshold(), {
      wrapper: makeWrapper(queryClient),
    })

    result.current.mutate({ techniqueId: 'tech-min', requiredPractices: 1 })

    await waitFor(() => expect(result.current.isSuccess).toBe(true), { timeout: 3000 })

    const mockBuilder = vi.mocked(supabase.from).mock.results[0].value
    const upsertMock = mockBuilder.upsert as ReturnType<typeof vi.fn>
    expect(upsertMock).toHaveBeenCalledWith(
      { technique_id: 'tech-min', required_practices: 1 },
      { onConflict: 'technique_id' },
    )
  })
})