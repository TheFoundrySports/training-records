import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { apiGet, apiPost, apiPut, apiDelete } from './api'

// Mock the supabase module before importing api
vi.mock('./supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
  },
}))

import { supabase } from './supabase'

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

describe('API client', () => {
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

  describe('Authorization header', () => {
    it('includes Bearer token on GET requests', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: '1', title: 'Test' }),
      })
      vi.stubGlobal('fetch', mockFetch)

      await apiGet('/workouts')

      expect(mockFetch).toHaveBeenCalledOnce()
      const [, options] = mockFetch.mock.calls[0] as [string, RequestInit]
      expect((options.headers as Record<string, string>)['Authorization']).toBe(
        `Bearer ${MOCK_TOKEN}`,
      )
    })

    it('includes Bearer token on POST requests', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: '2' }),
      })
      vi.stubGlobal('fetch', mockFetch)

      await apiPost('/workouts', { title: 'New workout' })

      const [, options] = mockFetch.mock.calls[0] as [string, RequestInit]
      expect((options.headers as Record<string, string>)['Authorization']).toBe(
        `Bearer ${MOCK_TOKEN}`,
      )
    })

    it('includes Bearer token on PUT requests', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: '1' }),
      })
      vi.stubGlobal('fetch', mockFetch)

      await apiPut('/workouts/1', { title: 'Updated' })

      const [, options] = mockFetch.mock.calls[0] as [string, RequestInit]
      expect((options.headers as Record<string, string>)['Authorization']).toBe(
        `Bearer ${MOCK_TOKEN}`,
      )
    })

    it('includes Bearer token on DELETE requests', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({}),
      })
      vi.stubGlobal('fetch', mockFetch)

      await apiDelete('/workouts/1')

      const [, options] = mockFetch.mock.calls[0] as [string, RequestInit]
      expect((options.headers as Record<string, string>)['Authorization']).toBe(
        `Bearer ${MOCK_TOKEN}`,
      )
    })

    it('throws when there is no active session', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
      } as ReturnType<typeof supabase.auth.getSession> extends Promise<infer T> ? T : never)

      await expect(apiGet('/workouts')).rejects.toThrow('No active session')
    })
  })

  describe('URL construction', () => {
    it('calls the correct /api/v1/ base URL', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [],
      })
      vi.stubGlobal('fetch', mockFetch)

      await apiGet('/workouts')

      const [url] = mockFetch.mock.calls[0] as [string, RequestInit]
      expect(url).toBe('/api/v1/workouts')
    })
  })

  describe('Success response parsing', () => {
    it('returns parsed JSON on successful GET', async () => {
      const payload = [{ id: '1', title: 'Test' }]
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => payload,
        }),
      )

      const result = await apiGet('/workouts')
      expect(result).toEqual(payload)
    })

    it('returns parsed JSON on successful POST', async () => {
      const payload = { id: '3', title: 'New' }
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => payload,
        }),
      )

      const result = await apiPost('/workouts', { title: 'New' })
      expect(result).toEqual(payload)
    })
  })

  describe('Error response parsing', () => {
    it('throws with standardized error shape when API returns error JSON', async () => {
      const errorBody = {
        error: {
          code: 'NOT_FOUND',
          message: 'Workout not found',
          details: null,
        },
      }
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 404,
          json: async () => errorBody,
        }),
      )

      await expect(apiGet('/workouts/999')).rejects.toEqual(errorBody)
    })

    it('throws with HTTP_ERROR code when response is not JSON', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 500,
          json: async () => {
            throw new Error('Not JSON')
          },
        }),
      )

      await expect(apiGet('/workouts')).rejects.toMatchObject({
        error: { code: 'HTTP_ERROR', message: 'Request failed with status 500' },
      })
    })

    it('includes Content-Type header on POST', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({}),
      })
      vi.stubGlobal('fetch', mockFetch)

      await apiPost('/workouts', { title: 'Test' })

      const [, options] = mockFetch.mock.calls[0] as [string, RequestInit]
      expect((options.headers as Record<string, string>)['Content-Type']).toBe('application/json')
    })
  })
})
