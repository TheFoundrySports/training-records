# Tasks: user-registration

## Phase 1: Database Migrations

### 1.1 Create app_settings table
- [ ] Write migration: `supabase/migrations/{timestamp}_create_app_settings.sql`
- [ ] Types: registration_mode enum, invite_expiry_hours integer, updated_at trigger
- [ ] Seed with default open mode
- [ ] Add RLS policies: authenticated SELECT, admin INSERT/UPDATE
- [ ] Test: verify table exists and default row is present

### 1.2 Create invitations table
- [ ] Write migration: `supabase/migrations/{timestamp}_create_invitations.sql`
- [ ] Types: invitation_status enum, token uuid unique, indexes on token/email/status
- [ ] RLS policies: admin full access, public none (Edge Functions only)
- [ ] Test: verify table and indexes exist

---

## Phase 2: Edge Functions

### 2.1 register-user
- [ ] Create `supabase/functions/register-user/index.ts`
- [ ] Fetch app_settings, validate mode
- [ ] If invite_only + no/invalid token → return 400
- [ ] If token provided → validate invitation, mark accepted
- [ ] Create user with supabaseAdmin.auth.admin.createUser()
- [ ] Set user_metadata.role = 'athlete'
- [ ] Return { user_id }
- [ ] Unit test: open mode creates user, invite_only blocks unregistered

### 2.2 create-invite
- [ ] Create `supabase/functions/create-invite/index.ts`
- [ ] Validate admin role from JWT
- [ ] Check no existing pending invite for email
- [ ] Create invitations record with UUID token, 48h expiry
- [ ] Send email via SMTP (Inbucket for local)
- [ ] Return { invite_url, expires_at }
- [ ] Unit test: admin creates invite, non-admin gets 401

### 2.3 accept-invite
- [ ] Create `supabase/functions/accept-invite/index.ts`
- [ ] Validate token: exists + pending + not expired
- [ ] Create auth.users with role=athlete
- [ ] Mark invitation status=accepted, used_at=now()
- [ ] Return { user_id }
- [ ] Unit test: valid token creates user, expired/used token rejected

### 2.4 revoke-user
- [ ] Create `supabase/functions/revoke-user/index.ts`
- [ ] Validate admin role
- [ ] Update user_metadata: { banned: true, banned_at: now() }
- [ ] Return { success: true }
- [ ] Unit test: admin bans user, non-admin gets 401

### 2.5 registration-settings
- [ ] Create `supabase/functions/registration-settings/index.ts`
- [ ] GET: return app_settings row
- [ ] POST: update registration_mode and/or invite_expiry_hours
- [ ] Validate admin role on POST
- [ ] Unit test: admin updates settings, non-admin gets 401 on write

---

## Phase 3: Public Pages

### 3.1 RegisterPage
- [ ] Create `src/features/auth/pages/RegisterPage.tsx`
- [ ] Parse ?token= on mount, validate inline (or call Edge Function)
- [ ] If mode=invite_only + no valid token → show "by invitation only" message
- [ ] React Hook Form + Zod schema: email, password (min 8), passwordConfirmation (must match)
- [ ] Submit calls register-user Edge Function
- [ ] On success → redirect to /login?registered=true
- [ ] Unit tests: renders, validates input, handles token validation

### 3.2 AcceptInvitePage
- [ ] Create `src/features/auth/pages/AcceptInvitePage.tsx`
- [ ] On mount: call accept-invite Edge Function to validate token (or dedicated validate endpoint)
- [ ] If invalid → show error state with admin contact link
- [ ] If valid → show set-password form (password, passwordConfirmation)
- [ ] Submit calls accept-invite Edge Function
- [ ] On success → redirect to /login?registered=true
- [ ] Unit tests: renders, validates input, handles error states

### 3.3 Auth hooks
- [ ] Create `src/features/auth/hooks/useRegister.ts` — wraps register-user POST
- [ ] Create `src/features/auth/hooks/useAcceptInvite.ts` — wraps accept-invite POST
- [ ] TanStack Query v5 mutation pattern with proper error handling

---

## Phase 4: Admin Pages

### 4.1 CreateUserPage
- [ ] Create `src/features/admin/create-user/pages/CreateUserPage.tsx`
- [ ] Toggle: "Create with password" vs "Send invite"
- [ ] Email field with Zod validation
- [ ] "Create with password" → call register-user with mode: "temp_password" → display generated password
- [ ] "Send invite" → call create-invite → show success
- [ ] Auth guard: redirect if not admin
- [ ] Unit tests: form renders, both modes work, auth guard

### 4.2 RegistrationSettingsPage
- [ ] Create `src/features/admin/registration-settings/pages/RegistrationSettingsPage.tsx`
- [ ] Toggle switch: Open / Invite-only
- [ ] Invitation table with columns: Email, Status, Invited By, Created At, Expires At, Actions
- [ ] "Resend" button: if pending + not expired → call create-invite again
- [ ] "Revoke" button: if pending → call revoke-invite (or update via Edge Function)
- [ ] Auth guard: admin only
- [ ] Unit tests: renders, toggle works, actions work

### 4.3 Admin hooks
- [ ] Create `src/features/admin/hooks/useCreateUser.ts`
- [ ] Create `src/features/admin/hooks/useRegistrationSettings.ts`
- [ ] Create `src/features/admin/hooks/useInvitations.ts`
- [ ] Create `src/features/admin/hooks/useRevokeUser.ts`
- [ ] TanStack Query v5 pattern

---

## Phase 5: Router + AdminShell

### 5.1 Router changes
- [ ] Add `/register` and `/accept-invite` routes OUTSIDE ProtectedRoute in `src/app/router.tsx`
- [ ] Add `/admin/create-user` and `/admin/registration-settings` inside AdminShell layout route

### 5.2 AdminShell navigation
- [ ] Add "Create User" nav item to AdminShell sidebar (with UserPlusIcon)
- [ ] Add "Registration Settings" nav item to AdminShell sidebar (with SettingsIcon)
- [ ] Verify 6 items total in Admin section

---

## Phase 6: Tests

### 6.1 Edge Function unit tests
- [ ] register-user: open mode, invite_only blocked, invalid token
- [ ] create-invite: admin creates, non-admin 401, duplicate email
- [ ] accept-invite: valid token, expired token, used token
- [ ] revoke-user: admin bans, non-admin 401
- [ ] registration-settings: admin updates, non-admin 401, GET works for authenticated

### 6.2 Frontend unit tests (Vitest + React Testing Library)
- [ ] RegisterPage: renders, validates, submits, handles errors
- [ ] AcceptInvitePage: valid token, invalid token error state
- [ ] CreateUserPage: both modes, auth guard
- [ ] RegistrationSettingsPage: toggle, table, actions

### 6.3 Integration tests
- [ ] Full open registration flow (E2E via Playwright)
- [ ] Full invite registration flow (E2E)
- [ ] Admin create user flow (E2E)
- [ ] Ban user flow — banned user gets 401 (E2E)

---

## Review Workload Forecast

| Phase | Est. Lines | Chained PRs | Risk |
|-------|-----------|-------------|------|
| DB migrations | ~50 | No | Low |
| Edge Functions (4 + settings) | ~300 | Yes | Medium |
| Public pages + hooks | ~250 | No | Low |
| Admin pages + hooks | ~350 | Yes | Medium |
| Router + AdminShell | ~40 | No | Low |
| Tests (unit + E2E) | ~400 | Yes | Medium |

**Total estimated changed lines**: ~1390
**400-line budget risk**: High

**Decision needed before apply**: Yes
**Chained PRs recommended**: Yes — split into 4 slices:
1. DB migrations (standalone, no review needed for migration)
2. Edge Functions (4 functions, ~300 lines)
3. Frontend pages + hooks (2 public + 2 admin pages, ~600 lines)
4. Router, AdminShell, tests (~500 lines)

**Risk highlights**:
- SMTP configuration gaps in local dev could cause silent email failures
- Concurrent invite acceptance race condition (mitigated by atomic DB update)
- Edge Function auth validation must be consistent across all 4 functions