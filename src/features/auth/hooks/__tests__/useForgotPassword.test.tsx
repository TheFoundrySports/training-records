import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useForgotPassword } from '../useForgotPassword'

// ── Mock edge-function.ts ─────────────────────────────────────────────────────

const mockInvokeFunction = vi.fn()

vi.mock('@/lib/edge-function', () => ({
  invokeFunction: (...args: unknown[]) => mockInvokeFunction(...args),
}))

// ── Helpers ─────────────────────────────────────────────────────────────────

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

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useForgotPassword', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls invokeFunction with request-password-reset and email', async () => {
    const queryClient = makeQueryClient()
    mockInvokeFunction.mockResolvedValueOnce({ success: true })

    const { result } = renderHook(() => useForgotPassword(), {
      wrapper: makeWrapper(queryClient),
    })

    await result.current.requestReset('test@example.com')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockInvokeFunction).toHaveBeenCalledWith({
      name: 'request-password-reset',
      body: { email: 'test@example.com' },
    })
  })

  it('returns isSuccess true on successful request', async () => {
    const queryClient = makeQueryClient()
    mockInvokeFunction.mockResolvedValueOnce({ success: true })

    const { result } = renderHook(() => useForgotPassword(), {
      wrapper: makeWrapper(queryClient),
    })

    await result.current.requestReset('test@example.com')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.isError).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('throws error and sets isError when edge function returns error', async () => {
    const queryClient = makeQueryClient()
    mockInvokeFunction.mockResolvedValueOnce({
      error: { code: 'BAD_REQUEST', message: 'Invalid email address' },
    })

    const { result } = renderHook(() => useForgotPassword(), {
      wrapper: makeWrapper(queryClient),
    })

    try {
      await result.current.requestReset('invalid-email')
    } catch {
      // Expected - error is thrown
    }

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toBe('Invalid email address')
  })

  it('throws error when edge function invocation fails', async () => {
    const queryClient = makeQueryClient()
    mockInvokeFunction.mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(() => useForgotPassword(), {
      wrapper: makeWrapper(queryClient),
    })

    try {
      await result.current.requestReset('test@example.com')
    } catch {
      // Expected - error is thrown
    }

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toBe('Network error')
  })

  it('sets isLoading during the request', async () => {
    const queryClient = makeQueryClient()
    let resolvePromise: () => void
    const promise = new Promise<{ success: boolean }>((resolve) => {
      resolvePromise = () => resolve({ success: true })
    })
    mockInvokeFunction.mockReturnValue(promise)

    const { result } = renderHook(() => useForgotPassword(), {
      wrapper: makeWrapper(queryClient),
    })

    // Start the request
    const requestPromise = result.current.requestReset('test@example.com')

    // Wait for loading state to be true
    await waitFor(() => expect(result.current.isLoading).toBe(true))

    // Resolve the promise
    resolvePromise!()
    await requestPromise

    await waitFor(() => expect(result.current.isLoading).toBe(false))
  })

  it('calls onSuccess callback when provided', async () => {
    const queryClient = makeQueryClient()
    mockInvokeFunction.mockResolvedValueOnce({ success: true })
    const onSuccess = vi.fn()

    const { result } = renderHook(() => useForgotPassword({ onSuccess }), {
      wrapper: makeWrapper(queryClient),
    })

    await result.current.requestReset('test@example.com')

    await waitFor(() => expect(onSuccess).toHaveBeenCalled())
  })

  it('calls onError callback when provided', async () => {
    const queryClient = makeQueryClient()
    mockInvokeFunction.mockResolvedValueOnce({
      error: { code: 'ERROR', message: 'Something went wrong' },
    })
    const onError = vi.fn()

    const { result } = renderHook(() => useForgotPassword({ onError }), {
      wrapper: makeWrapper(queryClient),
    })

    try {
      await result.current.requestReset('test@example.com')
    } catch {
      // Expected
    }

    await waitFor(() => expect(onError).toHaveBeenCalledWith('Something went wrong'))
  })
})
