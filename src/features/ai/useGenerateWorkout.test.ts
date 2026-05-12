import { describe, it, expect, vi } from 'vitest'
import { extractEdgeFunctionError } from './useGenerateWorkout'

/**
 * extractEdgeFunctionError is a pure function — tested directly.
 * It extracts the error message from a Supabase FunctionsHttpError response body.
 */

class MockFunctionsHttpError extends Error {
  response: {
    clone: () => { json: () => Promise<unknown> }
  }

  constructor(message: string, response: { clone: () => { json: () => Promise<unknown> } }) {
    super(message)
    this.name = 'FunctionsHttpError'
    this.response = response
  }
}

describe('extractEdgeFunctionError', () => {
  it('extracts message from error.response.clone().json() body', async () => {
    const mockJsonBody = { error: { code: 'AI_ERROR', message: 'OpenAI API error: 502' } }
    const mockClone = {
      json: vi.fn().mockResolvedValue(mockJsonBody),
    }
    const mockResponse = {
      clone: vi.fn().mockReturnValue(mockClone),
      ok: false,
      status: 502,
    }
    const mockError = new MockFunctionsHttpError(
      'AI Edge Function returned a non-2xx status code error',
      mockResponse,
    )

    const result = await extractEdgeFunctionError(mockError)

    expect(result).toBe('OpenAI API error: 502')
    expect(mockResponse.clone).toHaveBeenCalled()
    expect(mockClone.json).toHaveBeenCalled()
  })

  it('falls back to error.message when response.clone().json() fails', async () => {
    const mockClone = {
      json: vi.fn().mockRejectedValue(new Error('JSON parse error')),
    }
    const mockResponse = {
      clone: vi.fn().mockReturnValue(mockClone),
      ok: false,
      status: 500,
    }
    const mockError = new MockFunctionsHttpError('Some fallback error message', mockResponse)

    const result = await extractEdgeFunctionError(mockError)

    expect(result).toBe('Some fallback error message')
  })

  it('falls back to error.message when response is undefined', async () => {
    const mockError = new Error('No response available')

    const result = await extractEdgeFunctionError(mockError)

    expect(result).toBe('No response available')
  })

  it('extracts message from 401 auth error body', async () => {
    const mockJsonBody = { error: { code: 'AUTH_ERROR', message: 'Invalid or expired token' } }
    const mockClone = {
      json: vi.fn().mockResolvedValue(mockJsonBody),
    }
    const mockResponse = {
      clone: vi.fn().mockReturnValue(mockClone),
      ok: false,
      status: 401,
    }
    const mockError = new MockFunctionsHttpError(
      'AI Edge Function returned a non-2xx status code error',
      mockResponse,
    )

    const result = await extractEdgeFunctionError(mockError)

    expect(result).toBe('Invalid or expired token')
  })

  it('extracts message from 400 bad request body', async () => {
    const mockJsonBody = { error: { message: 'prompt is required' } }
    const mockClone = {
      json: vi.fn().mockResolvedValue(mockJsonBody),
    }
    const mockResponse = {
      clone: vi.fn().mockReturnValue(mockClone),
      ok: false,
      status: 400,
    }
    const mockError = new MockFunctionsHttpError(
      'AI Edge Function returned a non-2xx status code error',
      mockResponse,
    )

    const result = await extractEdgeFunctionError(mockError)

    expect(result).toBe('prompt is required')
  })
})