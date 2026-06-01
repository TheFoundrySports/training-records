# Tasks: understand-supabase-functions-registration

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Total commits | 5 |
| Estimated changed lines (forecast) | ~219 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Decision needed before apply | No |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Standalone deliverable | Single PR | All 5 commits in one PR; review budget well met |

---

## 1. Commit: `feat(admin-create-user): email_confirm + notification email`

### 1.1 TEST (Deno): admin-create-user creates user with email_confirm true (RED)
- **File(s)**: `supabase/functions/admin-create-user/index.test.ts`
- **Action**: write test that mocks `supabaseAdmin.auth.admin.createUser` and asserts: (a) `createUser` is called with `email_confirm: true`, (b) on success the response is `{ success: true, user_id, notification_sent: true | false }`
- **Test command**: `deno test supabase/functions/admin-create-user/index.test.ts`
- **Expected**: red (fails — `email_confirm: false` is still hardcoded)
- **Maps to**: REQ-1, REQ-2

### 1.2 IMPLEMENT (Deno): set email_confirm true + dispatch notification email (GREEN)
- **File(s)**: `supabase/functions/admin-create-user/index.ts`
- **Action**: change `email_confirm: false` → `email_confirm: true` (line ~96). After `createUser` succeeds, call `supabaseAdmin.auth.admin.generateLink({ type: 'magiclink', email })` inside try/catch. Use the generated `action_link` to send a text-only notification email via Mailpit/Inbucket. Return `{ success: true, user_id, notification_sent: true | false }`. Never fail user creation if email dispatch fails.
- **Maps to**: REQ-1, REQ-2

### 1.3 REFACTOR (Deno): extract notification dispatch into helper (REFACTOR)
- **File(s)**: `supabase/functions/admin-create-user/index.ts`
- **Action**: extract the notification email dispatch into a small `sendCreationNotification(email, userId)` helper function inside the file. Keep try/catch around it.
- **Maps to**: REQ-2

---

## 2. Commit: `fix(hooks): parse EF error body via fetch`

### 2.1 TEST (Vitest): useCreateUser parses 409 error body → hook error is message only (RED)
- **File(s)**: `src/features/admin/create-user/hooks/useCreateUser.test.tsx`
- **Action**: mock `global.fetch` to return a 409 with body `{ error: { code: "EMAIL_ALREADY_EXISTS", message: "A user with this email already exists" } }`. Assert hook's `error` state is `"A user with this email already exists"` (message only, no code prefix).
- **Test command**: `npm run test -- useCreateUser --run`
- **Expected**: red (current impl uses `supabase.functions.invoke` which strips body)
- **Maps to**: REQ-1, REQ-2

### 2.2 TEST (Vitest): useCreateUser parses 200 success → userId set, error null (RED)
- **File(s)**: `src/features/admin/create-user/hooks/useCreateUser.test.tsx`
- **Action**: mock `fetch` to return 200 with `{ success: true, user_id: '...' }`. Assert `error` is null and `userId` is set.
- **Test command**: `npm run test -- useCreateUser --run`
- **Expected**: red (current impl uses different call pattern)
- **Maps to**: REQ-1, REQ-2

### 2.3 IMPLEMENT (Vitest): rewrite useCreateUser to use fetch (GREEN)
- **File(s)**: `src/features/admin/create-user/hooks/useCreateUser.ts`
- **Action**: replace `supabase.functions.invoke` with `fetch(\`${VITE_SUPABASE_URL}/functions/v1/admin-create-user\`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: \`Bearer \${token}\`, apikey: anonKey }, body: JSON.stringify({...}) })`. Parse response. On non-2xx, try to extract `data.error.message` and throw it. On 2xx, return data. Keep `useMutation` wrapper unchanged.
- **Maps to**: REQ-1, REQ-2

### 2.4 TEST (Vitest): useCreateInvite parses 409 error body → hook error is message only (RED)
- **File(s)**: `src/features/admin/create-user/hooks/useCreateInvite.test.tsx`
- **Action**: same pattern as T-2.1 but for useCreateInvite. Mock fetch 409 with `{ error: { code: "INVITE_EXISTS", message: "A pending invitation already exists for this email" } }`. Assert `error` is the message only.
- **Test command**: `npm run test -- useCreateInvite --run`
- **Expected**: red
- **Maps to**: REQ-1, REQ-2

### 2.5 TEST (Vitest): useCreateInvite parses 200 success → no error (RED)
- **File(s)**: `src/features/admin/create-user/hooks/useCreateInvite.test.tsx`
- **Action**: mock fetch 200 with `{ success: true, invitation_id: '...' }`. Assert `error` is null.
- **Test command**: `npm run test -- useCreateInvite --run`
- **Expected**: red
- **Maps to**: REQ-1, REQ-2

### 2.6 IMPLEMENT (Vitest): rewrite useCreateInvite to use fetch (GREEN)
- **File(s)**: `src/features/admin/create-user/hooks/useCreateInvite.ts`
- **Action**: same fetch pattern as T-2.3 for `create_invite` endpoint.
- **Maps to**: REQ-1, REQ-2

### 2.7 TEST (Vitest): useRegister parses error body → error is message only (RED)
- **File(s)**: `src/features/auth/hooks/useRegister.test.tsx`
- **Action**: mock fetch 400 with `{ error: { code: "WEAK_PASSWORD", message: "Password must be at least 8 characters" } }`. Assert `error` is message only.
- **Test command**: `npm run test -- useRegister --run`
- **Expected**: red
- **Maps to**: REQ-1, REQ-2

### 2.8 IMPLEMENT (Vitest): rewrite useRegister to use fetch (GREEN)
- **File(s)**: `src/features/auth/hooks/useRegister.ts`
- **Action**: same fetch pattern for `register-user` endpoint. Fixes the `[object Object]` bug from broken error parsing.
- **Maps to**: REQ-1, REQ-2

### 2.9 REFACTOR (Vitest): extract invokeFunction helper (REFACTOR)
- **File(s)**: `src/lib/edge-function.ts` (new file)
- **Action**: create `invokeFunction<T>(name: string, body: unknown, supabase: SupabaseClient): Promise<T>` that wraps the fetch call. Move shared logic (headers, token extraction, error body parsing) into it. Update useCreateUser, useCreateInvite, and useRegister to use it.
- **Maps to**: REQ-1, REQ-2

---

## 3. Commit: `feat(accept-invite): warn when no pending invitation found`

### 3.1 TEST (Deno): accept-invite returns warning when no matching invitation (RED)
- **File(s)**: `supabase/functions/accept-invite/index.test.ts`
- **Action**: mock DB to return zero rows from UPDATE. Assert response is `{ success: true, warning: 'No pending invitation found for this session' }` with 200 status (not an error).
- **Test command**: `deno test supabase/functions/accept-invite/index.test.ts`
- **Expected**: red (current impl returns `{ success: true, marked: false }` silently)
- **Maps to**: REQ-2

### 3.2 IMPLEMENT (Deno): add warning field to accept-invite response (GREEN)
- **File(s)**: `supabase/functions/accept-invite/index.ts`
- **Action**: in the no-invitation branch (around line 70), return `{ success: true, marked: false, warning: 'No pending invitation found for this session' }` instead of `{ success: true, marked: false }`. Also update the success path to return `invitation_id` (not just `marked: true`).
- **Maps to**: REQ-1, REQ-2

### 3.3 TEST (Vitest): AcceptInvitePage renders warning as non-blocking notice (RED)
- **File(s)**: `src/features/auth/pages/AcceptInvitePage.test.tsx`
- **Action**: mock `useAcceptInvite` hook to return `{ warning: 'No pending invitation found for this session' }`. Assert a yellow/info notice bar is rendered, visually distinct from both the success message and the error state.
- **Test command**: `npm run test -- AcceptInvitePage --run`
- **Expected**: red (AcceptInvitePage currently doesn't handle warning)
- **Maps to**: REQ-2

### 3.4 IMPLEMENT (Vitest): AcceptInvitePage renders warning notice (GREEN)
- **File(s)**: `src/features/auth/pages/AcceptInvitePage.tsx`
- **Action**: when `useAcceptInvite` returns a `warning` field, render a non-blocking info/yellow notice bar above the success message. Keep it visually distinct from error (red) and success (green).
- **Maps to**: REQ-2

---

## 4. Commit: `feat(create_invite): hard-fail on missing APP_URL`

### 4.1 TEST (Deno): create_invite returns 500 MISSING_APP_URL before calling inviteUserByEmail (RED)
- **File(s)**: `supabase/functions/create_invite/index.test.ts`
- **Action**: unset `APP_URL` env var (use `Deno.env.delete('APP_URL')`). Assert EF returns `500` with `{ error: { code: 'MISSING_APP_URL', message: 'APP_URL environment variable is required' } }`. Mock `inviteUserByEmail` and assert it was **never** called.
- **Test command**: `deno test supabase/functions/create_invite/index.test.ts`
- **Expected**: red (current impl uses `?? 'http://localhost:5173'` fallback)
- **Maps to**: REQ-2

### 4.2 IMPLEMENT (Deno): drop APP_URL fallback, fail fast (GREEN)
- **File(s)**: `supabase/functions/create_invite/index.ts`
- **Action**: at line ~101, replace `const appUrl = Deno.env.get('APP_URL') ?? 'http://localhost:5173'` with `const appUrl = Deno.env.get('APP_URL')`. Immediately after, add `if (!appUrl) return errorResponse('MISSING_APP_URL', 'APP_URL environment variable is required', 500)`. Ensure this check comes BEFORE `inviteUserByEmail` is called.
- **Maps to**: REQ-1, REQ-2

### 4.3 UPDATE ENV (Deno): add APP_URL to .env (GREEN)
- **File(s)**: `supabase/functions/.env`
- **Action**: add `APP_URL=http://127.0.0.1:5173` to `.env` (do not commit secrets to repo — this is a local dev convenience file that is gitignored).
- **Maps to**: REQ-1

---

## 5. Commit: `docs(supabase/functions): local dev workflow README`

### 5.1 WRITE DOCS: create supabase/functions/README.md (GREEN)
- **File(s)**: `supabase/functions/README.md` (new file)
- **Action**: create a scannable, ≤300-word README with sections: (1) What this directory is (Edge Functions / Deno / built-in Edge Runtime), (2) Built-in Edge Runtime — `supabase start` serves all functions automatically, no separate `serve` needed for normal dev, (3) Manual `supabase functions serve <name> --env-file supabase/functions/.env` for hot-reload debugging, (4) `supabase functions invoke <name>` to call locally, (5) Inspect captured emails at Inbucket `http://127.0.0.1:54324`, (6) `APP_URL` required for `create_invite` invite links — set via `supabase secrets set APP_URL=http://127.0.0.1:5173` in production, present in `.env` for manual serve, (7) Common gotchas: `email_sent` rate limit, redirect URL mismatches, `@ts-nocheck` on all EFs.
- **Maps to**: REQ-1

---