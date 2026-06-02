import { supabase } from './supabase'

export interface EdgeFunctionOptions {
  name: string
  body: unknown
  accessToken?: string
}

/**
 * Invoke a Supabase Edge Function using fetch, returning parsed JSON data.
 *
 * Unlike `supabase.functions.invoke`, this gives full control over response
 * body parsing on non-2xx status codes — the actual `{ error: { code, message } }`
 * shape is preserved instead of being wrapped in a generic Error.
 *
 * @throws Error with human-readable message extracted from the error body.
 */
export async function invokeFunction<T>({ name, body, accessToken }: EdgeFunctionOptions): Promise<T> {
  const token = accessToken ?? (await supabase.auth.getSession()).data.session?.access_token
  if (!token) {
    throw new Error('Not authenticated')
  }

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${name}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    },
  )

  const data = await response.json()

  if (!response.ok) {
    const message = data?.error?.message ?? response.statusText
    throw new Error(message)
  }

  return data as T
}