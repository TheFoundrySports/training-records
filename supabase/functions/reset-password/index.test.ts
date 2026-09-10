// @ts-nocheck — Deno global types not available in editor
/**
 * Unit tests for reset-password Edge Function.
 *
 * Run with:
 *   cd supabase/functions/reset-password
 *   deno test --allow-all index.test.ts
 */

import { assertEquals, assertExists } from 'https://deno.land/std@0.208.0/assert/mod.ts'

// ── Types for mock ─────────────────────────────────────────────────────────────

interface MockOptions {
  userId?: string
  userEmail?: string
  verifyTokenError?: boolean
  verifyTokenErrorMessage?: string
  updatePasswordError?: boolean
  updatePasswordErrorMessage?: string
}

// ── Mock factory ─────────────────────────────────────────────────────────────

function makeMockSupabase(opts: MockOptions = {}) {
  const {
    userId = 'user-123',
    userEmail = 'test@example.com',
    verifyTokenError = false,
    verifyTokenErrorMessage = 'Invalid or expired token',
    updatePasswordError = false,
    updatePasswordErrorMessage = 'Failed to update password',
  } = opts

  return {
    auth: {
      admin: {
        getUserByLink: (..._args: unknown[]) =>
          verifyTokenError
            ? Promise.resolve({
                data: null,
                error: { message: verifyTokenErrorMessage },
              })
            : Promise.resolve({
                data: {
                  id: userId,
                  email: userEmail,
                },
                error: null,
              }),
        updateUserById: (..._args: unknown[]) =>
          updatePasswordError
            ? Promise.resolve({
                data: null,
                error: { message: updatePasswordErrorMessage },
              })
            : Promise.resolve({
                data: { id: userId },
                error: null,
              }),
      },
    },
  }
}

// ── Environment stub ─────────────────────────────────────────────────────────

function stubEnv() {
  const original = Deno.env.get.bind(Deno.env)
  // @ts-ignore Deno global
  Deno.env.get = (key: string) => {
    if (key === 'SUPABASE_URL') return 'http://localhost:54321'
    if (key === 'SUPABASE_SERVICE_ROLE_KEY') return 'service-role-key'
    return original(key)
  }
}

function restoreEnv() {
  Deno.env.get = Deno.env.get.bind(Deno.env)
}

// ── Tests ─────────────────────────────────────────────────────────────────────

Deno.test('reset-password: successfully resets password with valid token', async () => {
  stubEnv()
  try {
    const mockSupabase = makeMockSupabase({})
    // @ts-ignore - module-level injection for testing
    globalThis.__TEST_SUPABASE__ = mockSupabase

    const req = new Request('http://localhost/functions/v1/reset-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer service-role-key',
      },
      body: JSON.stringify({
        token: 'valid-token-abc123',
        new_password: 'SecurePass123!',
      }),
    })

    const { default: handler } = await import('./index.ts')
    const resp = await handler(req)

    assertEquals(resp.status, 200)
    const body = await resp.json()
    assertEquals(body.success, true)
  } finally {
    delete globalThis.__TEST_SUPABASE__
    restoreEnv()
  }
})

Deno.test('reset-password: returns 400 for weak password - too short', async () => {
  stubEnv()
  try {
    const mockSupabase = makeMockSupabase({})
    // @ts-ignore - module-level injection for testing
    globalThis.__TEST_SUPABASE__ = mockSupabase

    const req = new Request('http://localhost/functions/v1/reset-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer service-role-key',
      },
      body: JSON.stringify({
        token: 'valid-token-abc123',
        new_password: 'Short1!',
      }),
    })

    const { default: handler } = await import('./index.ts')
    const resp = await handler(req)

    assertEquals(resp.status, 400)
    const body = await resp.json()
    assertExists(body.error)
    assertEquals(body.error.code, 'WEAK_PASSWORD')
  } finally {
    delete globalThis.__TEST_SUPABASE__
    restoreEnv()
  }
})

Deno.test('reset-password: returns 400 for weak password - no uppercase', async () => {
  stubEnv()
  try {
    const mockSupabase = makeMockSupabase({})
    // @ts-ignore - module-level injection for testing
    globalThis.__TEST_SUPABASE__ = mockSupabase

    const req = new Request('http://localhost/functions/v1/reset-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer service-role-key',
      },
      body: JSON.stringify({
        token: 'valid-token-abc123',
        new_password: 'lowercase123!',
      }),
    })

    const { default: handler } = await import('./index.ts')
    const resp = await handler(req)

    assertEquals(resp.status, 400)
    const body = await resp.json()
    assertExists(body.error)
    assertEquals(body.error.code, 'WEAK_PASSWORD')
  } finally {
    delete globalThis.__TEST_SUPABASE__
    restoreEnv()
  }
})

Deno.test('reset-password: returns 400 for weak password - no number', async () => {
  stubEnv()
  try {
    const mockSupabase = makeMockSupabase({})
    // @ts-ignore - module-level injection for testing
    globalThis.__TEST_SUPABASE__ = mockSupabase

    const req = new Request('http://localhost/functions/v1/reset-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer service-role-key',
      },
      body: JSON.stringify({
        token: 'valid-token-abc123',
        new_password: 'NoDigitsHere!',
      }),
    })

    const { default: handler } = await import('./index.ts')
    const resp = await handler(req)

    assertEquals(resp.status, 400)
    const body = await resp.json()
    assertExists(body.error)
    assertEquals(body.error.code, 'WEAK_PASSWORD')
  } finally {
    delete globalThis.__TEST_SUPABASE__
    restoreEnv()
  }
})

Deno.test('reset-password: returns 400 for weak password - no symbol', async () => {
  stubEnv()
  try {
    const mockSupabase = makeMockSupabase({})
    // @ts-ignore - module-level injection for testing
    globalThis.__TEST_SUPABASE__ = mockSupabase

    const req = new Request('http://localhost/functions/v1/reset-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer service-role-key',
      },
      body: JSON.stringify({
        token: 'valid-token-abc123',
        new_password: 'NoSymbol123',
      }),
    })

    const { default: handler } = await import('./index.ts')
    const resp = await handler(req)

    assertEquals(resp.status, 400)
    const body = await resp.json()
    assertExists(body.error)
    assertEquals(body.error.code, 'WEAK_PASSWORD')
  } finally {
    delete globalThis.__TEST_SUPABASE__
    restoreEnv()
  }
})

Deno.test('reset-password: returns 400 for missing token', async () => {
  stubEnv()
  try {
    const mockSupabase = makeMockSupabase({})
    // @ts-ignore - module-level injection for testing
    globalThis.__TEST_SUPABASE__ = mockSupabase

    const req = new Request('http://localhost/functions/v1/reset-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer service-role-key',
      },
      body: JSON.stringify({
        new_password: 'SecurePass123!',
      }),
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
  }
})

Deno.test('reset-password: returns 400 for missing new_password', async () => {
  stubEnv()
  try {
    const mockSupabase = makeMockSupabase({})
    // @ts-ignore - module-level injection for testing
    globalThis.__TEST_SUPABASE__ = mockSupabase

    const req = new Request('http://localhost/functions/v1/reset-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer service-role-key',
      },
      body: JSON.stringify({
        token: 'valid-token-abc123',
      }),
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
  }
})

Deno.test('reset-password: returns 400 for invalid JSON body', async () => {
  stubEnv()
  try {
    const mockSupabase = makeMockSupabase({})
    // @ts-ignore - module-level injection for testing
    globalThis.__TEST_SUPABASE__ = mockSupabase

    const req = new Request('http://localhost/functions/v1/reset-password', {
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
  }
})

Deno.test('reset-password: returns 400 for invalid/expired token', async () => {
  stubEnv()
  try {
    const mockSupabase = makeMockSupabase({ verifyTokenError: true })
    // @ts-ignore - module-level injection for testing
    globalThis.__TEST_SUPABASE__ = mockSupabase

    const req = new Request('http://localhost/functions/v1/reset-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer service-role-key',
      },
      body: JSON.stringify({
        token: 'expired-or-invalid-token',
        new_password: 'SecurePass123!',
      }),
    })

    const { default: handler } = await import('./index.ts')
    const resp = await handler(req)

    assertEquals(resp.status, 400)
    const body = await resp.json()
    assertExists(body.error)
    assertEquals(body.error.code, 'INVALID_TOKEN')
  } finally {
    delete globalThis.__TEST_SUPABASE__
    restoreEnv()
  }
})

Deno.test('reset-password: returns 500 when updateUserById fails', async () => {
  stubEnv()
  try {
    const mockSupabase = makeMockSupabase({ updatePasswordError: true })
    // @ts-ignore - module-level injection for testing
    globalThis.__TEST_SUPABASE__ = mockSupabase

    const req = new Request('http://localhost/functions/v1/reset-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer service-role-key',
      },
      body: JSON.stringify({
        token: 'valid-token-abc123',
        new_password: 'SecurePass123!',
      }),
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
  }
})

Deno.test('reset-password: handles CORS preflight (OPTIONS)', async () => {
  stubEnv()
  try {
    const mockSupabase = makeMockSupabase({})
    // @ts-ignore - module-level injection for testing
    globalThis.__TEST_SUPABASE__ = mockSupabase

    const req = new Request('http://localhost/functions/v1/reset-password', {
      method: 'OPTIONS',
    })

    const { default: handler } = await import('./index.ts')
    const resp = await handler(req)

    assertEquals(resp.status, 200)
    assertEquals(resp.headers.get('Access-Control-Allow-Origin'), '*')
  } finally {
    delete globalThis.__TEST_SUPABASE__
    restoreEnv()
  }
})

Deno.test('reset-password: accepts various valid symbol characters', async () => {
  stubEnv()
  try {
    const mockSupabase = makeMockSupabase({})
    // @ts-ignore - module-level injection for testing
    globalThis.__TEST_SUPABASE__ = mockSupabase

    const symbols = [
      '!',
      '@',
      '#',
      '$',
      '%',
      '^',
      '&',
      '*',
      '(',
      ')',
      ',',
      '.',
      '?',
      '"',
      ':',
      '{',
      '}',
      '|',
      '<',
      '>',
    ]

    for (const symbol of symbols) {
      const password = `SecurePass1${symbol}`

      const req = new Request('http://localhost/functions/v1/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer service-role-key',
        },
        body: JSON.stringify({
          token: 'valid-token-abc123',
          new_password: password,
        }),
      })

      const { default: handler } = await import('./index.ts')
      const resp = await handler(req)

      assertEquals(resp.status, 200, `Failed for symbol: ${symbol}`)
    }
  } finally {
    delete globalThis.__TEST_SUPABASE__
    restoreEnv()
  }
})
