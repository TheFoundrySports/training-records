// @ts-nocheck — Deno global types not available in editor
/**
 * Unit tests for create_invite Edge Function.
 *
 * Run with:
 *   supabase functions serve create_invite
 *   deno test --allow-env supabase/functions/create_invite/index.test.ts
 */

import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts'

// ── Mock factory ─────────────────────────────────────────────────────────────

function makeMockSupabase(opts: {
  userId?: string
  authError?: boolean
  adminProfile?: { role: string } | null
  adminProfileError?: boolean
  inviteExists?: boolean
  settingsError?: boolean
  inviteSent?: boolean
  inviteErrorMessage?: string
  insertError?: boolean
}) {
  const {
    userId = 'admin-123',
    authError = false,
    adminProfile = { role: 'admin' },
    adminProfileError = false,
    inviteExists = false,
    settingsError = false,
    inviteSent = true,
    inviteErrorMessage = '',
    insertError = false,
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
      if (table === 'invitations') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: () =>
                  inviteExists
                    ? Promise.resolve({ data: { id: 'existing-invite' }, error: null })
                    : Promise.resolve({ data: null, error: { message: 'no rows' } }),
              }),
            }),
          }),
          insert: () => ({
            select: () => ({
              single: () =>
                insertError
                  ? Promise.resolve({ data: null, error: { message: 'insert failed' } })
                  : Promise.resolve({ data: { token: 'token-abc', expires_at: '2026-05-30T00:00:00Z' }, error: null }),
            }),
          }),
        }
      }
      if (table === 'app_settings') {
        return {
          select: () => ({
            single: () =>
              settingsError
                ? Promise.resolve({ data: null, error: { message: 'settings error' } })
                : Promise.resolve({ data: { invite_expiry_hours: 48 }, error: null }),
          }),
        }
      }
      return {}
    },
  }
}

function stubEnv() {
  const original = Deno.env.get.bind(Deno.env)
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

// ── Tests ──────────────────────────────────────────────────────────────────────

Deno.test('create_invite: missing Authorization → 401', async () => {
  stubEnv()
  try {
    const mockSupabase = makeMockSupabase({})
    const req = new Request('http://localhost/create_invite', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com' }),
    })
    const { default: handler } = await import('./index.ts')
    const resp = await handler(req)
    assertEquals(resp.status, 401)
  } finally {
    restoreEnv()
  }
})

Deno.test('create_invite: non-POST → 405', async () => {
  stubEnv()
  try {
    const req = new Request('http://localhost/create_invite', {
      method: 'GET',
      headers: { Authorization: 'Bearer valid-token' },
    })
    const { default: handler } = await import('./index.ts')
    const resp = await handler(handler)
    assertEquals(resp.status, 405)
  } finally {
    restoreEnv()
  }
})

Deno.test('create_invite: email already has pending invite → 400', async () => {
  stubEnv()
  try {
    const mockSupabase = makeMockSupabase({ inviteExists: true })
    const req = new Request('http://localhost/create_invite', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid-token' },
      body: JSON.stringify({ email: 'existing@example.com' }),
    })
    const { default: handler } = await import('./index.ts')
    const resp = await handler(req)
    assertEquals(resp.status, 400)
    const body = await resp.json()
    assertEquals(body.error.code, 'INVITE_EXISTS')
  } finally {
    restoreEnv()
  }
})

Deno.test('create_invite: invalid JSON body → 400', async () => {
  stubEnv()
  try {
    const req = new Request('http://localhost/create_invite', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid-token' },
      body: 'not-json',
    })
    const { default: handler } = await import('./index.ts')
    const resp = await handler(req)
    assertEquals(resp.status, 400)
  } finally {
    restoreEnv()
  }
})

Deno.test('create_invite: success → returns expires_at', async () => {
  stubEnv()
  try {
    const req = new Request('http://localhost/create_invite', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid-token' },
      body: JSON.stringify({ email: 'newuser@example.com' }),
    })
    const { default: handler } = await import('./index.ts')
    const resp = await handler(req)
    assertEquals(resp.status, 200)
    const body = await resp.json()
    assertEquals(body.success, true)
    assertEquals(typeof body.expires_at, 'string')
  } finally {
    restoreEnv()
  }
})