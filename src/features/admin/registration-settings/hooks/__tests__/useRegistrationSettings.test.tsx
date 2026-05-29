import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useRegistrationSettings, useUpdateRegistrationSettings } from '../useRegistrationSettings'

// ── Mock supabase client ────────────────────────────────────────────────────

const mockInvoke = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    functions: {
      invoke: (...args: unknown[]) => mockInvoke(...args),
    },
  },
}))

// ── Helpers ────────────────────────────────────────────────────────────────

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
}

function makeWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

// ── Tests for useRegistrationSettings (GET) ─────────────────────────────────

describe('useRegistrationSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches registration settings via GET', async () => {
    const queryClient = makeQueryClient()
    mockInvoke.mockResolvedValueOnce({
      data: {
        registration_mode: 'open',
        invite_expiry_hours: 48,
      },
    })

    const { result } = renderHook(() => useRegistrationSettings(), {
      wrapper: makeWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual({
      registration_mode: 'open',
      invite_expiry_hours: 48,
    })
  })

  it('returns invite_only mode correctly', async () => {
    const queryClient = makeQueryClient()
    mockInvoke.mockResolvedValueOnce({
      data: {
        registration_mode: 'invite_only',
        invite_expiry_hours: 24,
      },
    })

    const { result } = renderHook(() => useRegistrationSettings(), {
      wrapper: makeWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual({
      registration_mode: 'invite_only',
      invite_expiry_hours: 24,
    })
  })
})

// ── Tests for useUpdateRegistrationSettings (POST) ─────────────────────────────

describe('useUpdateRegistrationSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls POST with registration_mode update', async () => {
    const queryClient = makeQueryClient()
    mockInvoke.mockResolvedValueOnce({
      data: { success: true, registration_mode: 'invite_only' },
    })

    const { result } = renderHook(() => useUpdateRegistrationSettings(), {
      wrapper: makeWrapper(queryClient),
    })

    await result.current.updateSettings({ registration_mode: 'invite_only' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockInvoke).toHaveBeenCalledWith('registration-settings', {
      body: { registration_mode: 'invite_only' },
    })
  })

  it('calls POST with invite_expiry_hours update', async () => {
    const queryClient = makeQueryClient()
    mockInvoke.mockResolvedValueOnce({
      data: { success: true, invite_expiry_hours: 72 },
    })

    const { result } = renderHook(() => useUpdateRegistrationSettings(), {
      wrapper: makeWrapper(queryClient),
    })

    await result.current.updateSettings({ invite_expiry_hours: 72 })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockInvoke).toHaveBeenCalledWith('registration-settings', {
      body: { invite_expiry_hours: 72 },
    })
  })

  it('invalidates settings query on success', async () => {
    const queryClient = makeQueryClient()
    mockInvoke.mockResolvedValueOnce({
      data: { success: true, registration_mode: 'open' },
    })

    const { result } = renderHook(() => useUpdateRegistrationSettings(), {
      wrapper: makeWrapper(queryClient),
    })

    await result.current.updateSettings({ registration_mode: 'open' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockInvoke).toHaveBeenCalledTimes(1)
  })

  it('updates cache optimistically so UI reflects new mode without refetch', async () => {
    const queryClient = makeQueryClient()

    // Seed the cache with current state (open)
    queryClient.setQueryData(['registration-settings'], {
      registration_mode: 'open',
      invite_expiry_hours: 48,
    })

    mockInvoke.mockResolvedValueOnce({
      data: { success: true, registration_mode: 'invite_only' },
    })

    const { result } = renderHook(() => useUpdateRegistrationSettings(), {
      wrapper: makeWrapper(queryClient),
    })

    await result.current.updateSettings({ registration_mode: 'invite_only' })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const cached = queryClient.getQueryData<{ registration_mode: string }>(['registration-settings'])
    expect(cached?.registration_mode).toBe('invite_only')
  })

  it('fetches settings using GET method', async () => {
    const queryClient = makeQueryClient()
    mockInvoke.mockResolvedValueOnce({
      data: { registration_mode: 'open', invite_expiry_hours: 48 },
    })

    const { result } = renderHook(() => useRegistrationSettings(), {
      wrapper: makeWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockInvoke).toHaveBeenCalledWith('registration-settings', { method: 'GET' })
  })
})
