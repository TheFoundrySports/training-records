# Design — Fix Supabase Registration Edge Functions

**Change:** understand-supabase-functions-registration
**Date:** 2026-06-01

## 1. Overview

Five targeted fixes across Edge Functions and frontend hooks. The core change is `admin-create-user` switching from `email_confirm: false` (confirmation email required) to `email_confirm: true` (instant login) plus a custom notification email. Supporting changes fix fragile error parsing in the hooks, make `accept-invite` surface a warning instead of silently succeeding, and remove the unsafe `localhost:5173` fallback in `create_invite`.

## 2. Architecture & Dependencies

```
Frontend (React)                    Edge Functions (Deno)
────────────────                    ──────────────────────
useCreateUser.ts ──fetch──────→  admin-create-user/index.ts
useCreateInvite.ts ─fetch─────→  create_invite/index.ts
useRegister.ts     ──fetch─────→  register-user/index.ts
                                     ↕
                             Supabase Auth (local Docker)
                             Inbucket (email capture, :54324)
```

Frontend hooks call Edge Functions at `${VITE_SUPABASE_URL}/functions/v1/<name>` via `fetch` (bypassing `supabase.functions.invoke`) to gain full control over response body parsing on non-2xx responses.

## 3. Capability Designs

### 3.1 admin-create-user (REQ-1..REQ-4)

**File:** `supabase/functions/admin-create-user/index.ts`

**Change 1 — `email_confirm: true` (line 96)**

```typescript
// BEFORE
email_confirm: false,

// AFTER
email_confirm: true,
```

User is created with `email_confirmed_at = now()` and can log in immediately.

**Change 2 — Response shape (line 110)**

```typescript
// BEFORE
return jsonResponse({ success: true, user_id: authUser.user!.id })

// AFTER
return jsonResponse({
  success: true,
  user_id: authUser.user!.id,
  notification_sent: false,  // placeholder; updated below
})
```

**Change 3 — Notification email dispatch (after line 110)**

```typescript
// After the jsonResponse line, add a try/catch that patches notification_sent
// Approach: generate a magic-link URL via generateLink, then send a text email.
// Using generateLink(type: 'magiclink') gives an action URL we can embed or dispatch.
// Wrap in try/catch — never fail the user creation if email dispatch fails.
try {
  const { data: linkData } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: {
      redirectTo: `${Deno.env.get('APP_URL') ?? 'http://localhost:5173'}/login`,
    },
  })
  if (linkData?.properties?.action_link) {
    // Inbucket captures all SMTP; dispatch a text-only notification.
    // We use Supabase Auth's admin API to send the magic link email directly.
    // If Mailpit/Inbucket is the SMTP target, the email lands at :54324.
    // If dispatch fails, swallow and return notification_sent: false.
  }
} catch {
  // email dispatch failed — user still created successfully
}
```

**Recommendation:** Send a text-only email (no action link needed — admin already set the password). The email body: "Your account was created by an administrator. You can log in now at <APP_URL>/login using the password set for you." This avoids any "click to confirm" confusion.

**Change 4 — Error path (lines 100-108):** Already handles `EMAIL_ALREADY_EXISTS` at 409 with a human-readable message. No changes needed here.

### 3.2 useCreateUser + useCreateInvite + useRegister error parsing (REQ-1..REQ-2)

**Files:** `src/features/admin/create-user/hooks/useCreateUser.ts`, `src/features/admin/create-user/hooks/useCreateInvite.ts`, `src/features/auth/hooks/useRegister.ts`

**Current bug:** `supabase.functions.invoke` wraps non-2xx responses as a generic `Error` with message `"Edge Function returned a non-2xx status code: 400"`. The actual body `{ error: { code, message } }` is lost because the SDK throws before giving us the body.

**Decision D3.2.B (recommended):** Rewrite hooks to use `fetch` directly against `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/<name>`. This gives full control over response parsing on all status codes.

**Code sketch (mutationFn body — useMutation wrapper unchanged):**

```typescript
// useCreateUser.ts — new mutationFn body
const sessionRes = await supabase.auth.getSession()
if (!sessionRes.data.session?.access_token) throw new Error('Not authenticated')

const response = await fetch(
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-create-user`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sessionRes.data.session.access_token}`,
    },
    body: JSON.stringify({ email: input.email, password: input.password }),
  }
)

const data = await response.json()

if (!response.ok) {
  // Parse { error: { code, message } } from body
  const code = data?.error?.code ?? 'EDGE_FUNCTION_ERROR'
  const message = data?.error?.message ?? response.statusText
  throw new Error(`${code}: ${message}`)  // OR just message — see D3.2 below
}

const functionError = getEdgeFunctionErrorMessage(data)
if (functionError) throw new Error(functionError)

return data
```

**Decision D3.2 message format:** Recommend `message only` for UI display. The code is available internally for analytics/logging but should not be shown to admins. `useCreateUser.ts:26` currently renders `${code}: ${msg}` — simplify to just the human message.

**Same pattern applied to:** `useCreateInvite.ts` and `useRegister.ts` (for consistency).

**Test approach:** Vitest with mocked `fetch`, asserting that 4xx bodies produce the correct hook `error` state.

### 3.3 accept-invite warning (REQ-1..REQ-3)

**File:** `supabase/functions/accept-invite/index.ts:70-72`

**Current (lines 70-72):**
```typescript
if (!invitation) {
  return jsonResponse({ success: true, marked: false })
}
```

**After (new lines):**
```typescript
if (!invitation) {
  return jsonResponse({
    success: true,
    marked: false,
    warning: 'No pending invitation found for this session',
  })
}
```

**Also update the success path (line 83):** Return `invitation_id` (not just `marked: true`) so the UI has a stable field to inspect.

```typescript
// Before
return jsonResponse({ success: true, marked: true })

// After
return jsonResponse({ success: true, marked: true, invitation_id: invitation.id })
```

**UI change:** `src/features/auth/pages/AcceptInvitePage.tsx` receives the warning via `useAcceptInvite` (not in scope for this change — only the `warning` field is added to the EF response). The warning is surfaced as a non-blocking yellow info bar in `AcceptInvitePage`. This is in scope.

### 3.4 create_invite APP_URL hard-fail (REQ-1..REQ-3)

**File:** `supabase/functions/create_invite/index.ts:101`

**Current (line 101):**
```typescript
const appUrl = Deno.env.get('APP_URL') ?? 'http://localhost:5173'
```

**After:**
```typescript
const appUrl = Deno.env.get('APP_URL')
if (!appUrl) {
  return errorResponse('MISSING_APP_URL', 'APP_URL environment variable is required', 500)
}
```

The fallback is removed. `inviteUserByEmail` is called **only after** the check — no email is sent with a broken redirect URL.

**Update `supabase/functions/.env`:**

```
OPENAI_API_KEY=...
APP_URL=http://127.0.0.1:5173
```

**Decision D3.4:** Update `.env` directly for local dev convenience (not just documenting `supabase secrets set`). Production secrets still use `supabase secrets set`.

### 3.5 dev-workflow-docs (REQ-1)

**New file:** `supabase/functions/README.md`

Sections:
1. **What this directory is** — Edge Functions (Deno) served by the built-in Edge Runtime.
2. **Built-in Edge Runtime** — `supabase start` runs it at `:54321`; no separate `serve` needed for normal dev.
3. **Manual serve** — `supabase functions serve <name> --env-file supabase/functions/.env` for hot-reload debugging of a specific function.
4. **Invoking locally** — `supabase functions invoke <name>`.
5. **Inspecting emails** — Inbucket at `http://127.0.0.1:54324`.
6. **APP_URL** — Must be set via `supabase secrets set APP_URL=http://127.0.0.1:5173` for `create_invite` to generate correct invite links; also present in `.env` for manual serve.
7. **Common gotchas** — rate limit `email_sent = 100`, redirect URL mismatch, `@ts-nocheck` on all EFs.

Keep it under 300 words — a 1-pager, not a wall of text.

## 4. Test Strategy

| Layer | What | Approach |
|-------|------|---------|
| Vitest | `useCreateUser`, `useCreateInvite`, `useRegister` error parsing | Mock `fetch`, assert hook `error` equals parsed message for 4xx bodies |
| Vitest | `useCreateUser` success path | Mock `fetch` → 200 JSON, assert `userId` is returned |
| Deno | `admin-create-user` notification email | Mock `createUser` + `generateLink`, assert response shape `{ success, user_id, notification_sent }` |
| Deno | `accept-invite` warning path | Mock DB → empty invitation, assert response has `warning` key |
| Deno | `create_invite` MISSING_APP_URL | Unset `APP_URL` env, assert 500 with `MISSING_APP_URL` code |

TDD order: write the failing test first, then implement.

## 5. Commit Boundaries

| # | Commit | Files | Est. lines |
|---|--------|-------|-----------|
| 1 | `feat(admin-create-user): email_confirm true + notification email` | `admin-create-user/index.ts` + Deno test | +25 |
| 2 | `fix(useCreateUser,useCreateInvite,useRegister): parse EF error body via fetch` | 3 hooks + vitest | +65 |
| 3 | `feat(accept-invite): return warning when no pending invitation` | `accept-invite/index.ts` + Deno test | +12 |
| 4 | `feat(create_invite): fail fast on missing APP_URL; update .env` | `create_invite/index.ts`, `.env` | +5 |
| 5 | `docs(supabase/functions): add local dev workflow README` | `supabase/functions/README.md` (new) | +25 |
| | **Total** | | **~132 lines** |

All commits go into a single PR (well under 400-line budget).

## 6. Risk Register

| Risk | Likelihood | Mitigation |
|------|-----------|-----------|
| Notification email wording confused with confirmation email | Low | Send text-only email with no action link; body explicitly says "your account was created by an administrator" |
| Fetch bypass loses Supabase client's JWT refresh mid-request | Low | Hooks are short-lived mutations — no long-running sessions; safe for this use case |
| Removing `localhost:5173` fallback breaks existing setup without APP_URL secret | Low | Document requirement in README; call out in PR description |

## 7. Open Decisions for User to Confirm

- **D3.2.A vs B:** Rewrite hooks with `fetch` (recommended) or keep `supabase.functions.invoke` and use HTTP status only? Fetch gives full error body parsing; the Supabase client strips it on non-2xx.
- **D3.2 message format:** Show `code: message` prefix in UI, or `message` only? Recommend **message only** — code is for internal logging.
- **D3.4:** Update `supabase/functions/.env` directly (for local dev ease), or only document via `supabase secrets set`? Recommend **both** — `.env` for local dev + documented `secrets set` for production.

## 8. Size Forecast

Tallying changed lines per capability:

| Capability | Lines |
|-------------|-------|
| A. admin-create-user EF + tests | +40 |
| B. useCreateUser/useCreateInvite/useRegister + vitest | +70 |
| C. accept-invite EF + tests + AcceptInvitePage warning UI | +20 |
| D. create_invite APP_URL fix + .env | +8 |
| E. supabase/functions/README.md | +25 |
| **Total** | **~163 lines** (well under 400) |