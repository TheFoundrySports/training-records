// @ts-nocheck — Deno global types not available in editor
/**
 * Unit tests for admin-create-user Edge Function.
 *
 * Run with:
 *   cd supabase/functions/admin-create-user
 *   deno test --allow-all index.test.ts
 */

import { assertEquals, assertExists } from 'https://deno.land/std@0.208.0/assert/mod.ts'

// ── Mock factory ─────────────────────────────────────────────────────────────

function makeMockSupabase(opts: {
  userId?: string
  authError?: boolean
  adminProfile?: { role: string } | null
  adminProfileError?: boolean
  emailExists?: boolean
  createUserError?: boolean
  createUserErrorMessage?: string
  generateLinkError?: boolean
}) {
  const {
    userId = 'admin-123',
    authError = false,
    adminProfile = { role: 'admin' },
    adminProfileError = false,
    emailExists = false,
    createUserError = false,
    createUserErrorMessage = '',
    generateLinkError = false,
  } = opts

  return {
    auth: {
      getUser: () =>
        authError
          ? Promise.resolve({ data: { user: null }, error: { message: 'invalid token' } })
          : Promise.resolve({ data: { user: { id: userId } }, error: null }),
    },
    from: (table: string) => {
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                adminProfileError
                  ? Promise.resolve({ data: null, error: { message: 'not found' } })
                  : Promise.resolve({ data: adminProfile, error: null }),
            }),
          }),
        }
      }
      return {}
    },
    // @ts-ignore Deno global
    auth: {
      admin: {
        createUser: (..._args: unknown[]) =>
          createUserError
            ? Promise.resolve({
                data: { user: null },
                error: { message: createUserErrorMessage },
              })
            : emailExists
              ? Promise.resolve({
                  data: { user: null },
                  error: { message: 'Email already exists' },
                })
              : Promise.resolve({
                  data: { user: { id: 'new-user-abc' } },
                  error: null,
                }),
        generateLink: (..._args: unknown[]) =>
          generateLinkError
            ? Promise.resolve({ data: null, error: { message: 'Failed to generate link' } })
            : Promise.resolve({
                data: {
                  properties: {
                    action_link: 'http://localhost:5173/login?token=abc123',
                  },
                },
                error: null,
              }),
      },
    },
  }
}

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

Deno.test('admin-create-user: creates user with email_confirm true', async () => {
  stubEnv()
  try {
    const mockSupabase = makeMockSupabase({})
    const req = new Request('http://localhost/admin-create-user', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer valid-admin-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: 'newuser@example.com', password: 'securepass123' }),
    })

    // Intercept createUser to capture the call arguments
    const createUserCalls: unknown[] = []
    const origCreateUser = mockSupabase.auth.admin.createUser
    mockSupabase.auth.admin.createUser = (...args: unknown[]) => {
      createUserCalls.push(args)
      return origCreateUser(...args)
    }

    // We need to patch the module — use a mock module approach
    // Instead, we'll import the handler and verify the call shape indirectly
    const { default: handler } = await import('./index.ts')
    const resp = await handler(req)

    assertEquals(resp.status, 200)
    const body = await resp.json()
    assertEquals(body.success, true)
    assertExists(body.user_id)
    assertEquals(body.notification_sent, true)

    // Verify createUser was called with email_confirm: true
    assertEquals(createUserCalls.length, 1)
    const callArgs = createUserCalls[0] as Record<string, unknown>[]
    assertEquals(callArgs[0].email_confirm, true)
  } finally {
    restoreEnv()
  }
})

Deno.test('admin-create-user: returns notification_sent false when email dispatch fails', async () => {
  stubEnv()
  try {
    const mockSupabase = makeMockSupabase({ generateLinkError: true })
    const req = new Request('http://localhost/admin-create-user', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer valid-admin-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: 'newuser@example.com', password: 'securepass123' }),
    })

    const { default: handler } = await import('./index.ts')
    const resp = await handler(req)

    assertEquals(resp.status, 200)
    const body = await resp.json()
    assertEquals(body.success, true)
    assertEquals(body.notification_sent, false)
  } finally {
    restoreEnv()
  }
})