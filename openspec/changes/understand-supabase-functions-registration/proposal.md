# Proposal — Fix Supabase Registration Edge Functions

## Why

The current `admin-create-user` Edge Function creates users with `email_confirm: false`, which sends a "Confirm signup" email that requires clicking a link before the user can log in. The desired UX is: admin sets email + password → user is created immediately usable (no email confirmation needed) → a notification email is sent telling the user their account was created.

## What changes (in scope)

### A. `admin-create-user`: switch to `email_confirm: true` + send notification email

- Change `admin.createUser({ email_confirm: false })` → `email_confirm: true`
- After `createUser` succeeds, send a **custom notification email** via Mailpit/Supabase Auth (`supabaseAdmin.auth.admin.generateLink({ type: 'magiclink', email })` or a direct email) stating the account was created with the admin-provided password
- The notification email must be clear: this is an account creation notice, NOT a "click to confirm" email

**Files:** `supabase/functions/admin-create-user/index.ts`

### B. Fix error parsing in `useCreateUser.ts` and `useRegister.ts`

- `useCreateUser.ts` already uses `getEdgeFunctionErrorMessage` but the regex-based error extraction from the generic SDK wrapper message is fragile and doesn't extract the real body
- Replace with proper parsing of the Edge Function response body's `{ error: { code, message } }` shape
- `useRegister.ts` does not use `getEdgeFunctionErrorMessage` at all — adopt it

**Files:** `src/features/admin/create-user/hooks/useCreateUser.ts`, `src/features/auth/hooks/useRegister.ts`

### C. `accept-invite`: return a warning when no pending invitation is found

- Instead of silently returning `{ success: true, marked: false }` when no invitation exists, return `{ success: true, warning: "No pending invitation found for this session" }`
- Let the user continue setting their password — don't block on a missing row

**Files:** `supabase/functions/accept-invite/index.ts`

### D. `create_invite`: remove `localhost:5173` fallback, require `APP_URL`

- Remove the `?? 'http://localhost:5173'` fallback on `Deno.env.get('APP_URL')`
- If `APP_URL` is not set, throw `MISSING_APP_URL` immediately — surface the config bug rather than silently sending broken invite links
- Add a note in `supabase/functions/.env.example` documenting `APP_URL`

**Files:** `supabase/functions/create_invite/index.ts`, `supabase/functions/.env.example`

### E. Local dev workflow documentation

- Bump `email_sent` rate limit in `config.toml` from `2` to `100` (already noted as `100` in current config — confirm and document)
- Add a small README note in `supabase/functions/` explaining:
  - `supabase start` runs the built-in Edge Runtime — no separate `serve` needed for normal dev
  - Only `admin-create-user` needs manual `supabase functions serve` if you want to debug it live
  - How to view captured emails: Inbucket at `http://127.0.0.1:54324`

**Files:** `supabase/config.toml`, `supabase/functions/README.md` (new)

## What does NOT change (out of scope)

- **Public `/register` and `register-user`**: handled in a separate worktree — no changes here
- **`?token=` query param path**: in `RegisterPage` and `register-user`, handled separately
- **Admin bypass in `register-user`**: left as-is (out of scope)
- **`invitations.token` column**: kept as-is — still written by `create_invite` and may be used by the out-of-scope public-registration worktree; no migration
- **Auth config** (`enable_confirmations`, redirect URLs, site URL): already in place, not changing
- **`accept-invite` function name or behavior** beyond the warning field — it remains audit-only

## Success criteria

- [ ] `admin-create-user` creates a user with `email_confirmed_at = now()` (user can log in immediately, no email confirmation required)
- [ ] The Create User form shows the real error message from the EF body (e.g. `A user with this email already exists`) instead of `Edge Function returned a non-2xx status code`
- [ ] `create_invite` sends a working invite email with a `redirect_to` pointing to the actual configured `APP_URL` (not `localhost:5173`)
- [ ] `accept-invite` returns a non-blocking warning when no pending invitation is found; the UI shows a notice but lets the user continue
- [ ] A notification email is received after admin creates a user (not the "Confirm signup" template)
- [ ] New tests cover the error parsing fix and the `accept-invite` warning path

## Non-goals

- No database migration or schema changes
- No changes to `register-user`, `RegisterPage`, or `useRegister.ts` beyond adopting `getEdgeFunctionErrorMessage`
- No changes to auth config (`enable_confirmations`, redirect URLs) — already configured
- No changes to `?token=` query param path for admin invite — handled in the public-registration worktree

## Risks

| Risk | Likelihood | Mitigation |
| ---- | ---------- | ---------- |
| `email_confirm: true` creates accounts with no email verification — acceptable for admin-issued accounts, but the notification email must be explicit that the account was created (not a confirmation link) | Low | Use a "your account was created" email template, not the "Confirm signup" template |
| Missing `APP_URL` now hard-fails `create_invite` — prevents sending invites until set | Low | Document `APP_URL` requirement in `.env.example`; production secret setup must include it |
| Rate limit `email_sent = 2` was reported in prior docs but current config shows `100` | Low | Verify actual rate limit in testing; bump if needed |

## Size estimate

| File | Change | Est. lines |
| ---- | ------ | ---------- |
| `supabase/functions/admin-create-user/index.ts` | `email_confirm: true` + notification email | ~+15 |
| `src/features/admin/create-user/hooks/useCreateUser.ts` | Fix error parsing | ~+10 |
| `src/features/auth/hooks/useRegister.ts` | Adopt `getEdgeFunctionErrorMessage` | ~+5 |
| `supabase/functions/accept-invite/index.ts` | Warning field | ~+5 |
| `supabase/functions/create_invite/index.ts` | Remove fallback, require `APP_URL` | ~+5 |
| `supabase/config.toml` | Already changed (confirm `email_sent = 100`) | ~0 |
| `supabase/functions/.env.example` | Document `APP_URL` | ~+5 |
| `supabase/functions/README.md` | Dev workflow note | ~+20 |
| New tests (error parsing, warning path) | Vitest for hooks | ~+50 |
| **Total** | | **~+115 lines** (well under 400) |

## Open items

1. **`invitations.token` column**: kept as-is (write-only in Supabase invite flow, may be reused by the public-registration worktree). No migration in this change.
2. **Notification email mechanism**: use `supabaseAdmin.auth.admin.generateLink({ type: 'magiclink', email })` or Supabase's direct email sending API — confirm which approach works in local dev with Inbucket.