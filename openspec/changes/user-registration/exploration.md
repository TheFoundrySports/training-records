# Exploration: user-registration

## Current State

- `/login` is the only public auth route
- Supabase Auth has `enable_signup = true` but no registration page exists in the app
- SMTP is **not configured** (`enable_confirmations = false`, rate-limited Inbucket locally)
- `profiles` table auto-creates on signup via `handle_new_user()` trigger, defaulting role to `athlete`
- `update-user-role` Edge Function is the admin dual-write pattern to follow
- `ai_settings` single-row table (fixed UUID) exists as a pattern for `app_settings`
- `user_profiles` view joins `auth.users` + `profiles` for admin email visibility

---

## Affected Areas

- `src/features/auth/AuthContext.tsx` — role read from `user_metadata.role`
- `src/app/router.tsx` — new public routes (`/register`, `/accept-invite`) and admin routes
- `src/features/auth/AdminRoute.tsx` — unchanged
- `src/features/admin/admin-shell/AdminShell.tsx` — new nav items
- `src/features/admin/users/pages/UserManagementPage.tsx` — extend for ban/invite mgmt
- `supabase/functions/update-user-role/index.ts` — reference pattern for new Edge Functions
- `supabase/migrations/20260404223748_create_profiles.sql` — `handle_new_user` trigger
- `supabase/migrations/20260427000001_create_ai_settings.sql` — pattern for `app_settings` table

---

## Answers to Explore Questions

### 1. Supabase built-in `inviteUserByEmail()` vs custom token table

| | Built-in `inviteUserByEmail()` | Custom token table |
|---|---|---|
| **Token lifecycle** | Supabase-generated, opaque, single-use by default | Self-managed, explicit expiry logic |
| **Expiration** | Configurable via `auth.email.max_frequency` but not per-token | Configurable per invite (default 48h) |
| **Revocation** | No direct revocation — must delete user or disable account | Delete/soft-delete token row |
| **Email delivery** | Requires SMTP configured (currently not) | Requires SMTP for real email; custom token link works async |
| **Invite tracking** | No DB record — status unknown until acceptance | Full audit trail in `invites` table |
| **Security** | Token in magic link URL, handled by Supabase | Token validated server-side in Edge Function |
| **Complexity** | Low — one API call | Higher — token gen, DB, expiry check |
| **Password setting** | Supabase handles via magic link → sets password | User sets password on `/accept-invite` |
| **When broken** | If SMTP is misconfigured, invite emails silently fail | Works even without real email (token link debuggable) |

**Recommendation: Custom token table**

The built-in `inviteUserByEmail()` requires SMTP to be working — a critical dependency the codebase currently lacks. A custom `invites` table decouples the invite flow from email delivery, lets admins track pending/accepted/revoked state, and allows per-invite expiry configuration. Token can be a `crypto.randomUUID()` stored with `expires_at` and `status`.

---

### 2. Where to store registration mode config

`ai_settings` table pattern is already established (single-row, fixed UUID, admin RLS). The same pattern should be used for a new `app_settings` table:

```sql
create table public.app_settings (
  id            uuid        primary key default '00000000-0000-0000-0000-000000000002',
  mode          text        not null default 'open' check (mode in ('open', 'invite_only')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint app_settings_single_row check (id = '00000000-0000-0000-0000-000000000002')
);
```

Why **not** env vars: the requirement explicitly states "admin can toggle without deploy."

---

### 3. What Edge Functions are needed

| Function | Purpose |
|---|---|
| `create-invite` | Admin creates invite — inserts token row, returns invite link. Accepts `email`. Calls nothing else. |
| `register-user` | Public registration — validates mode (`open` vs `invite_only`), validates invite token if needed, creates auth user + profile. Called from `/register` page. |
| `accept-invite` | Magic link handler — validates token from URL, sets password, activates account. Replaces Supabase's built-in invite flow. |
| `revoke-user` | Admin bans user — calls `supabaseAdmin.auth.admin.deleteUser()` (or disable). Follows `update-user-role` dual-write pattern. |
| *(reuse `update-user-role`)* | For role changes — already exists |

All functions use `service_role` key client-side and validate the caller's identity and admin status via `Authorization` header + `getUser()`.

---

### 4. What migrations are needed

1. **`app_settings` table** — single-row config (same pattern as `ai_settings`)
2. **`invites` table** — `id, email, token (unique), status (pending/accepted/revoked/expired), expires_at, created_by, created_at`
3. **`profiles.banned_at`** — nullable `timestamptz` for soft-ban tracking (optional, delete is simpler)
4. **Update `handle_new_user` trigger** — set `role = 'athlete'` (already defaulting, keep explicit)
5. **Add RLS policies on `app_settings`** and `invites`

---

### 5. How `/accept-invite` handles the Supabase magic link `#access_token`

**Correction**: `/accept-invite` is **not** a Supabase magic link callback. It is a custom route that:

1. Receives a URL like `/accept-invite?token=<uuid>`
2. The token is the custom `invites.token` UUID, **not** a Supabase `#access_token`
3. User enters a password
4. Edge Function `accept-invite` validates the token, then calls `supabaseAdmin.auth.admin.createUser()` with the provided email + password, or uses `updateUserById` if the user already exists but is in `pending` state

Supabase's built-in `inviteUserByEmail()` sends a magic link that lands on `/confirm` with `#access_token` — but since SMTP is not configured, we bypass that entirely. The custom flow sends a custom link (`/accept-invite?token=...`) and handles the password step ourselves.

---

### 6. Revocation strategy — delete user or ban

**Delete user** (`auth.admin.deleteUser()`) is:
- Cleaner — user record gone, no orphaned state
- Irreversible — user loses all history (workouts, BJJ progress)
- Correct for GDPR/compliance use cases

**Ban** (set `banned_at` or disable refresh token) is:
- Recoverable — admin can un-ban
- Preserves audit trail and user's data
- Requires more code — token invalidation, UI indicators

**Recommendation**: **Delete user** for this phase. Rationale:
- No complex audit/recovery requirements stated
- Simpler implementation — single Admin API call
- Admin can always create a new user manually for that person
- If history preservation becomes important later, it's a migration to add `banned_at`

If deletion is too aggressive for the use case, add a `deleted_at` column to `profiles` (soft-delete) rather than blocking in the auth layer.

---

## Recommended Approach

### Architecture

```
Public routes:
  /login                — existing
  /register             — new (mode-aware: open or token-gated)
  /accept-invite        — new (token + password form)

Admin routes (under /admin/):
  /admin/users          — existing, extend with ban/create/invite actions
  /admin/create-user    — new (admin creates user directly)
  /admin/registration-settings — new (mode toggle + invite management)

Edge Functions:
  register-user         — POST, public, handles both open and invite-only flows
  create-invite         — POST, admin-only, creates invite token
  accept-invite         — POST, public, validates token + sets password
  revoke-user           — POST, admin-only, deletes user via Admin API

DB Tables:
  app_settings          — single-row: mode ('open' | 'invite_only')
  invites               — id, email, token, status, expires_at, created_by
```

### Key flows

**Open registration** (`mode = 'open'`):
```
/register → register-user Edge Function → creates auth.users (+ trigger creates profile with role=athlete)
```

**Invite-only registration**:
```
Admin creates invite → create-invite EF → stores token in invites table → sends email with /accept-invite?token=<uuid>
User visits /accept-invite → enters password → accept-invite EF validates token + creates account
```

**Admin creates user directly**:
```
Admin fills form → create-invite EF (or new create-user EF) → creates auth.users with temp password or magic link
```

### Security posture

- Invite tokens are UUIDs, single-use, expiring (default 48h)
- `invite-only` mode enforced server-side in `register-user` Edge Function (reads `app_settings`)
- All admin actions require valid JWT + admin role check in Edge Function
- Registration always creates `role = 'athlete'` — no way to self-register as admin
- Revocation is delete (irreversible, audit trail via who deleted + when)

---

## Risks

1. **SMTP not configured** — invite emails won't actually be delivered in production. Custom token approach mitigates this (link is still generated, just not delivered by email without SMTP). Must be communicated as a prerequisite.
2. **Token entropy** — `crypto.randomUUID()` is sufficient for v4 UUIDs, but storing raw token in URL query param exposes it in server logs/referrer headers. Acceptable for internal/tools, but note for user-facing emails.
3. **No email verification in `open` mode** — `enable_confirmations = false` means users can register with any email. This is existing behavior (already in config). Not changed by this feature.
4. **Concurrent invite acceptance** — if same token used twice simultaneously, one will succeed and the other fail. Token should be marked accepted atomically in DB transaction.
5. **Token expiry race** — check `expires_at` in DB on every use, not just at creation time.