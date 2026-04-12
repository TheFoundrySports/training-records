// @ts-nocheck — Deno global types not available in editor
/**
 * Integration tests for training-evaluation Edge Function.
 *
 * Tests the HTTP handler logic with mocked Supabase and OpenAI responses.
 *
 * Run with:
 *   supabase functions serve training-evaluation
 *   deno test --allow-env supabase/functions/training-evaluation/index.test.ts
 */

import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts'

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(opts: {
  method?: string
  authHeader?: string | null
  body?: unknown
}): Request {
  const { method = 'POST', authHeader = 'Bearer valid-token', body } = opts
  const headers = new Headers({ 'Content-Type': 'application/json' })
  if (authHeader) headers.set('Authorization', authHeader)

  return new Request('http://localhost/training-evaluation', {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
}

// ── Stub Deno.env ─────────────────────────────────────────────────────────────

const originalEnvGet = Deno.env.get.bind(Deno.env)
function stubEnvNoOpenAI() {
  Deno.env.get = (key: string) => {
    if (key === 'SUPABASE_URL') return 'http://localhost:54321'
    if (key === 'SUPABASE_SERVICE_ROLE_KEY') return 'service-role-key'
    if (key === 'OPENAI_API_KEY') return undefined // No API key → triggers mock path
    return originalEnvGet(key)
  }
}
function restoreEnv() {
  Deno.env.get = originalEnvGet
}

// ── Test cases ────────────────────────────────────────────────────────────────

Deno.test('training-evaluation: missing Authorization header → 401', async () => {
  const req = makeRequest({ authHeader: null })

  stubEnvNoOpenAI()
  try {
    const { default: handler } = await import('./index.ts')
    const resp = await handler(req)
    assertEquals(resp.status, 401)

    const body = await resp.json()
    assertEquals(body.error.code, 'UNAUTHORIZED')
  } finally {
    restoreEnv()
  }
})

Deno.test('training-evaluation: OPTIONS preflight → 200 ok', async () => {
  const req = new Request('http://localhost/training-evaluation', { method: 'OPTIONS' })

  stubEnvNoOpenAI()
  try {
    const { default: handler } = await import('./index.ts')
    const resp = await handler(req)
    assertEquals(resp.status, 200)
  } finally {
    restoreEnv()
  }
})

Deno.test('training-evaluation: non-POST method → 405', async () => {
  const req = makeRequest({ method: 'GET' })

  stubEnvNoOpenAI()
  try {
    const { default: handler } = await import('./index.ts')
    const resp = await handler(req)
    assertEquals(resp.status, 405)
  } finally {
    restoreEnv()
  }
})

Deno.test('training-evaluation: missing garmin_activity_id in body → 400', async () => {
  const req = makeRequest({ body: {} })

  stubEnvNoOpenAI()
  try {
    const { default: handler } = await import('./index.ts')
    const resp = await handler(req)
    assertEquals(resp.status, 400)

    const body = await resp.json()
    assertEquals(body.error.code, 'BAD_REQUEST')
  } finally {
    restoreEnv()
  }
})
