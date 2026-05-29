# Proposal: user-registration

## Intent

Add user registration to the app with two modes (open or invite-only) controlled by an admin toggle, plus admin user management (create, invite, revoke). SMTP must be configured for email delivery — currently not present.

## Scope

### In Scope
- `/register` public page — mode-aware (open or token-gated)
- `/accept-invite` public page — token validation + password set
- `/admin/create-user` page — admin creates user directly
- `/admin/registration-settings` page — mode toggle + invite management
- 4 Edge Functions: `register-user`, `create-invite`, `accept-invite`, `revoke-user`
- 2 DB migrations: `app_settings` table, `invitations` table
- RLS policies on new tables
- AdminShell nav: 2 new items (Create User, Registration Settings)

### Out of Scope
- Email template UI (admin pastes raw HTML or uses system)
- User un-ban / soft-delete recovery
- Email verification in open mode (`enable_confirmations` stays false)
- Self-service password reset flow
- Bulk invite import

## Capabilities

### New Capabilities
- `user-registration`: Full user registration system with open and invite-only modes
- `user-invitations`: Admin invite creation and management with single-use expiring tokens
- `admin-user-management`: Admin create and delete users, toggle registration mode

### Modified Capabilities
- None

## Approach

**Open registration**: `/register` → `register-user` Edge Function → creates `auth.users` + trigger sets `role=athlete`.

**Invite-only mode**: Admin creates invite → `create-invite` → stores token in `invitations` table → sends email with `/accept-invite?token=<uuid>` (requires SMTP). User visits link → `accept-invite` validates token + password → creates `auth.users`.

**Admin creates user directly**: `/admin/create-user` → `create-invite` (reused) generates temp password or `create-user` Edge Function → creates `auth.users` with `role=athlete`.

**Revocation**: `revoke-user` calls `supabaseAdmin.auth.admin.deleteUser()` (irreversible delete).

**Mode enforcement**: `register-user` reads `app_settings.mode` server-side; rejects registration in `invite_only` mode. No client-side bypass possible.

**Token security**: UUID v4 tokens, single-use, 48h expiry, atomic DB update on use.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/app/router.tsx` | Modified | Add `/register`, `/accept-invite` public routes; `/admin/create-user`, `/admin/registration-settings` admin routes |
| `src/features/admin/admin-shell/AdminShell.tsx` | Modified | Add 2 nav items under Admin section |
| `supabase/functions/register-user/index.ts` | New | Public — validates mode, creates auth user |
| `supabase/functions/create-invite/index.ts` | New | Admin-only — creates invite token, returns link |
| `supabase/functions/accept-invite/index.ts` | New | Public — validates token + password, creates account |
| `supabase/functions/revoke-user/index.ts` | New | Admin-only — deletes user via Admin API |
| `supabase/migrations/{timestamp}_create_app_settings.sql` | New | Single-row `app_settings` table |
| `supabase/migrations/{timestamp}_create_invitations.sql` | New | `invitations` table with token, status, expiry |
| `src/features/auth/AuthContext.tsx` | Modified | Read role from user_metadata (already done) |
| `src/features/admin/users/pages/UserManagementPage.tsx` | Modified | Extend with invite/revoke actions |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| SMTP not configured — invite emails silently fail | High | Document as prerequisite; custom token approach still generates links for manual delivery |
| Token in URL query param exposed in server logs | Low | Acceptable for internal admin tools; note in docs |
| Concurrent invite acceptance — race condition | Low | Atomic UPDATE in transaction marks token accepted |
| `enable_confirmations = false` — no email verification in open mode | Existing | Not changed by this feature |
| Admin creates user with unintended role | Low | Always set `role=athlete` in Edge Function; no role parameter exposed |

## Rollback Plan

1. **DB**: Roll back migrations — `DROP TABLE IF EXISTS invitations; DROP TABLE IF EXISTS app_settings;`
2. **Edge Functions**: Undeploy `register-user`, `create-invite`, `accept-invite`, `revoke-user` via Supabase dashboard
3. **Frontend**: Remove new routes from `router.tsx` and nav items from `AdminShell.tsx`
4. **Auth**: No auth.users records need cleanup — users created will still exist but have no profile (trigger still fires on existing `handle_new_user`). Delete manually if needed.

## Dependencies

- **SMTP must be configured** before invite emails can be sent. Add to `config.toml`:
  ```toml
  [auth.email]
  enable_signup = true
  double_confirm_changes = true
  enable_confirmations = false # existing; keep for now

  [auth.email.smtp]
  host = "smtp.example.com"
  port = 587
  user = "you@example.com"
  password = "your-smtp-password"
  admin_email = "admin@foundrytraining.com"
  ```
- Supabase Auth `enable_signup = true` (already set)
- `handle_new_user()` trigger already defaults `role = 'athlete'` (existing behavior)

## Success Criteria

- [ ] Open registration creates an athlete user with valid JWT
- [ ] Invite-only mode rejects registration when mode is `invite_only`
- [ ] Invite token is single-use; second attempt returns "token already used"
- [ ] Expired tokens (>48h) are rejected
- [ ] Admin can toggle mode between `open` and `invite_only` without deploy
- [ ] Admin can create user directly from `/admin/create-user`
- [ ] Admin can revoke user — user is deleted from `auth.users`
- [ ] New nav items visible in AdminShell only to admin users
- [ ] All Edge Functions validate caller identity and admin role before acting