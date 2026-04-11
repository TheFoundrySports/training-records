import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useExercises, useExercise } from './useExercises'
import { useCreateExercise, useDeleteExercise } from './useExerciseMutations'

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

// Minimal exercise row returned by the API
const exerciseRow = {
  id: 'ex-1',
  name: 'Pull-up',
  description: 'Classic bodyweight pull-up',
  category_id: 'cat-1',
  movement_type: 'Gymnastics',
  measurement_type: 'Reps',
  difficulty_level: 'Beginner',
  equipment: ['pull-up-bar'],
  is_benchmark: false,
  video_url: null,
  scaling_options: null,
  created_at: '2026-04-06T00:00:00.000Z',
  updated_at: '2026-04-06T00:00:00.000Z',
}

const exerciseMapped = {
  id: 'ex-1',
  name: 'Pull-up',
  description: 'Classic bodyweight pull-up',
  categoryId: 'cat-1',
  movementType: 'Gymnastics',
  measurementType: 'Reps',
  difficultyLevel: 'Beginner',
  equipment: ['pull-up-bar'],
  isBenchmark: false,
  videoUrl: null,
  scalingOptions: null,
  createdAt: '2026-04-06T00:00:00.000Z',
  updatedAt: '2026-04-06T00:00:00.000Z',
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

describe('useExercises', () => {
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

  it('fetches exercise list and returns mapped data', async () => {
    const apiResponse = {
      data: [exerciseRow],
      total: 1,
      page: 1,
      pageSize: 20,
    }

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => apiResponse,
      }),
    )

    const queryClient = makeQueryClient()
    const { result } = renderHook(() => useExercises(), {
      wrapper: makeWrapper(queryClient),
    })

    expect(result.current.isLoading).toBe(true)

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.data).toEqual({
      data: [exerciseMapped],
      total: 1,
      page: 1,
      pageSize: 20,
    })
  })

  it('calls GET /api/v1/exercises without query params when no filters', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [], total: 0, page: 1, pageSize: 20 }),
    })
    vi.stubGlobal('fetch', mockFetch)

    const queryClient = makeQueryClient()
    const { result } = renderHook(() => useExercises(), {
      wrapper: makeWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    const [url] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/v1/exercises')
  })

  it('includes query params in request when filters are provided', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [], total: 0, page: 1, pageSize: 20 }),
    })
    vi.stubGlobal('fetch', mockFetch)

    const queryClient = makeQueryClient()
    const { result } = renderHook(
      () => useExercises({ categoryId: 'cat-1', movementType: 'Gymnastics' }),
      { wrapper: makeWrapper(queryClient) },
    )

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    const [url] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toContain('category_id=cat-1')
    expect(url).toContain('movement_type=Gymnastics')
  })

  it('includes q param when search filter is provided', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [], total: 0, page: 1, pageSize: 20 }),
    })
    vi.stubGlobal('fetch', mockFetch)

    const queryClient = makeQueryClient()
    const { result } = renderHook(() => useExercises({ q: 'pull' }), {
      wrapper: makeWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    const [url] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toContain('q=pull')
  })

  it('throws standardized error shape on API error', async () => {
    const errorBody = {
      error: { code: 'INTERNAL_ERROR', message: 'DB exploded', details: {} },
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
    const { result } = renderHook(() => useExercises(), {
      wrapper: makeWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toEqual(errorBody)
  })
})

describe('useExercise', () => {
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

  it('fetches single exercise by id and maps row', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => exerciseRow,
      }),
    )

    const queryClient = makeQueryClient()
    const { result } = renderHook(() => useExercise('ex-1'), {
      wrapper: makeWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.data).toEqual(exerciseMapped)
  })

  it('calls GET /api/v1/exercises/:id with the correct path', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => exerciseRow,
    })
    vi.stubGlobal('fetch', mockFetch)

    const queryClient = makeQueryClient()
    const { result } = renderHook(() => useExercise('ex-42'), {
      wrapper: makeWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    const [url] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/v1/exercises/ex-42')
  })

  it('throws standardized NOT_FOUND error on 404', async () => {
    const errorBody = {
      error: { code: 'NOT_FOUND', message: 'Exercise not found', details: {} },
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
    const { result } = renderHook(() => useExercise('unknown-id'), {
      wrapper: makeWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toEqual(errorBody)
  })

  it('is not enabled when id is empty string', () => {
    vi.stubGlobal('fetch', vi.fn())

    const queryClient = makeQueryClient()
    const { result } = renderHook(() => useExercise(''), {
      wrapper: makeWrapper(queryClient),
    })

    // When disabled, isPending is true but fetch is never called
    expect(result.current.isPending).toBe(true)
    expect(result.current.fetchStatus).toBe('idle')
  })
})

describe('useCreateExercise', () => {
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

  it('POSTs to /api/v1/exercises with snake_case body and returns mapped exercise', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => exerciseRow,
    })
    vi.stubGlobal('fetch', mockFetch)

    const queryClient = makeQueryClient()
    const { result } = renderHook(() => useCreateExercise(), {
      wrapper: makeWrapper(queryClient),
    })

    await result.current.mutateAsync({
      name: 'Pull-up',
      movementType: 'Gymnastics',
      measurementType: 'Reps',
      difficultyLevel: 'Beginner',
    })

    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/v1/exercises')
    expect(options.method).toBe('POST')

    const body = JSON.parse(options.body as string) as Record<string, unknown>
    expect(body.name).toBe('Pull-up')
    expect(body.movement_type).toBe('Gymnastics')
    expect(body.measurement_type).toBe('Reps')
    expect(body.difficulty_level).toBe('Beginner')
  })

  it('throws standardized 409 error on duplicate name', async () => {
    const errorBody = {
      error: {
        code: 'DUPLICATE_NAME',
        message: 'An exercise with the name "Pull-up" already exists',
        details: { field: 'name' },
      },
    }
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 409,
        json: async () => errorBody,
      }),
    )

    const queryClient = makeQueryClient()
    const { result } = renderHook(() => useCreateExercise(), {
      wrapper: makeWrapper(queryClient),
    })

    await expect(
      result.current.mutateAsync({
        name: 'Pull-up',
        movementType: 'Gymnastics',
        measurementType: 'Reps',
        difficultyLevel: 'Beginner',
      }),
    ).rejects.toEqual(errorBody)
  })

  it('throws 403 error when athlete tries to create exercise', async () => {
    const errorBody = {
      error: { code: 'FORBIDDEN', message: 'Admin access required', details: {} },
    }
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => errorBody,
      }),
    )

    const queryClient = makeQueryClient()
    const { result } = renderHook(() => useCreateExercise(), {
      wrapper: makeWrapper(queryClient),
    })

    await expect(
      result.current.mutateAsync({
        name: 'Pull-up',
        movementType: 'Gymnastics',
        measurementType: 'Reps',
        difficultyLevel: 'Beginner',
      }),
    ).rejects.toEqual(errorBody)
  })
})

describe('useDeleteExercise', () => {
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

  it('sends DELETE to /api/v1/exercises/:id', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      json: async () => ({}),
    })
    vi.stubGlobal('fetch', mockFetch)

    const queryClient = makeQueryClient()
    const { result } = renderHook(() => useDeleteExercise(), {
      wrapper: makeWrapper(queryClient),
    })

    await result.current.mutateAsync('ex-1')

    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/v1/exercises/ex-1')
    expect(options.method).toBe('DELETE')
  })

  it('invalidates exercises query on successful delete', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 204,
        json: async () => ({}),
      }),
    )

    const queryClient = makeQueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useDeleteExercise(), {
      wrapper: makeWrapper(queryClient),
    })

    await result.current.mutateAsync('ex-1')

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['exercises'] })
  })
})
