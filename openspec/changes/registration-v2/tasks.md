# Tasks: registration-v2

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~100–150 (tests only, no code changes needed) |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | exception-ok |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

## Phase 1: Verification — Hooks& Edge Functions

- [x] 1.1 Confirm `useCreateUser` calls `admin-create-user` with `{ email, password }` + auth header (`src/features/admin/create-user/hooks/useCreateUser.ts:14`)
- [x] 1.2 Confirm `useCreateInvite` calls `create_invite` with `{ email }` + auth header (`src/features/admin/create-user/hooks/useCreateInvite.ts:14`)
- [x] 1.3 Confirm `admin-create-user` EF uses `email_confirm: false` (`supabase/functions/admin-create-user/index.ts:96`)
- [x] 1.4 Confirm `create_invite` EF uses `inviteUserByEmail` with `redirectTo` (`supabase/functions/create_invite/index.ts:104–109`)
- [x] 1.5 Confirm `accept-invite` EF reads session token from hash (`supabase/functions/accept-invite/index.ts`)

## Phase 2: Infrastructure Checks — Deployment & Config

- [ ] 2.1 List deployed edge functions: `supabase functions list` — confirm `admin-create-user`, `create_invite`, and `accept-invite` are deployed
- [ ] 2.2 Verify `APP_URL` secret is set in Supabase: `supabase secrets list` — check `APP_URL` is present
- [ ] 2.3 Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` secrets are present for edge functions

## Phase 3: Testing — Add Missing Tests

- [x] 3.1 Add test: `useCreateUser` throws parsed error from `{ error: { code, message } }` shape
- [x] 3.2 Add test: `useCreateUser` throws on network-level error from `invoke()`
- [x] 3.3 Add test: `useCreateInvite` throws parsed error from `{ error: { code, message } }` shape
- [x] 3.4 Add test: `useCreateInvite` throws on network-level error from `invoke()`
- [x] 3.5 Add test: `CreateUserPage` shows validation error when password < 8 characters
- [x] 3.6 Add test: `CreateUserPage` shows validation error when passwords do not match
- [x] 3.7 Run all existing tests: `vitest src/features/admin/create-user --run`

## Phase 4: Integration Verification

- [ ] 4.1 Manual test: `POST /admin-create-user` with valid admin token returns `{ success: true, user_id }`
- [ ] 4.2 Manual test: `POST /admin-create-user` without auth returns 401
- [ ] 4.3 Manual test: `POST /create_invite` with valid admin token returns `{ success: true, expires_at }`
- [ ] 4.4 Manual test: `POST /create_invite` without auth returns 401
- [ ] 4.5 Verify `CreateUserPage` renders email + password + confirm-password fields and both action buttons

## Phase 5: Documentation Cleanup

- [ ] 5.1 Confirm design.md open questions are resolved (all five design decisions implemented)
- [ ] 5.2 Confirm no stale comments or TODO items remain in hooks and EF files