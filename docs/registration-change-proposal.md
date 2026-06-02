# Registration & Invitation — Change Proposal

**Based on:** [registration.prd](registration.prd) · [prd-admin-user-registration-invitation.md](prd-admin-user-registration-invitation.md)  
**Date:** 2026-05-30  
**Status:** Partially applied — admin flows refactored; legacy paths and docs still diverge

This document inventories **existing code**, what **already changed**, and what **still must change** to align with Supabase-native email flows (Confirm signup + You have been invited).

---

## 1. Executive summary

The project has **two overlapping implementations**:

| Approach | Origin | Mechanism |
| -------- | ------ | --------- |
| **Legacy (custom token)** | Original OpenSpec / first implementation | Custom `invitations.token`, `/accept-invite?token=`, SMTP links, `register-user` auto-confirms users |
| **Target (Supabase Auth)** | `registration.prd` | `admin-create-user` + `inviteUserByEmail`, session from email link, `updateUser` for password |

Recent work moved **admin create/invite** and **accept-invite UI** toward the target model. Several files, OpenSpec artifacts, public registration paths, and admin settings **still assume the legacy model**.

---

## 2. Inventory — what exists today

### 2.1 Edge Functions

| Function | Path | Role today | Aligns with PRD? |
| -------- | ---- | ---------- | ---------------- |
| `admin-create-user` | `supabase/functions/admin-create-user/index.ts` | Admin creates user; `email_confirm: false` → Confirm signup email | ✅ Use case 1 |
| `create_invite` | `supabase/functions/create_invite/index.ts` | `inviteUserByEmail` + audit row in `invitations` | ✅ Use case 2 (mostly) |
| `accept-invite` | `supabase/functions/accept-invite/index.ts` | Marks invitation accepted (audit); **no longer creates users** | ⚠️ Renamed responsibility; specs still describe old behaviour |
| `register-user` | `supabase/functions/register-user/index.ts` | Public self-registration; **`email_confirm: true`**; custom token via `?token=` | ❌ Conflicts with `enable_confirmations` |
| `registration-settings` | `supabase/functions/registration-settings/index.ts` | Admin GET/POST `app_settings` | ✅ Unchanged |
| `revoke-user` | `supabase/functions/revoke-user/index.ts` | Ban user metadata | ✅ Out of scope for this PRD |
| ~~`create-invite`~~ | Deleted (`supabase/functions/create-invite/`) | Replaced by `create_invite` (underscore) | ✅ Cleanup done |

### 2.2 Frontend — admin

| File | Role today | Aligns? |
| ---- | ---------- | ------- |
| `CreateUserPage.tsx` | Email + password; Create User → `admin-create-user`; Send Invite → `create_invite` | ✅ |
| `useCreateUser.ts` | Calls `admin-create-user` | ✅ |
| `useCreateInvite.ts` | Calls `create_invite`; no `invite_url` in UI | ✅ |
| `RegistrationSettingsPage.tsx` | Mode toggle, invitations table, ban users | ⚠️ Revoke/resend not implemented |
| `useInvitations.ts` | Direct Supabase read of `invitations` | ✅ Audit only |

### 2.3 Frontend — public auth

| File | Role today | Aligns? |
| ---- | ---------- | ------- |
| `AcceptInvitePage.tsx` | Waits for Supabase session; set password via `updateUser` | ✅ Use case 2 |
| `useAcceptInvite.ts` | `updateUser` + optional `accept-invite` audit mark + `signOut` | ✅ |
| `RegisterPage.tsx` | Self-register via `register-user`; optional `?token=` for invite-only | ⚠️ Parallel to admin invite flow |
| `useRegister.ts` | Calls `register-user`; parses `data.error` as string (not `{ code, message }`) | ⚠️ Error shape mismatch |

### 2.4 Config & database

| Asset | State | Aligns? |
| ----- | ----- | ------- |
| `supabase/config.toml` | `enable_confirmations = true`, `site_url` → `:5173`, redirect URLs for `/accept-invite` | ✅ Local |
| `invitations` table | Still has `token` column (required NOT NULL) | ⚠️ Token unused for Supabase link; audit-only |
| `app_settings` | `registration_mode`, `invite_expiry_hours` | ✅ |
| Production Supabase Dashboard | Unknown — must mirror local auth settings | ❓ Manual step |

### 2.5 Documentation (stale)

| Artifact | Problem |
| -------- | ------- |
| `openspec/changes/user-registration/proposal.md` | Describes SMTP + custom token URLs |
| `openspec/changes/user-registration/design.md` | Temp password mode, `create-invite` hyphen, custom `/accept-invite?token=` |
| `openspec/changes/user-registration/exploration.md` | Explicitly rejects Supabase magic link flow |
| `openspec/changes/user-registration/specs/*` | Scenarios reference `?token=`, SMTP, `register-user` for admin create |
| `openspec/changes/user-registration/tasks.md` | All unchecked; references old function names |
| `registration.prd` §2 gap table | Describes **pre-fix** bugs (some rows now fixed) |

---

## 3. What already changed (applied)

These items match the PRD and can be treated as **done**:

- [x] **`admin-create-user`** Edge Function created
- [x] **`useCreateUser`** → `admin-create-user` with `{ email, password }`
- [x] **`CreateUserPage`** — password fields, distinct success messages
- [x] **`create_invite`** — `inviteUserByEmail` with `redirectTo: {APP_URL}/accept-invite`; removed fake `invite_url` for admin copy
- [x] **`AcceptInvitePage`** — Supabase session from email link (no `?token=` required)
- [x] **`useAcceptInvite`** — `updateUser({ password })` instead of re-creating user server-side
- [x] **`accept-invite` EF** — audit-only (mark invitation accepted)
- [x] **`lib/supabase.ts`** — `detectSessionInUrl: true`
- [x] **`config.toml`** — `enable_confirmations = true`, redirect URLs
- [x] **Unit tests** — create-user hooks, CreateUserPage, useAcceptInvite (17 tests passing)

---

## 4. What still needs to change

### 4.1 Priority 1 — Required for both use cases to work end-to-end

| # | Change | Files | Why |
| - | ------ | ----- | --- |
| 1 | **Deploy/serve `admin-create-user`** | Supabase CLI / hosting | Function exists in repo but must be deployed locally and in prod |
| 2 | **Set `APP_URL`** in Edge Function env | `supabase/functions/.env`, production secrets | `create_invite` builds `redirectTo`; wrong URL breaks invite emails |
| 3 | **Production auth config** | Supabase Dashboard | Enable Confirm email, Site URL, redirect URLs, email provider |
| 4 | **Restart local Supabase** after `config.toml` change | `supabase stop` / `start` | `enable_confirmations` only loads on restart |
| 5 | **Manual smoke test** | Inbucket + both admin flows | Verify Confirm signup + You have been invited templates |

### 4.2 Priority 2 — Legacy code conflicts

| # | Change | Files | Detail |
| - | ------ | ----- | ------ |
| 6 | **Align public `register-user` with confirmations** | `supabase/functions/register-user/index.ts` | Today uses `email_confirm: true` → no confirmation email for self-registration. Decide: (A) public register also sends Confirm signup (`email_confirm: false`), or (B) keep instant access for open mode only. PRD non-goal says admin flows only; **recommend (A)** for consistency when `enable_confirmations = true`. |
| 7 | **Fix error parsing in auth hooks** | `useRegister.ts`, `useRegister` tests | Edge Functions return `{ error: { code, message } }`; hooks treat `data.error` as string. Use shared `getEdgeFunctionErrorMessage` (already in `src/lib/edge-function-error.ts`). |
| 8 | **Clarify two invite paths** | `RegisterPage` + specs | Legacy: `/register?token=<uuid>` + `register-user`. Target admin invite: email link → `/accept-invite` + session. **Recommend:** deprecate token on `/register` for admin invites; keep token path only if product still wants invite-only **self-register** (different from admin invite). Document decision in OpenSpec. |
| 9 | **Remove or repurpose `invitations.token`** | Migration optional | Column still written but not used in Supabase link flow. Options: (A) keep for audit only, (B) store `auth.users.id`, (C) drop column in migration. |
| 10 | **Auth callback route (optional)** | `router.tsx`, new page | Email **confirmation** (use case 1) may redirect to `/` or need `/auth/callback` to show “Email confirmed — log in”. Today no dedicated handler; verify Supabase redirect behaviour. |

### 4.3 Priority 3 — Admin Registration Settings (incomplete from original OpenSpec)

| # | Change | Files | Detail |
| - | ------ | ----- | ------ |
| 11 | **Revoke invitation** | New `revoke-invite` EF or extend `create_invite` | `RegistrationSettingsPage` logs to console only |
| 12 | **Resend invitation** | `RegistrationSettingsPage`, hook | Call `create_invite` again; revoke old pending row first |
| 13 | **Resend / revoke tests** | Vitest + optional Deno tests | Specs in `admin-registration-settings/spec.md` |

### 4.4 Priority 4 — Tests & quality

| # | Change | Files | Detail |
| - | ------ | ----- | ------ |
| 14 | **`admin-create-user` Deno tests** | New `index.test.ts` | Mirror `create_invite` test pattern |
| 15 | **Fix `create_invite` Deno tests** | `index.test.ts` | Tests import `{ default: handler }` but handler uses `Deno.serve` — tests may not exercise real handler (pre-existing issue) |
| 16 | **`AcceptInvitePage` tests** | New/updated | Mock `onAuthStateChange` + session; remove `?token=` assumptions |
| 17 | **E2E flows** | Playwright | OpenSpec tasks list invite + admin create E2E — not implemented |
| 18 | **`useRegister` error handling** | `useRegister.test.tsx` | Update for nested error object |

### 4.5 Priority 5 — SDD / docs sync

| # | Change | Files |
| - | ------ | ----- |
| 19 | Rewrite **proposal.md** | Supabase email, not SMTP/custom token |
| 20 | Rewrite **design.md** | Sequence diagrams for both use cases |
| 21 | Update **specs/** deltas | `admin-create-user`, `accept-invite`, `admin-registration-settings`, `public-registration` |
| 22 | Mark **tasks.md** checkboxes | Reflect actual completion state |
| 23 | Update **registration.prd** gap table | Mark fixed rows; link this proposal |

---

## 5. Architecture decision record

### ADR-1: Admin invite uses Supabase `inviteUserByEmail`, not custom token URL

**Decision:** Email link is generated by Supabase; app route `/accept-invite` receives `#access_token` in hash.  
**Rejects:** Custom `/accept-invite?token=<uuid>` in email (old `create_invite` + OpenSpec).  
**Still uses:** `invitations` table for admin audit only.

### ADR-2: Admin create user is separate from public `register-user`

**Decision:** New `admin-create-user` EF; admin JWT required.  
**Rejects:** Reusing `register-user` with `mode: temp_password` (old spec).  
**Note:** `register-user` still has admin bypass for invite-only mode — can remove if unused.

### ADR-3: `accept-invite` Edge Function is audit-only

**Decision:** Password set client-side via `supabase.auth.updateUser`. EF marks `invitations.status = accepted`.  
**Rejects:** EF calling `admin.createUser` again ( caused duplicate-user bugs with `inviteUserByEmail`).

### ADR-4: Email confirmation enabled globally

**Decision:** `enable_confirmations = true` in config.  
**Impact:** Public `/register` should be reviewed (see §4.2 item 6).

---

## 6. Recommended implementation slices

Split remaining work into reviewable PRs:

| Slice | Scope | Est. risk |
| ----- | ----- | --------- |
| **A — Deploy & verify** | Deploy EF, env vars, manual Inbucket test, optional auth callback page | Low |
| **B — Public register alignment** | `register-user` confirmation behaviour, `useRegister` errors, RegisterPage token policy | Medium |
| **C — Admin settings actions** | Resend/revoke invite | Medium |
| **D — Database cleanup** | Optional migration: `auth_user_id` on invitations, drop unused token from email flow docs | Low |
| **E — SDD sync** | OpenSpec proposal/design/specs/tasks | Low (docs only) |
| **F — E2E** | Playwright admin create + invite flows | Medium |

Slices **A** and **B** unblock production use cases 1 and 2. **C–F** complete the original OpenSpec scope.

---

## 7. File-level checklist

```
supabase/functions/
  admin-create-user/index.ts     ✅ done — add tests, deploy
  create_invite/index.ts         ✅ done — fix Deno tests
  accept-invite/index.ts         ✅ refactored — update spec/docs
  register-user/index.ts         ❌ change email_confirm policy
  registration-settings/         ✅ unchanged
  revoke-user/                   ✅ unchanged

src/features/admin/create-user/  ✅ done
src/features/auth/
  pages/AcceptInvitePage.tsx     ✅ done — add page tests
  pages/RegisterPage.tsx         ⚠️ token path vs PRD
  hooks/useRegister.ts           ⚠️ error parsing
  hooks/useAcceptInvite.ts       ✅ done

src/lib/
  supabase.ts                    ✅ done
  edge-function-error.ts         ✅ done — adopt in useRegister

openspec/changes/user-registration/  ❌ full doc refresh needed

supabase/config.toml             ✅ local — prod Dashboard manual
supabase/migrations/             ⚠️ optional invitations schema tweak
```

---

## 8. Verification checklist (from PRD)

### Use case 1 — Create user with password

- [x] Admin form: email + password + confirm
- [x] Calls `admin-create-user`
- [ ] User unconfirmed until email link clicked (verify in Auth dashboard)
- [ ] Confirm signup email in Inbucket
- [ ] Login after confirmation
- [ ] Duplicate email → 409

### Use case 2 — Send invitation

- [x] Send Invite email-only
- [ ] You have been invited in Inbucket
- [ ] Email link → `/accept-invite` with session
- [x] Password via `updateUser`
- [ ] Login after password set
- [ ] No duplicate auth user
- [ ] Invitation marked accepted in Registration Settings

---

## 9. Changelog

| Version | Date | Changes |
| ------- | ---- | ------- |
| 0.1 | 2026-05-30 | Initial change proposal vs existing codebase |
