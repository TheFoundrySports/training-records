// @ts-nocheck — Deno global types not available in editor
/**
 * Unit tests for accept-invite Edge Function.
 *
 * Run with:
 *   cd supabase/functions/accept-invite
 *   deno test --allow-all index.test.ts
 */

import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts'

// ── Mock factory ─────────────────────────────────────────────────────────────

function makeMockSupabase(opts: {
  userId?: string
  authError?: boolean
  invitationId?: string | null
  invitationError?: boolean
  updateError?: boolean
}) {
  const {
    userId = 'user-123',
    authError = false,
    invitationId = 'invitation-abc',
    invitationError = false,
    updateError = false,
  } = opts

  return {
    auth: {
      getUser: () =>
        authError
          ? Promise.resolve({ data: { user: null }, error: { message: 'invalid token' } })
          : Promise.resolve({ data: { user: { id: userId, email: 'user@example.com' } }, error: null }),
    },
    from: (table: string) => {
      if (table === 'invitations') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: () =>
                  invitationError
                    ? Promise.resolve({ data: null, error: { message: 'query failed' } })
                    : Promise.resolve({ data: invitationId ? { id: invitationId } : null, error: null }),
              }),
            }),
          }),
          update: () => ({
            eq: () =>
              updateError
                ? Promise.resolve({ data: null, error: { message: 'update failed' } })
                : Promise.resolve({ data: null, error: null }),
          }),
        }
      }
      return {}
    },
  }
}

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

Deno.test('accept-invite: returns warning when no matching invitation', async () => {
  stubEnv()
  try {
    const mockSupabase = makeMockSupabase({ invitationId: null })
    const req = new Request('http://localhost/accept-invite', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid-token' },
    })
    const { default: handler } = await import('./index.ts')
    const resp = await handler(req)

    assertEquals(resp.status, 200)
    const body = await resp.json()
    assertEquals(body.success, true)
    assertEquals(body.marked, false)
    assertEquals(body.warning, 'No pending invitation found for this session')
  } finally {
    restoreEnv()
  }
})

Deno.test('accept-invite: success path returns invitation_id', async () => {
  stubEnv()
  try {
    const mockSupabase = makeMockSupabase({ invitationId: 'invitation-xyz' })
    const req = new Request('http://localhost/accept-invite', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid-token' },
    })
    const { default: handler } = await import('./index.ts')
    const resp = await handler(req)

    assertEquals(resp.status, 200)
    const body = await resp.json()
    assertEquals(body.success, true)
    assertEquals(body.marked, true)
    assertEquals(body.invitation_id, 'invitation-xyz')
  } finally {
    restoreEnv()
  }
})