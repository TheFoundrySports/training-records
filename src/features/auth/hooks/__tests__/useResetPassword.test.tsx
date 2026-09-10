import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useResetPassword } from '../useResetPassword'

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

describe('useResetPassword', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls invokeFunction with reset-password and token/password', async () => {
    const queryClient = makeQueryClient()
    mockInvokeFunction.mockResolvedValueOnce({ success: true })

    const { result } = renderHook(() => useResetPassword(), {
      wrapper: makeWrapper(queryClient),
    })

    await result.current.resetPassword({
      token: 'reset-token-123',
      new_password: 'NewPassword1!',
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockInvokeFunction).toHaveBeenCalledWith({
      name: 'reset-password',
      body: { token: 'reset-token-123', new_password: 'NewPassword1!' },
    })
  })

  it('returns isSuccess true on successful reset', async () => {
    const queryClient = makeQueryClient()
    mockInvokeFunction.mockResolvedValueOnce({ success: true })

    const { result } = renderHook(() => useResetPassword(), {
      wrapper: makeWrapper(queryClient),
    })

    await result.current.resetPassword({
      token: 'reset-token-123',
      new_password: 'NewPassword1!',
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.isError).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('throws error for weak password (too short)', async () => {
    const queryClient = makeQueryClient()

    const { result } = renderHook(() => useResetPassword(), {
      wrapper: makeWrapper(queryClient),
    })

    try {
      await result.current.resetPassword({
        token: 'reset-token-123',
        new_password: 'Pass1!',
      })
    } catch {
      // Expected
    }

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBe('Password must be at least 8 characters')
    // Should not call invokeFunction for weak passwords
    expect(mockInvokeFunction).not.toHaveBeenCalled()
  })

  it('throws error for weak password (no uppercase)', async () => {
    const queryClient = makeQueryClient()

    const { result } = renderHook(() => useResetPassword(), {
      wrapper: makeWrapper(queryClient),
    })

    try {
      await result.current.resetPassword({
        token: 'reset-token-123',
        new_password: 'password1!',
      })
    } catch {
      // Expected
    }

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBe('Password must contain an uppercase letter')
    expect(mockInvokeFunction).not.toHaveBeenCalled()
  })

  it('throws error for weak password (no number)', async () => {
    const queryClient = makeQueryClient()

    const { result } = renderHook(() => useResetPassword(), {
      wrapper: makeWrapper(queryClient),
    })

    try {
      await result.current.resetPassword({
        token: 'reset-token-123',
        new_password: 'Password!',
      })
    } catch {
      // Expected
    }

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBe('Password must contain a number')
    expect(mockInvokeFunction).not.toHaveBeenCalled()
  })

  it('throws error for weak password (no symbol)', async () => {
    const queryClient = makeQueryClient()

    const { result } = renderHook(() => useResetPassword(), {
      wrapper: makeWrapper(queryClient),
    })

    try {
      await result.current.resetPassword({
        token: 'reset-token-123',
        new_password: 'Password1',
      })
    } catch {
      // Expected
    }

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBe('Password must contain a symbol (!@#$%^&*(),.?"{}|<>)')
    expect(mockInvokeFunction).not.toHaveBeenCalled()
  })

  it('throws error when edge function returns error', async () => {
    const queryClient = makeQueryClient()
    mockInvokeFunction.mockResolvedValueOnce({
      error: { code: 'INVALID_TOKEN', message: 'Reset link is invalid or has expired' },
    })

    const { result } = renderHook(() => useResetPassword(), {
      wrapper: makeWrapper(queryClient),
    })

    try {
      await result.current.resetPassword({
        token: 'invalid-token',
        new_password: 'NewPassword1!',
      })
    } catch {
      // Expected
    }

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBe('Reset link is invalid or has expired')
  })

  it('throws error when edge function invocation fails', async () => {
    const queryClient = makeQueryClient()
    mockInvokeFunction.mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(() => useResetPassword(), {
      wrapper: makeWrapper(queryClient),
    })

    try {
      await result.current.resetPassword({
        token: 'reset-token-123',
        new_password: 'NewPassword1!',
      })
    } catch {
      // Expected
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

    const { result } = renderHook(() => useResetPassword(), {
      wrapper: makeWrapper(queryClient),
    })

    // Start the request
    const requestPromise = result.current.resetPassword({
      token: 'reset-token-123',
      new_password: 'NewPassword1!',
    })

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

    const { result } = renderHook(() => useResetPassword({ onSuccess }), {
      wrapper: makeWrapper(queryClient),
    })

    await result.current.resetPassword({
      token: 'reset-token-123',
      new_password: 'NewPassword1!',
    })

    await waitFor(() => expect(onSuccess).toHaveBeenCalled())
  })

  it('calls onError callback when provided', async () => {
    const queryClient = makeQueryClient()
    mockInvokeFunction.mockResolvedValueOnce({
      error: { code: 'ERROR', message: 'Something went wrong' },
    })
    const onError = vi.fn()

    const { result } = renderHook(() => useResetPassword({ onError }), {
      wrapper: makeWrapper(queryClient),
    })

    try {
      await result.current.resetPassword({
        token: 'reset-token-123',
        new_password: 'NewPassword1!',
      })
    } catch {
      // Expected
    }

    await waitFor(() => expect(onError).toHaveBeenCalledWith('Something went wrong'))
  })
})
