// @ts-nocheck — Deno global types not available in editor
/**
 * Integration tests for bjj-section-ai Edge Function.
 *
 * These tests require the function to be served first:
 *   supabase functions serve bjj-section-ai --env-file .env.local
 *
 * Then run in a separate terminal:
 *   deno test --allow-net --allow-env supabase/functions/bjj-section-ai/__tests__/index.test.ts
 *
 * The function is exercised via real HTTP requests to localhost:8000.
 */

import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRequest(opts: {
  method?: string
  authHeader?: string | null
  body?: unknown
}): Request {
  const { method = 'POST', authHeader = 'Bearer valid-token', body } = opts
  const headers = new Headers({ 'Content-Type': 'application/json' })
  if (authHeader) headers.set('Authorization', authHeader)

  return new Request('http://localhost:8000/bjj-section-ai', {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
}

// ── Deno.env stubs (used to configure the served function instance) ───────────

const originalEnvGet = Deno.env.get.bind(Deno.env)

function stubEnvNoOpenAI() {
  Deno.env.get = (key: string) => {
    if (key === 'SUPABASE_URL') return 'http://localhost:54321'
    if (key === 'SUPABASE_SERVICE_ROLE_KEY') return 'service-role-key'
    if (key === 'OPENAI_API_KEY') return undefined
    return originalEnvGet(key)
  }
}

function stubEnvWithOpenAI() {
  Deno.env.get = (key: string) => {
    if (key === 'SUPABASE_URL') return 'http://localhost:54321'
    if (key === 'SUPABASE_SERVICE_ROLE_KEY') return 'service-role-key'
    if (key === 'OPENAI_API_KEY') return 'sk-test-key'
    return originalEnvGet(key)
  }
}

function restoreEnv() {
  Deno.env.get = originalEnvGet
}

// ── Tests — require `supabase functions serve bjj-section-ai` running ──────────

Deno.test('bjj-section-ai: missing Authorization header → 401 (REQ-402)', async () => {
  const req = makeRequest({ authHeader: null })
  stubEnvNoOpenAI()
  try {
    const resp = await fetch('http://localhost:8000/bjj-section-ai', req)
    assertEquals(resp.status, 401)
    const body = await resp.json()
    assertEquals(body.error.code, 'UNAUTHORIZED')
    await resp.body?.cancel()
  } finally {
    restoreEnv()
  }
})

Deno.test('bjj-section-ai: OPTIONS preflight → 200 ok', async () => {
  const req = new Request('http://localhost:8000/bjj-section-ai', { method: 'OPTIONS' })
  stubEnvNoOpenAI()
  try {
    const resp = await fetch('http://localhost:8000/bjj-section-ai', req)
    assertEquals(resp.status, 200)
    await resp.body?.cancel()
  } finally {
    restoreEnv()
  }
})

Deno.test('bjj-section-ai: non-POST method → 405', async () => {
  const req = makeRequest({ method: 'GET' })
  stubEnvNoOpenAI()
  try {
    const resp = await fetch('http://localhost:8000/bjj-section-ai', req)
    assertEquals(resp.status, 405)
    await resp.body?.cancel()
  } finally {
    restoreEnv()
  }
})

Deno.test('bjj-section-ai: missing section_goal → 400', async () => {
  const req = makeRequest({
    body: {
      raw_description: 'Worked on passing the guard from half guard position',
    },
  })
  stubEnvNoOpenAI()
  try {
    const resp = await fetch('http://localhost:8000/bjj-section-ai', req)
    assertEquals(resp.status, 400)
    const body = await resp.json()
    assertEquals(body.error.code, 'BAD_REQUEST')
    await resp.body?.cancel()
  } finally {
    restoreEnv()
  }
})

Deno.test(
  'bjj-section-ai: mock fallback when OPENAI_API_KEY absent → 200 with valid shape (REQ-411)',
  async () => {
    const req = makeRequest({
      body: {
        section_goal: 'Guard passing',
        raw_description: 'Drilled the knee slice pass from half guard position',
      },
    })
    stubEnvNoOpenAI()
    try {
      const resp = await fetch('http://localhost:8000/bjj-section-ai', req)
      assertEquals(resp.status, 200)
      const body = await resp.json()
      assertEquals(typeof body.ai_description, 'string')
      assertEquals(body.ai_description.length > 0, true)
      assertEquals(Array.isArray(body.matched_technique_ids), true)
      await resp.body?.cancel()
    } finally {
      restoreEnv()
    }
  },
)

Deno.test('bjj-section-ai: invalid AI response shape → 422 (REQ-409)', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async (_input: RequestInfo | URL, _init?: RequestInit) => {
    return new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify({
                wrong_field: 'some value',
                matched_technique_ids: [],
              }),
            },
          },
        ],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  }

  stubEnvWithOpenAI()
  try {
    const resp = await fetch('http://localhost:8000/bjj-section-ai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer valid-token',
      },
      body: JSON.stringify({
        section_goal: 'Guard passing',
        raw_description: 'Drilled the knee slice pass from half guard position',
      }),
    })
    assertEquals(resp.status, 422)
    const body = await resp.json()
    assertEquals(body.error.code, 'UNPROCESSABLE_ENTITY')
    await resp.body?.cancel()
  } finally {
    globalThis.fetch = originalFetch
    restoreEnv()
  }
})
