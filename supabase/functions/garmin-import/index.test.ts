// @ts-nocheck — Deno global types not available in editor
/**
 * Integration tests for garmin-import Edge Function.
 *
 * These tests mock the Supabase client and Storage to isolate the HTTP
 * handler logic without needing a running Supabase instance.
 *
 * Run with:
 *   supabase functions serve garmin-import
 *   deno test --allow-env supabase/functions/garmin-import/index.test.ts
 */

import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts'

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeAuthHeader(token = 'Bearer valid-token') {
  return token
}

function makeFormData(workoutId: string | null, file: File | null): FormData {
  const fd = new FormData()
  if (workoutId !== null) fd.append('workout_id', workoutId)
  if (file !== null) fd.append('file', file)
  return fd
}

function makeSmallFitFile(sizeBytes = 1024): File {
  // Minimal fake .fit binary content (not a real FIT file, but small enough to pass size checks)
  const bytes = new Uint8Array(sizeBytes)
  return new File([bytes], 'activity.fit', { type: 'application/octet-stream' })
}

// ── Mock factory ─────────────────────────────────────────────────────────────

/**
 * Creates a minimal Supabase client mock for garmin-import.
 *
 * @param opts.userId - The user id returned by auth.getUser()
 * @param opts.ownedWorkout - If provided, the workout row returned by DB query
 * @param opts.authError - If true, auth.getUser() returns an error
 * @param opts.insertId - The ID returned after garmin_activities.insert
 */
function makeMockSupabase(opts: {
  userId?: string
  ownedWorkout?: { id: string; garmin_activity_id: string | null } | null
  authError?: boolean
  insertId?: string
  storageError?: boolean
}) {
  const {
    userId = 'user-123',
    ownedWorkout = { id: 'workout-abc', garmin_activity_id: null },
    authError = false,
    insertId = 'activity-xyz',
    storageError = false,
  } = opts

  const storageMock = {
    from: (_bucket: string) => ({
      upload: (_path: string, _buffer: unknown, _opts: unknown) =>
        storageError
          ? Promise.resolve({ error: { message: 'Storage error' } })
          : Promise.resolve({ error: null }),
    }),
  }

  const fromMock = (table: string) => {
    if (table === 'workouts') {
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              single: () =>
                ownedWorkout !== null
                  ? Promise.resolve({ data: ownedWorkout, error: null })
                  : Promise.resolve({ data: null, error: { message: 'not found' } }),
            }),
          }),
        }),
        update: () => ({
          eq: () => Promise.resolve({ error: null }),
        }),
      }
    }

    if (table === 'garmin_activities') {
      return {
        insert: () => ({
          select: () => ({
            single: () => Promise.resolve({ data: { id: insertId }, error: null }),
          }),
        }),
        delete: () => ({
          eq: () => Promise.resolve({ error: null }),
        }),
      }
    }

    return {}
  }

  return {
    auth: {
      getUser: () =>
        authError
          ? Promise.resolve({ data: { user: null }, error: { message: 'invalid token' } })
          : Promise.resolve({ data: { user: { id: userId } }, error: null }),
    },
    from: fromMock,
    storage: storageMock,
  }
}

// ── Stub Deno.env to prevent crashes ─────────────────────────────────────────

const originalEnvGet = Deno.env.get.bind(Deno.env)
function stubEnv() {
  Deno.env.get = (key: string) => {
    if (key === 'SUPABASE_URL') return 'http://localhost:54321'
    if (key === 'SUPABASE_SERVICE_ROLE_KEY') return 'service-role-key'
    return originalEnvGet(key)
  }
}
function restoreEnv() {
  Deno.env.get = originalEnvGet
}

// ── Test cases ────────────────────────────────────────────────────────────────

Deno.test('garmin-import: missing Authorization header → 401', async () => {
  const req = new Request('http://localhost/garmin-import', {
    method: 'POST',
    body: new FormData(),
  })

  // We import the handler directly; stub its dependencies first
  stubEnv()
  try {
    // Dynamic import to isolate each test
    const { default: handler } = await import('./index.ts')
    const resp = await handler(req)
    assertEquals(resp.status, 401)

    const body = await resp.json()
    assertEquals(body.error.code, 'UNAUTHORIZED')
  } finally {
    restoreEnv()
  }
})

Deno.test('garmin-import: OPTIONS preflight → 200 ok', async () => {
  const req = new Request('http://localhost/garmin-import', { method: 'OPTIONS' })

  stubEnv()
  try {
    const { default: handler } = await import('./index.ts')
    const resp = await handler(req)
    assertEquals(resp.status, 200)
  } finally {
    restoreEnv()
  }
})

Deno.test('garmin-import: non-POST method → 405', async () => {
  const req = new Request('http://localhost/garmin-import', {
    method: 'GET',
    headers: { Authorization: makeAuthHeader() },
  })

  stubEnv()
  try {
    const { default: handler } = await import('./index.ts')
    const resp = await handler(req)
    assertEquals(resp.status, 405)
  } finally {
    restoreEnv()
  }
})

Deno.test('garmin-import: missing workout_id → 400', async () => {
  // FormData without workout_id but with a file
  const fd = makeFormData(null, makeSmallFitFile())

  const req = new Request('http://localhost/garmin-import', {
    method: 'POST',
    headers: { Authorization: makeAuthHeader() },
    body: fd,
  })

  stubEnv()
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

Deno.test('garmin-import: file exceeds 10 MB → 413', async () => {
  const oversizedFile = makeSmallFitFile(11 * 1024 * 1024)
  const fd = makeFormData('workout-abc', oversizedFile)

  const req = new Request('http://localhost/garmin-import', {
    method: 'POST',
    headers: { Authorization: makeAuthHeader() },
    body: fd,
  })

  stubEnv()
  try {
    const { default: handler } = await import('./index.ts')
    const resp = await handler(req)
    assertEquals(resp.status, 413)

    const body = await resp.json()
    assertEquals(body.error.code, 'PAYLOAD_TOO_LARGE')
  } finally {
    restoreEnv()
  }
})
