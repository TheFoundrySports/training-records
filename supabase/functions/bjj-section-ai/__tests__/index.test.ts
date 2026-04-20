// @ts-nocheck — Deno global types not available in editor
/**
 * Integration tests for bjj-section-ai Edge Function.
 *
 * Tests the HTTP handler with mocked Supabase client and OpenAI.
 * No real DB or OpenAI calls are made.
 *
 * Run with:
 *   deno test --allow-env supabase/functions/bjj-section-ai/__tests__/index.test.ts
 *
 * Covers: REQ-401, REQ-402, REQ-409, REQ-411, REQ-417
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

  return new Request('http://localhost/bjj-section-ai', {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
}

// ── Deno.env stub ─────────────────────────────────────────────────────────────

const originalEnvGet = Deno.env.get.bind(Deno.env)

function stubEnvNoOpenAI() {
  Deno.env.get = (key: string) => {
    if (key === 'SUPABASE_URL') return 'http://localhost:54321'
    if (key === 'SUPABASE_SERVICE_ROLE_KEY') return 'service-role-key'
    if (key === 'OPENAI_API_KEY') return undefined // triggers mock fallback
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

// ── Supabase client mock ──────────────────────────────────────────────────────

/**
 * Creates a mock Supabase client that can be injected via module-level override.
 * Mirrors the mock factory pattern in garmin-import and training-evaluation tests.
 */
function makeMockSupabase(opts: {
  authError?: boolean
  userId?: string
  techniques?: Array<{
    id: string
    name: string
    description: string | null
    category: string | null
  }>
  dbError?: boolean
}) {
  const { authError = false, userId = 'user-abc', techniques = [], dbError = false } = opts

  const fromMock = (table: string) => {
    if (table === 'bjj_techniques') {
      return {
        select: () => ({
          or: () => ({
            limit: () =>
              dbError
                ? Promise.resolve({
                    data: null,
                    error: { message: 'DB error', code: 'DB_ERR', details: null },
                  })
                : Promise.resolve({ data: techniques, error: null }),
          }),
        }),
      }
    }
    return {}
  }

  return {
    auth: {
      getUser: () =>
        authError
          ? Promise.resolve({ data: { user: null }, error: { message: 'Invalid token' } })
          : Promise.resolve({ data: { user: { id: userId } }, error: null }),
    },
    from: fromMock,
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

Deno.test('bjj-section-ai: missing Authorization header → 401 (REQ-402)', async () => {
  const req = makeRequest({ authHeader: null })

  stubEnvNoOpenAI()
  try {
    const { default: handler } = await import('../index.ts')
    const resp = await handler(req)
    assertEquals(resp.status, 401)

    const body = await resp.json()
    assertEquals(body.error.code, 'UNAUTHORIZED')
  } finally {
    restoreEnv()
  }
})

Deno.test('bjj-section-ai: OPTIONS preflight → 200 ok', async () => {
  const req = new Request('http://localhost/bjj-section-ai', { method: 'OPTIONS' })

  stubEnvNoOpenAI()
  try {
    const { default: handler } = await import('../index.ts')
    const resp = await handler(req)
    assertEquals(resp.status, 200)
  } finally {
    restoreEnv()
  }
})

Deno.test('bjj-section-ai: non-POST method → 405', async () => {
  const req = makeRequest({ method: 'GET' })

  stubEnvNoOpenAI()
  try {
    const { default: handler } = await import('../index.ts')
    const resp = await handler(req)
    assertEquals(resp.status, 405)
  } finally {
    restoreEnv()
  }
})

Deno.test('bjj-section-ai: missing raw_description body → 400 (REQ-417)', async () => {
  const req = makeRequest({ body: { section_goal: 'Guard retention' } })

  stubEnvNoOpenAI()
  try {
    const { default: handler } = await import('../index.ts')
    const resp = await handler(req)
    assertEquals(resp.status, 400)

    const body = await resp.json()
    assertEquals(body.error.code, 'BAD_REQUEST')
  } finally {
    restoreEnv()
  }
})

Deno.test('bjj-section-ai: raw_description shorter than 10 chars → 400 (REQ-417)', async () => {
  const req = makeRequest({
    body: {
      section_goal: 'Guard retention',
      raw_description: 'Short',
    },
  })

  stubEnvNoOpenAI()
  try {
    const { default: handler } = await import('../index.ts')
    const resp = await handler(req)
    assertEquals(resp.status, 400)

    const body = await resp.json()
    assertEquals(body.error.code, 'BAD_REQUEST')
    assertEquals(body.error.message.toLowerCase().includes('short'), true)
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
    const { default: handler } = await import('../index.ts')
    const resp = await handler(req)
    assertEquals(resp.status, 400)

    const body = await resp.json()
    assertEquals(body.error.code, 'BAD_REQUEST')
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
      const { default: handler } = await import('../index.ts')
      const resp = await handler(req)
      assertEquals(resp.status, 200)

      const body = await resp.json()
      // REQ-411: mock must return valid response shape
      assertEquals(typeof body.ai_description, 'string')
      assertEquals(body.ai_description.length > 0, true)
      assertEquals(Array.isArray(body.matched_technique_ids), true)
    } finally {
      restoreEnv()
    }
  },
)

Deno.test('bjj-section-ai: invalid OpenAI response shape → 422 (REQ-409)', async () => {
  // Stub fetch to return a malformed OpenAI response (missing ai_description)
  const originalFetch = globalThis.fetch
  globalThis.fetch = async (_input: RequestInfo | URL, _init?: RequestInit) => {
    return new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify({
                // Intentionally missing ai_description — only has wrong_field
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
    const { default: handler } = await import('../index.ts')
    const req = makeRequest({
      body: {
        section_goal: 'Guard passing',
        raw_description: 'Drilled the knee slice pass from half guard position',
      },
    })
    const resp = await handler(req)
    assertEquals(resp.status, 422)

    const body = await resp.json()
    assertEquals(body.error.code, 'UNPROCESSABLE_ENTITY')
  } finally {
    globalThis.fetch = originalFetch
    restoreEnv()
  }
})
