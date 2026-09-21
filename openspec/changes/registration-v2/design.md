# Design: registration-v2

## Technical Approach

Re-implement two admin registration flows using Supabase Edge Functions with admin-enforced auth. Both flows require an admin Bearer token; the frontend hooks extract it from `supabase.auth.getSession()`. Supabase handles all email delivery — no custom email logic.

## Architecture Decisions

| Decision | Choice | Alternatives | Rationale |
|----------|--------|--------------|-----------|
| `email_confirm: false` for `admin-create-user` | Supabase sends "Confirm signup" email | `email_confirm: true` skips email | Admin sets password but email verification confirms identity before login |
| `inviteUserByEmail` for `create_invite` | Supabase sends "You have been invited" with link | Custom email with UUID token | Supabase owns email delivery, bounce handling, and rate limits — external email adds complexity |
| `getEdgeFunctionErrorMessage` for error parsing | Shared helper in `src/lib/edge-function-error.ts` | Inline error handling per hook | EF responses use `{ error: { code, message } }` shape; helper normalizes both `error: string` and `error: { message }` |
| Bearer token required for both EFs | Admin JWT validated server-side via `getUser()` | Service role key only | EFs need to identify the calling admin for audit (`invited_by` in `invitations` table) and role check |
| Session on invite link via hash | Supabase sets `#session=<token>` on redirect URL | Query param `?token=<uuid>` | Hash fragments are not sent to the server — avoids leaking session tokens in server logs |

## Data Flow

### Use Case 1 — Admin Create User

```
Admin → CreateUserPage
  │ { email, password }
  ▼
useCreateUser (hook)
  │ getSession() → Bearer<token>
  ▼
admin-create-user EF
  │  Authorization: Bearer <token>
  │  { email, password }
  ▼
supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: false })
  │
  ▼
Supabase Auth → "Confirm signup" email
  │
  ▼
User clicks link → sets password → login
```

### Use Case 2 — Admin Send Invitation

```
Admin → CreateUserPage
  │  { email }
  ▼
useCreateInvite (hook)
  │  getSession() → Bearer <token>
  ▼
create_invite EF
  │  Authorization: Bearer <token>
  │  { email }
  ▼
supabaseAdmin.auth.admin.inviteUserByEmail(email, { redirectTo: '{APP_URL}/accept-invite' })
  │
  ▼
Supabase → "You have been invited" email with link → /accept-invite#session=<token>
  │
  ▼
User lands on /accept-invite
  │  onAuthStateChange(BEARER_TOKEN_CHANGED) detects session
  │  User sets password client-side
  ▼
accept-invite EF (marks invitation as accepted)
  │  Authorization: Bearer <token> (from session)
  ▼
User logged in
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `supabase/functions/admin-create-user/index.ts` | Modify | Add `email_confirm: false`; already implemented |
| `supabase/functions/create_invite/index.ts` | Modify | Already uses `inviteUserByEmail`; already implemented |
| `supabase/functions/accept-invite/index.ts` | Modify | Already reads session from hash via `onAuthStateChange`; already implemented |
| `src/features/admin/create-user/hooks/useCreateUser.ts` | Modify | Already calls `admin-create-user`; already implemented |
| `src/features/admin/create-user/hooks/useCreateInvite.ts` | Modify | Already calls `create_invite`; already implemented |
| `src/lib/edge-function-error.ts` | Modify | Already exists; already used by both hooks |
| `src/features/admin/create-user/create-user.types.ts` | Modify | Already has `CreateUserInput`, `CreateInviteInput`, `CreateUserResult`, `InviteResult` |

No new files required. All components already exist and are wired correctly.

## Interfaces / Contracts

### Edge Function: `admin-create-user`

**Request:**
```
POST /admin-create-user
Authorization: Bearer <admin-token>
Content-Type: application/json

{ "email": string, "password": string }
```

**Response (200):**
```json
{ "success": true, "user_id": "uuid" }
```

**Error responses:**
```json
{ "error": { "code": "UNAUTHORIZED", "message": "..." } }  // 401
{ "error": { "code": "FORBIDDEN", "message": "..." } }     // 403
{ "error": { "code": "EMAIL_ALREADY_EXISTS", "message": "..." } } // 409
{ "error": { "code": "WEAK_PASSWORD", "message": "..." } } // 400
```

### Edge Function: `create_invite`

**Request:**
```
POST /create_invite
Authorization: Bearer <admin-token>
Content-Type: application/json

{ "email": string }
```

**Response (200):**
```json
{ "success": true, "expires_at": "ISO8601", "user_id": "uuid" }
```

**Error responses:**
```json
{ "error": { "code": "INVITE_EXISTS", "message": "..." } } // 400
{ "error": { "code": "EMAIL_ALREADY_EXISTS", "message": "..." } } // 409
```

### Frontend Hooks

```typescript
// useCreateUser
{ createUser: (input: CreateUserInput) => Promise<CreateUserResult>,
 isLoading: boolean, isSuccess: boolean, isError: boolean,
  error: string | null, userId: string | null }

// useCreateInvite
{ createInvite: (input: CreateInviteInput) => Promise<InviteResult>,
  isLoading: boolean, isSuccess: boolean, isError: boolean,
  error: string | null, expiresAt: string | null }
```

## Error Handling Strategy

Both hooks follow the same pattern:

1. `error` from `supabase.functions.invoke()` → throw with `error.message`
2. `getEdgeFunctionErrorMessage(data)` → non-null → throw with parsed message
3. Otherwise return `data` as success

This handles three error shapes Supabase EFs can return:
- `{ error: "string message" }` — direct string (rare)
- `{ error: { code, message } }` — structured error (standard)
- Network-level errors caught by `invoke()` itself

## Open Questions

None — all five design decisions are resolved by existing implementation.
