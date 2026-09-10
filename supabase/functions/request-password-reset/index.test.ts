// @ts-nocheck — Deno global types not available in editor
/**
 * Unit tests for request-password-reset Edge Function.
 *
 * Run with:
 *   cd supabase/functions/request-password-reset
 *   deno test --allow-all index.test.ts
 */

import { assertEquals, assertExists } from 'https://deno.land/std@0.208.0/assert/mod.ts'

// ── Types for mock ─────────────────────────────────────────────────────────────

interface MockOptions {
  userFound?: boolean
  userEmail?: string
  generateLinkError?: boolean
  generateLinkErrorMessage?: string
  emailFetchError?: boolean
}

// ── Mock factory ─────────────────────────────────────────────────────────────

function makeMockSupabase(opts: MockOptions = {}) {
  const {
    userFound = false,
    userEmail = 'test@example.com',
    generateLinkError = false,
    generateLinkErrorMessage = 'Failed to generate link',
    emailFetchError = false,
  } = opts

  const mockUsers = userFound ? { users: [{ id: 'user-123', email: userEmail }] } : { users: [] }

  return {
    auth: {
      admin: {
        listUsers: () =>
          Promise.resolve({
            data: mockUsers,
            error: null,
          }),
        generateLink: (..._args: unknown[]) =>
          generateLinkError
            ? Promise.resolve({
                data: null,
                error: { message: generateLinkErrorMessage },
              })
            : Promise.resolve({
                data: {
                  properties: {
                    hashed_token: 'test-hashed-token-abc123',
                    action_link: 'http://localhost:5173/login?token=test',
                  },
                },
                error: null,
              }),
      },
    },
  }
}

// Mock fetch for send-email calls
let mockFetch: typeof fetch
let fetchCalls: { url: string; options: RequestInit }[]

function setupFetchMock(opts: { error?: boolean } = {}) {
  fetchCalls = []
  mockFetch = async (url: string, options: RequestInit) => {
    fetchCalls.push({ url, options })
    if (opts.error) {
      throw new Error('Network error')
    }
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  // @ts-ignore - replace global fetch for testing
  globalThis.fetch = mockFetch
}

function restoreFetch() {
  globalThis.fetch = fetch
}

// ── Environment stub ─────────────────────────────────────────────────────────

function stubEnv() {
  const original = Deno.env.get.bind(Deno.env)
  // @ts-ignore Deno global
  Deno.env.get = (key: string) => {
    if (key === 'SUPABASE_URL') return 'http://localhost:54321'
    if (key === 'SUPABASE_SERVICE_ROLE_KEY') return 'service-role-key'
    if (key === 'APP_URL') return 'http://localhost:5173'
    return original(key)
  }
}

function restoreEnv() {
  Deno.env.get = Deno.env.get.bind(Deno.env)
}

// ── Tests ─────────────────────────────────────────────────────────────────────

Deno.test(
  'request-password-reset: returns success for non-existent user (email enumeration prevention)',
  async () => {
    stubEnv()
    setupFetchMock()
    try {
      const mockSupabase = makeMockSupabase({ userFound: false })
      // @ts-ignore - module-level injection for testing
      globalThis.__TEST_SUPABASE__ = mockSupabase

      const req = new Request('http://localhost/functions/v1/request-password-reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer service-role-key',
        },
        body: JSON.stringify({ email: 'nonexistent@example.com' }),
      })

      // Import handler after stubbing
      const { default: handler } = await import('./index.ts')
      const resp = await handler(req)

      assertEquals(resp.status, 200)
      const body = await resp.json()
      assertEquals(body.success, true)
      // Should not have called generateLink
      assertEquals(fetchCalls.length, 0)
    } finally {
      delete globalThis.__TEST_SUPABASE__
      restoreEnv()
      restoreFetch()
    }
  },
)

Deno.test(
  'request-password-reset: generates magic link and sends email for existing user',
  async () => {
    stubEnv()
    setupFetchMock()
    try {
      const mockSupabase = makeMockSupabase({ userFound: true })
      // @ts-ignore - module-level injection for testing
      globalThis.__TEST_SUPABASE__ = mockSupabase

      const req = new Request('http://localhost/functions/v1/request-password-reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer service-role-key',
        },
        body: JSON.stringify({ email: 'test@example.com' }),
      })

      const { default: handler } = await import('./index.ts')
      const resp = await handler(req)

      assertEquals(resp.status, 200)
      const body = await resp.json()
      assertEquals(body.success, true)
      // Should have called send-email
      assertEquals(fetchCalls.length, 1)
      assertEquals(fetchCalls[0].url, 'http://localhost:54321/functions/v1/send-email')
    } finally {
      delete globalThis.__TEST_SUPABASE__
      restoreEnv()
      restoreFetch()
    }
  },
)

Deno.test('request-password-reset: returns 400 for invalid email format', async () => {
  stubEnv()
  setupFetchMock()
  try {
    const mockSupabase = makeMockSupabase()
    // @ts-ignore - module-level injection for testing
    globalThis.__TEST_SUPABASE__ = mockSupabase

    const req = new Request('http://localhost/functions/v1/request-password-reset', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer service-role-key',
      },
      body: JSON.stringify({ email: 'not-an-email' }),
    })

    const { default: handler } = await import('./index.ts')
    const resp = await handler(req)

    assertEquals(resp.status, 400)
    const body = await resp.json()
    assertExists(body.error)
    assertEquals(body.error.code, 'BAD_REQUEST')
  } finally {
    delete globalThis.__TEST_SUPABASE__
    restoreEnv()
    restoreFetch()
  }
})

Deno.test('request-password-reset: returns 400 for missing email', async () => {
  stubEnv()
  setupFetchMock()
  try {
    const mockSupabase = makeMockSupabase()
    // @ts-ignore - module-level injection for testing
    globalThis.__TEST_SUPABASE__ = mockSupabase

    const req = new Request('http://localhost/functions/v1/request-password-reset', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer service-role-key',
      },
      body: JSON.stringify({}),
    })

    const { default: handler } = await import('./index.ts')
    const resp = await handler(req)

    assertEquals(resp.status, 400)
    const body = await resp.json()
    assertExists(body.error)
    assertEquals(body.error.code, 'BAD_REQUEST')
  } finally {
    delete globalThis.__TEST_SUPABASE__
    restoreEnv()
    restoreFetch()
  }
})

Deno.test('request-password-reset: returns 400 for invalid JSON body', async () => {
  stubEnv()
  setupFetchMock()
  try {
    const mockSupabase = makeMockSupabase()
    // @ts-ignore - module-level injection for testing
    globalThis.__TEST_SUPABASE__ = mockSupabase

    const req = new Request('http://localhost/functions/v1/request-password-reset', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer service-role-key',
      },
      body: 'not valid json',
    })

    const { default: handler } = await import('./index.ts')
    const resp = await handler(req)

    assertEquals(resp.status, 400)
    const body = await resp.json()
    assertExists(body.error)
    assertEquals(body.error.code, 'BAD_REQUEST')
  } finally {
    delete globalThis.__TEST_SUPABASE__
    restoreEnv()
    restoreFetch()
  }
})

Deno.test('request-password-reset: returns 500 when generateLink fails', async () => {
  stubEnv()
  setupFetchMock()
  try {
    const mockSupabase = makeMockSupabase({ userFound: true, generateLinkError: true })
    // @ts-ignore - module-level injection for testing
    globalThis.__TEST_SUPABASE__ = mockSupabase

    const req = new Request('http://localhost/functions/v1/request-password-reset', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer service-role-key',
      },
      body: JSON.stringify({ email: 'test@example.com' }),
    })

    const { default: handler } = await import('./index.ts')
    const resp = await handler(req)

    assertEquals(resp.status, 500)
    const body = await resp.json()
    assertExists(body.error)
    assertEquals(body.error.code, 'INTERNAL_ERROR')
  } finally {
    delete globalThis.__TEST_SUPABASE__
    restoreEnv()
    restoreFetch()
  }
})

Deno.test('request-password-reset: returns 500 when send-email fails', async () => {
  stubEnv()
  setupFetchMock({ error: true })
  try {
    const mockSupabase = makeMockSupabase({ userFound: true })
    // @ts-ignore - module-level injection for testing
    globalThis.__TEST_SUPABASE__ = mockSupabase

    const req = new Request('http://localhost/functions/v1/request-password-reset', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer service-role-key',
      },
      body: JSON.stringify({ email: 'test@example.com' }),
    })

    const { default: handler } = await import('./index.ts')
    const resp = await handler(req)

    assertEquals(resp.status, 500)
    const body = await resp.json()
    assertExists(body.error)
    assertEquals(body.error.code, 'INTERNAL_ERROR')
  } finally {
    delete globalThis.__TEST_SUPABASE__
    restoreEnv()
    restoreFetch()
  }
})

Deno.test('request-password-reset: handles CORS preflight (OPTIONS)', async () => {
  stubEnv()
  setupFetchMock()
  try {
    const mockSupabase = makeMockSupabase()
    // @ts-ignore - module-level injection for testing
    globalThis.__TEST_SUPABASE__ = mockSupabase

    const req = new Request('http://localhost/functions/v1/request-password-reset', {
      method: 'OPTIONS',
    })

    const { default: handler } = await import('./index.ts')
    const resp = await handler(req)

    assertEquals(resp.status, 200)
    assertEquals(resp.headers.get('Access-Control-Allow-Origin'), '*')
  } finally {
    delete globalThis.__TEST_SUPABASE__
    restoreEnv()
    restoreFetch()
  }
})
