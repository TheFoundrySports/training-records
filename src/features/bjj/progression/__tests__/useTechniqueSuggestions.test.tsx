import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useTechniqueSuggestions } from '../hooks/useTechniqueSuggestions'

let mockResponse: { data: unknown; error: unknown } = { data: [], error: null }

const { mockFrom, configure } = vi.hoisted(() => {
  function configure(response: { data: unknown; error: unknown }) {
    mockResponse = response
  }

  const mockFrom = vi.fn().mockImplementation(() => {
    const builder = {
      select: vi.fn(() => builder),
      eq: vi.fn(() => builder),
      gte: vi.fn(() => builder),
      order: vi.fn(() => builder),
      limit: vi.fn(() => Promise.resolve(mockResponse)),
    }

    return builder
  })

  return { mockFrom, configure }
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

const MOCK_SUGGESTION_ROWS = [
  {
    technique_id: '550e8400-e29b-41d4-a716-446655440001',
    bjj_techniques: {
      name: 'Knee Slide Pass',
      name_es: 'Pasaje de Rodilla',
    },
    total_practices: 7,
    last_practiced_at: '2026-05-10T14:00:00.000Z',
  },
  {
    technique_id: '550e8400-e29b-41d4-a716-446655440002',
    bjj_techniques: {
      name: 'Closed Guard Retention',
      name_es: null,
    },
    total_practices: 4,
    last_practiced_at: '2026-05-08T09:00:00.000Z',
  },
]

const EXPECTED_SUGGESTIONS = [
  {
    technique_id: '550e8400-e29b-41d4-a716-446655440001',
    name: 'Knee Slide Pass',
    name_es: 'Pasaje de Rodilla',
    total_practices: 7,
    last_practiced_at: '2026-05-10T14:00:00.000Z',
  },
  {
    technique_id: '550e8400-e29b-41d4-a716-446655440002',
    name: 'Closed Guard Retention',
    name_es: null,
    total_practices: 4,
    last_practiced_at: '2026-05-08T09:00:00.000Z',
  },
]

describe('useTechniqueSuggestions', () => {
  beforeEach(() => {
    configure({ data: [], error: null })
    mockFrom.mockClear()
  })

  it('queries technique_practice_log for suggestions', async () => {
    configure({ data: MOCK_SUGGESTION_ROWS, error: null })
    const queryClient = makeQueryClient()

    const { result } = renderHook(() => useTechniqueSuggestions(USER_ID), {
      wrapper: makeWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true), { timeout: 3000 })

    expect(supabase.from).toHaveBeenCalledWith('technique_practice_log')
  })

  it('returns TechniqueSuggestion array on success', async () => {
    configure({ data: MOCK_SUGGESTION_ROWS, error: null })
    const queryClient = makeQueryClient()

    const { result } = renderHook(() => useTechniqueSuggestions(USER_ID), {
      wrapper: makeWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true), { timeout: 3000 })

    expect(result.current.data).toEqual(EXPECTED_SUGGESTIONS)
  })

  it('returns empty array when no recent practice activity', async () => {
    configure({ data: [], error: null })
    const queryClient = makeQueryClient()

    const { result } = renderHook(() => useTechniqueSuggestions(USER_ID), {
      wrapper: makeWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true), { timeout: 3000 })

    expect(result.current.data).toEqual([])
  })

  it('throws structured error when query fails', async () => {
    configure({
      data: null,
      error: { code: 'PGRST204', message: 'Column not found', details: '', hint: '' },
    })
    const queryClient = makeQueryClient()

    const { result } = renderHook(() => useTechniqueSuggestions(USER_ID), {
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

  it('is disabled when userId is empty', () => {
    configure({ data: [], error: null })
    const queryClient = makeQueryClient()

    const { result } = renderHook(() => useTechniqueSuggestions(''), {
      wrapper: makeWrapper(queryClient),
    })

    expect(result.current.isPending).toBe(true)
    expect(supabase.from).not.toHaveBeenCalled()
  })
})
