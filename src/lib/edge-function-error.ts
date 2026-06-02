/** Extract a human-readable message from Supabase Edge Function JSON responses. */
export function getEdgeFunctionErrorMessage(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null

  const record = data as { error?: string | { message?: string } }

  if (typeof record.error === 'string') {
    return record.error
  }

  if (record.error && typeof record.error === 'object' && record.error.message) {
    return record.error.message
  }

  return null
}
