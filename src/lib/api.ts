import { supabase } from './supabase'

const API_BASE = '/api/v1'

export interface ApiError {
  error: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
}

async function getAuthHeader(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.access_token) {
    throw new Error('No active session')
  }
  return {
    Authorization: `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorBody: ApiError
    try {
      errorBody = (await response.json()) as ApiError
    } catch {
      errorBody = {
        error: {
          code: 'HTTP_ERROR',
          message: `Request failed with status ${response.status}`,
        },
      }
    }
    throw errorBody
  }
  return response.json() as Promise<T>
}

export async function apiGet<T>(path: string): Promise<T> {
  const headers = await getAuthHeader()
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'GET',
    headers,
  })
  return handleResponse<T>(response)
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const headers = await getAuthHeader()
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
  return handleResponse<T>(response)
}

export async function apiPut<T>(path: string, body: unknown): Promise<T> {
  const headers = await getAuthHeader()
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(body),
  })
  return handleResponse<T>(response)
}

export async function apiDelete<T = void>(path: string): Promise<T> {
  const headers = await getAuthHeader()
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'DELETE',
    headers,
  })
  return handleResponse<T>(response)
}
