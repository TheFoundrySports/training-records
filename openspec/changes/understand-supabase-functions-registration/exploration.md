# Exploration — How Supabase Functions Work in Training Records

## 1. Supabase Edge Functions Primer (This Project)

### 1.1 Local development: `supabase functions serve` vs the built-in runtime

When you run `supabase start`, the local Supabase stack starts:
- **Supabase Studio** on `:54323`
- **Postgres** on `:54322`
- **Inbucket** (email capture) on `:54324`
- **Edge Runtime** on `:54321` (handles CORS, JWT verification, SMTP simulation)

Edge Functions in `supabase/functions/*/index.ts` are **Deno scripts**. They run on the **built-in Edge Runtime** started by `supabase start` — you do **not** need a separate `supabase functions serve` during normal dev. The runtime is controlled by `supabase/config.toml`:

```toml
[edge_runtime]
enabled = true
policy = "per_worker"   # hot-reload enabled in dev
deno_version = 2
```

If you run `supabase functions serve` manually (with `--env-file supabase/functions/.env`), it starts a **separate local server** on port 9000 that serves the same functions but with a specific env file. Functions invoked via `supabase.functions.invoke()` by default resolve to the `supabase start`-managed runtime. Both point at the same local Postgres and Inbucket.

### 1.2 How secrets / env vars are injected

| Mechanism | What it provides |
| --------- | ---------------- |
| `supabase start` | Reads `supabase/config.toml`; injects `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `APP_URL` (if set in system env), `OPENAI_API_KEY` (from host shell) into the Edge Runtime |
| `supabase secrets set KEY=value` | Persists secrets to `~/.supabase/credentials` (or project-scoped config); these are read by the Edge Runtime at startup |
| `supabase/functions/.env` | **Not auto-loaded by `supabase start`** — only read by `supabase functions serve --env-file`. Currently contains only `OPENAI_API_KEY` |
| `Deno.env.get('KEY')` in EF | Reads from the runtime's env, populated by `supabase start` + `supabase secrets set` |

**Problem:** `APP_URL` is read from `Deno.env.get('APP_URL')` — if not set via `supabase secrets set`, `create_invite` falls back to `http://localhost:5173` (hardcoded at line 101 of `create_invite/index.ts`). In production the correct `APP_URL` must be set as a secret.

### 1.3 Mailpit / Inbucket email capture

Inbucket is enabled in `config.toml`:

```toml
[inbucket]
enabled = true
port = 54324
```

When `enable_confirmations = true` and an Edge Function calls `admin.createUser({ email_confirm: false })` or `inviteUserByEmail`, Supabase Auth (local) intercepts the SMTP send and **stores the email in Inbucket** instead of sending. You view captured emails at `http://127.0.0.1:54324`.

Rate limit is set at `email_sent = 100` per hour in `config.toml` — but that only applies when SMTP is configured. In local dev, Inbucket accepts everything.

### 1.4 What `enable_confirmations = true` does

- Every call to `admin.createUser` with `email_confirm: false` (or default) triggers the **Confirm signup** email template.
- Users are created with `email_confirmed_at = null` and cannot sign in until they click the email confirmation link.
- The `confirmations` email rate limit (`email.smtp.max_frequency = "1s"`) also applies.
- For `inviteUserByEmail`: Supabase sends the **You have been invited** email regardless of `enable_confirmations` — this setting mainly governs `createUser` confirmation behavior.

### 1.5 `inviteUserByEmail` vs `admin.createUser` — the critical differences

| | `inviteUserByEmail` | `admin.createUser` |
| -- | -- | -- |
| What it does | Sends "You have been invited" email; creates user in `auth.users` as **unconfirmed**; sets a temporary internal password | Creates user directly; does NOT send email unless `email_confirm: false` |
| `email_confirm` param | Not exposed; always sends invite email | `email_confirm: false` → sends **Confirm signup**; `email_confirm: true` → user auto-confirmed, no email |
| Password at creation | User has no password set initially; must use `updateUser` on invite acceptance | Admin sets password directly; confirm email is just for verification |
| What email template | `auth.email.template.invite` ("You have been invited") | `auth.email.template.confirmation` ("Confirm your signup") |
| Redirect | Uses `redirectTo` param for invite acceptance link | No redirect; confirmation link goes to `site_url` (`:5173`) |

---

## 2. The Current Registration Flow

### 2.1 Flow map

```
ADMIN PATH A — Create User with password
─────────────────────────────────────────
Admin UI (CreateUserPage)
  └─ useCreateUser + admin JWT
      └─ POST /functions/v1/admin-create-user
          ├─ Validates admin via profiles.role
          ├─ admin.createUser({ email, password, email_confirm: false })
          │   → Supabase sends "Confirm signup" email (stored in Inbucket)
          │   → User created with email_confirmed_at = null
          ├─ Insert (or not) invitations audit row?  ← NOT done in admin-create-user
          └─ Returns { success: true, user_id }
      └─ Admin sees "User created. A confirmation email was sent to {email}."
User clicks link in email → logs in with admin-set password

ADMIN PATH B — Send Invitation
──────────────────────────────
Admin UI (CreateUserPage)
  └─ useCreateInvite + admin JWT
      └─ POST /functions/v1/create_invite
          ├─ Validates admin via profiles.role
          ├─ Check no pending invite exists in invitations table
          ├─ admin.inviteUserByEmail(email, { redirectTo: APP_URL/accept-invite })
          │   → Supabase sends "You have been invited" email
          ├─ Generate token = crypto.randomUUID()  ← STORED but UNUSED
          ├─ Insert { email, token, status: 'pending', invited_by, expires_at }
          └─ Returns { success: true, expires_at }
      └─ Admin sees "Invitation sent to {email}."
User clicks link in email → Supabase redirects to /accept-invite
  with session token in URL hash (not ?token= query param)
  └─ AcceptInvitePage listens to onAuthStateChange(SIGNED_IN)
      ├─ User sees "Set Your Password" form
      ├─ useAcceptInvite → supabase.auth.updateUser({ password })
      │   → Password set; auth user email_confirmed_at = now (or remains unconfirmed depending on invite flow)
      ├─ Optional: POST /functions/v1/accept-invite
      │   → Marks invitations.status = 'accepted' (audit only — user already exists)
      └─ signs out and redirects to /login?activated=true

PUBLIC SELF-REGISTRATION
────────────────────────
RegisterPage (public, no auth)
  └─ useRegister → POST /functions/v1/register-user
      ├─ Reads app_settings.registration_mode ('open' | 'invite_only')
      ├─ If 'invite_only' + no token → error
      ├─ If token provided → validates via invitations table (token lookup)
      ├─ admin.createUser({ email, password, email_confirm: true })
      │   → No confirmation email; user can sign in immediately
      └─ Returns { success: true, user_id }
```

### 2.2 Edge Function responsibilities

| Function | File | Core action | Auth required |
| --------- | ---- | ---------- | ------------- |
| `admin-create-user` | `supabase/functions/admin-create-user/index.ts` | `admin.createUser` with `email_confirm: false` | Admin JWT |
| `create_invite` | `supabase/functions/create_invite/index.ts` | `inviteUserByEmail` + `invitations` audit row | Admin JWT |
| `accept-invite` | `supabase/functions/accept-invite/index.ts` | Marks invitation `status='accepted'` (audit only) | User JWT (already signed in via invite link) |
| `register-user` | `supabase/functions/register-user/index.ts` | Public self-registration w/ optional token | None (public) |
| `registration-settings` | `supabase/functions/registration-settings/index.ts` | GET/POST `app_settings` | Authenticated user |

### 2.3 Frontend hooks and pages

| File | Role |
| ---- | ---- |
| `src/features/admin/create-user/hooks/useCreateUser.ts` | Calls `admin-create-user`; uses `getEdgeFunctionErrorMessage` |
| `src/features/admin/create-user/hooks/useCreateInvite.ts` | Calls `create_invite`; uses `getEdgeFunctionErrorMessage` |
| `src/features/admin/create-user/pages/CreateUserPage.tsx` | Two-action form: "Create User" → `useCreateUser`; "Send Invite" → `useCreateInvite` |
| `src/features/auth/hooks/useAcceptInvite.ts` | `updateUser({ password })` + optional `accept-invite` call + `signOut` |
| `src/features/auth/hooks/useRegister.ts` | Calls `register-user`; parses `data.error` as raw string (no `getEdgeFunctionErrorMessage`) |
| `src/features/auth/pages/AcceptInvitePage.tsx` | Shows password form once `onAuthStateChange` fires `SIGNED_IN` |
| `src/features/auth/pages/RegisterPage.tsx` | Public registration with optional `?token=` for invite-only mode |

---

## 3. Confirmed Problems from This Session

### 3.1 Error swallowing in `useCreateUser`

**File:** `src/features/admin/create-user/hooks/useCreateUser.ts:19-27`

```typescript
if (error) {
  const msg: string = error.message ?? ''
  const match = msg.match(/code=(\w+)/)
  const code = match?.[1] ?? 'EDGE_FUNCTION_ERROR'
  throw new Error(`${code}: ${msg.replace(...)}`)
}
```

When Supabase JS SDK receives a non-2xx response from an Edge Function, it wraps the real error (e.g. `{ error: { code: 'EMAIL_ALREADY_EXISTS', message: '...' } }`) in a generic `"Edge Function returned a non-2xx status code"` message. The hook parses out the code correctly, but this is fragile: it regex-matches `code=` anywhere in the message. The real response body (which the EF writes as JSON) is not parseable this way when nested.

### 3.2 Inconsistent error shape handling across hooks

- `useCreateUser`: uses `getEdgeFunctionErrorMessage(data)` (checks nested `{ error: { message } }` object)
- `useCreateInvite`: same — uses `getEdgeFunctionErrorMessage(data)`
- `useRegister`: does **NOT** use `getEdgeFunctionErrorMessage`; instead treats `data.error` as a plain string:

**File:** `src/features/auth/hooks/useRegister.ts:16-17`
```typescript
if (data?.error) {
  throw new Error(data.error)  // data.error is actually { code, message } or undefined
}
```

This means `register-user` errors like `{ error: { code: 'EMAIL_ALREADY_EXISTS', message: '...' } }` get `"[object Object]"` thrown as the error message.

### 3.3 `invitations.token` written but never read for its original purpose

`create_invite` generates a `token = crypto.randomUUID()` and writes it to `invitations.token`, but **nothing ever reads it**. The Supabase invite link sent by email includes `redirectTo: APP_URL/accept-invite` — when the user clicks it, Supabase sets the session directly in the URL hash; `AcceptInvitePage` uses `onAuthStateChange` / `detectSessionInUrl`. The `token` column is entirely bypassed.

The token lookup in `register-user` (lines 99-108) validates a different token flow (public self-registration with `?token=`), but this is unrelated to admin invite tokens.

**Schema:** `supabase/migrations/20260527000002_invitations.sql:5`
```sql
token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
```
The column is still `NOT NULL`, forcing every invite to generate a token that's never consumed.

### 3.4 `APP_URL` hardcoded fallback vs production secret

**File:** `supabase/functions/create_invite/index.ts:101`
```typescript
const appUrl = Deno.env.get('APP_URL') ?? 'http://localhost:5173'
```

If `APP_URL` is not set as a secret in production, invite emails will redirect to `localhost:5173`. The `.env` file in `supabase/functions/` only has `OPENAI_API_KEY` — `APP_URL` is not there.

### 3.5 `email_sent = 2` rate limit from change proposal (unverified but documented)

The `registration-change-proposal.md` mentions `email_sent = 2` silently dropping emails. Checking `config.toml`:

```toml
[auth.rate_limit]
email_sent = 100   # ← actually 100, not 2
```

The `email_sent = 2` claim may be from an older version of the config or one of the auth settings. Supabase's rate limiting for local dev with Inbucket should not silently drop at 100/hour. However, Inbucket itself may have a cap in certain versions.

### 3.6 Stale redirect URL in email links (old port issue)

The change proposal notes `APP_URL` mismatches between secrets and code. The documented pattern is:
1. Admin sets `APP_URL` in Supabase Dashboard / secrets
2. `create_invite` reads `Deno.env.get('APP_URL')` to build `redirectTo`
3. If the app runs on a different port than `APP_URL`, the redirect goes to a dead address

Currently `site_url = "http://localhost:5173"` and `additional_redirect_urls` includes the same — confirmed in `config.toml:154-156`. The problem arises if production `APP_URL` is set to `:3000` but the app actually runs on `:5173` (or vice versa).

### 3.7 Two registration paths with different confirmation policies

| Path | Function | `email_confirm` | Behavior |
| ---- | -------- | --------------- | -------- |
| Admin create | `admin-create-user` | `false` | Sends Confirm signup email; user must confirm |
| Admin invite | `create_invite` | N/A (inviteUserByEmail) | Sends invite email; user sets password via `updateUser` |
| Public register | `register-user` | `true` | **No email confirmation sent; instant access** |

With `enable_confirmations = true` globally, **public registration bypasses the confirmation requirement entirely** because `register-user` uses `email_confirm: true`. This means anyone can create an unverified account through `/register`.

### 3.8 `accept-invite` was renamed from "create user" to "audit only"

The function comment at `supabase/functions/accept-invite/index.ts:23` says:
> "Marks `invitations` as accepted after the user sets their password client-side."

But the `registration-change-proposal.md` note says specs still describe the old behavior. The function's actual behavior matches the new intent — it calls `supabaseAdmin.from('invitations').update(...)` only. But `prd-admin-user-registration-invitation.md` §9.2 says to "Deprecate or reduce" it, and the OpenSpec specs reference the old `accept-invite` behavior (checking token, creating user).

---

## 4. Latent Risks / Code Smells

### 4.1 `register-user` has an admin bypass that subverts `invite_only` mode

**File:** `supabase/functions/register-user/index.ts:53-63`
```typescript
// Allow authenticated admin to bypass invite-only mode
if (authHeader) {
  const supabaseUser = createClient(supabaseUrl, serviceRoleKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: { user }, error: authError } = await supabaseUser.auth.getUser()
  if (!authError && user) {
    callerIsAdmin = await isAdmin(supabaseAdmin, user.id)
  }
}
```

An admin can call `register-user` with a Bearer token to bypass `invite_only` registration mode and register any email directly. This is a security smell: it means an admin's stolen token can be used to silently register accounts without going through `admin-create-user` (which is audited differently).

### 4.2 No validation in `register-user` that email matches invitation token

**File:** `supabase/functions/register-user/index.ts:115`
```typescript
if (invitation.email !== email) {
  return errorResponse('EMAIL_MISMATCH', 'Email does not match invitation', 400)
}
```

This check only exists in the token-validated path (line 115). However, the check correctly validates that the registering email matches the invitation. This is correct for invite-only self-registration but is a different security model than the admin invite flow.

### 4.3 `create_invite` inserts `invitations` row AFTER sending the invite

**File:** `supabase/functions/create_invite/index.ts:124-134`
```typescript
const { error: insertError } = await supabaseAdmin.from('invitations').insert({...})
if (insertError) {
  return errorResponse('INTERNAL_ERROR', 'Invitation sent but failed to save audit record', 500)
}
```

If `inviteUserByEmail` succeeds but the `invitations` insert fails, the EF returns a 500 and the admin sees an error — but the invite email was already sent. The user expects an invite; the admin has to manually check. NFR-002 in the PRD addresses this.

### 4.4 `accept-invite` silently succeeds when no pending invitation exists

**File:** `supabase/functions/accept-invite/index.ts:70-72`
```typescript
if (!invitation) {
  return jsonResponse({ success: true, marked: false })
}
```

When a user who was never invited (or whose invitation was revoked) opens the accept-invite link and sets a password via `useAcceptInvite → updateUser`, the EF returns `{ success: true, marked: false }`. This is treated as success client-side. There's no indicator to the user that their invitation was not found.

### 4.5 `useCreateInvite` error handling doesn't show specific codes

**File:** `src/features/admin/create-user/hooks/useCreateInvite.ts:20`
```typescript
throw new Error(error.message ?? 'Failed to create invitation')
```

Unlike `useCreateUser` which extracts the code from the generic SDK error message, `useCreateInvite` just throws the raw Supabase SDK error message (`"Edge Function returned a non-2xx status code: 400..."`). This strips the useful `INVITE_EXISTS` or `EMAIL_ALREADY_EXISTS` code from the user.

### 4.6 @ts-nocheck on all Edge Functions

All four registration EFs have `// @ts-nocheck — Deno global types not available in editor`. This is a pragmatic choice but means TypeScript cannot catch errors across the EF boundary. The request/response shapes (e.g. `{ error: { code, message } }`) are not enforced.

### 4.7 No tests for Edge Functions in CI (only unit tests for hooks/pages)

Deno tests for Edge Functions are mentioned in `registration-change-proposal.md:item 14-15` as unimplemented. The `*.test.ts` files for Edge Functions don't appear in the glob for `**/*.test.ts`. The existing test suite covers React components and hooks via `vitest`, but not the Deno-side logic.

---

## 5. Open Questions for the User

1. **Public registration (`register-user`) — should it send a confirmation email when `enable_confirmations = true`?** Currently it uses `email_confirm: true` (instant access). The PRD non-goal #4 says admin flows only, public register is separate — but the inconsistency (admin flows send email, public doesn't) may not be intentional. **Rec:`email_confirm: false`** so public registration also requires email confirmation when `enable_confirmations = true`.

2. **`invitations.token` — drop it or keep it for audit-only?** The token is written but never read for the Supabase invite flow. Options: (A) drop the column entirely (it's not used); (B) store `auth_users.id` instead for cleaner audit; (C) keep it and continue writing it because other code might read it someday. Advised: **Option A** (drop the column; it's dead weight with a `NOT NULL` constraint causing unnecessary UUID generation on every invite).

3. **`accept-invite` audit function — should it warn when there's no pending invitation?** Currently it silently returns `{ marked: false }` when no invitation is found. If the user arrived via a valid Supabase invite link, Supabase would have already created the auth user — so finding no invitation in the DB is a data consistency issue, not a normal case. Consider: **(A)** throw an error when no invitation is found; **(B)** keep as-is since it correctly handles the edge case in testing.

4. **Should `register-user` be deprecated in favor of a unified invite-then-register flow?** The `invite_only` registration mode uses `register-user` with a custom token (looking up `invitations.token`). But the admin invite flow uses Supabase's native invite link + session. These are two completely different mechanisms. Should the custom token path in `register-user` be removed entirely (leaving `register-user` for truly open registration only)?

5. **Admin bypass in `register-user` — intended or security risk?** The code at lines 53-63 of `register-user/index.ts` allows any admin with a valid JWT to bypass `invite_only` mode. Is this a feature or an unintended escape hatch? If it's meant to let admins register users without using `admin-create-user`, it should be documented. If unintended, it should be removed.

6. **What email templates are configured in production Supabase Dashboard?** The local `config.toml` has default templates. Production may have custom templates that change the `redirectTo` behavior. Have the production redirect URLs been verified to include `/accept-invite`?

---

## 6. Appendix: Key File:Line References

### Edge Functions

| File | Key lines |
| ---- | --------- |
| `supabase/functions/admin-create-user/index.ts:93-98` | `admin.createUser` with `email_confirm: false` |
| `supabase/functions/admin-create-user/index.ts:100-108` | Error handling: EMAIL_ALREADY_EXISTS detection |
| `supabase/functions/admin-create-user/index.ts:25-33` | `isAdmin` via `profiles.role` check |
| `supabase/functions/create_invite/index.ts:101` | `APP_URL` fallback hardcoded to `localhost:5173` |
| `supabase/functions/create_invite/index.ts:104-110` | `inviteUserByEmail` call with `redirectTo` |
| `supabase/functions/create_invite/index.ts:122` | `token = crypto.randomUUID()` — written but never read |
| `supabase/functions/create_invite/index.ts:124-130` | `invitations` insert after email send (NFR-002 issue) |
| `supabase/functions/accept-invite/index.ts:23-83` | Audit-only behavior (was user-creation, renamed) |
| `supabase/functions/accept-invite/index.ts:70-72` | Silent success when no invitation found |
| `supabase/functions/register-user/index.ts:53-63` | Admin bypass of invite_only mode (security smell) |
| `supabase/functions/register-user/index.ts:131-136` | `email_confirm: true` — public registration bypasses confirmation |
| `supabase/functions/register-user/index.ts:93-95` | `REGISTRATION_BY_INVITATION_ONLY` error |
| `supabase/functions/.env:1` | Only contains `OPENAI_API_KEY` — `APP_URL` missing |

### Frontend hooks

| File | Key lines |
| ---- | --------- |
| `src/features/admin/create-user/hooks/useCreateUser.ts:19-27` | Error swallowing + code extraction from generic SDK error |
| `src/features/admin/create-user/hooks/useCreateUser.ts:29-32` | `getEdgeFunctionErrorMessage` usage |
| `src/features/admin/create-user/hooks/useCreateInvite.ts:20` | Raw `error.message` throw (no code extraction) |
| `src/features/admin/create-user/hooks/useCreateInvite.ts:23-26` | `getEdgeFunctionErrorMessage` usage |
| `src/features/auth/hooks/useRegister.ts:16-17` | `data.error` treated as string, not parsed via `getEdgeFunctionErrorMessage` |

### Frontend pages

| File | Key lines |
| ---- | --------- |
| `src/features/admin/create-user/pages/CreateUserPage.tsx:40-49` | `handleCreateUser` — distinct success message |
| `src/features/admin/create-user/pages/CreateUserPage.tsx:51-64` | `handleSendInvite` — distinct success message |
| `src/features/auth/pages/AcceptInvitePage.tsx:40-56` | `onAuthStateChange` listener for session detection |
| `src/features/auth/pages/RegisterPage.tsx:28` | Gets `token` from URL search params for invite-only registration |

### Config and schema

| File | Key lines |
| ---- | --------- |
| `supabase/config.toml:154` | `site_url = "http://localhost:5173"` |
| `supabase/config.toml:156` | Redirect URLs include `:5173/accept-invite` |
| `supabase/config.toml:216` | `enable_confirmations = true` |
| `supabase/config.toml:189` | `email_sent = 100` (not 2) |
| `supabase/migrations/20260527000002_invitations.sql:5` | `token uuid NOT NULL` — dead column |
| `src/lib/edge-function-error.ts:2-16` | `getEdgeFunctionErrorMessage` helper |

### Documentation (stale)

| File | Issue |
| ---- | ----- |
| `openspec/changes/user-registration/proposal.md` | Describes SMTP + custom token URLs (old) |
| `openspec/changes/user-registration/design.md` | Temp password mode, `create-invite` hyphen (old) |
| `openspec/changes/user-registration/specs/**` | Reference `?token=` and SMTP flow |
| `docs/registration-change-proposal.md:item 6` | Public `register-user` needs `email_confirm` policy decision |
| `docs/registration-change-proposal.md:item 9` | Token column cleanup recommendation (not resolved) |
