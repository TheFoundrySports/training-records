# Design: user-registration

## 1. Database Migrations

### 1.1 app_settings table

```sql
CREATE TYPE registration_mode AS ENUM ('open', 'invite_only');

CREATE TABLE app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_mode registration_mode NOT NULL DEFAULT 'open',
  invite_expiry_hours integer NOT NULL DEFAULT 48,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Seed with default open mode
INSERT INTO app_settings (id, registration_mode) VALUES (gen_random_uuid(), 'open');

CREATE TRIGGER update_app_settings_updated_at
  BEFORE UPDATE ON app_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

**RLS Policies:**
- `app_settings`: `auth.uid()` is not null — SELECT for all authenticated; INSERT/UPDATE for admin only

### 1.2 invitations table

```sql
CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'revoked');

CREATE TABLE invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  status invitation_status NOT NULL DEFAULT 'pending',
  invited_by uuid NOT NULL REFERENCES auth.users(id),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  used_at timestamptz
);

CREATE INDEX idx_invitations_token ON invitations(token);
CREATE INDEX idx_invitations_email ON invitations(email);
CREATE INDEX idx_invitations_status ON invitations(status);
```

**RLS Policies:**
- `invitations`: Admin (role=admin) has full access; `auth.uid()` can SELECT by token for validation (no auth required for public validation via function)

---

## 2. Edge Functions

### 2.1 register-user

**Auth**: None (public) — validates mode server-side

**Request body**:
```typescript
{
  email: string;
  password: string;
  token?: string; // optional, for invite-gated flow
}
```

**Logic**:
1. Fetch `app_settings` row
2. If `registration_mode = invite_only` AND no valid token → return 400 "Registration by invitation only"
3. If token provided → validate exists, status=pending, not expired → mark as accepted
4. Call `supabaseAdmin.auth.admin.createUser({ email, password, user_metadata: { role: 'athlete' } })`
5. Return user ID

**Response**: `{ user_id: string }` or `{ error: string }`

### 2.2 create-invite

**Auth**: Admin only (role=admin from JWT)

**Request body**:
```typescript
{
  email: string;
}
```

**Logic**:
1. Validate caller has role=admin
2. Check if invitation already pending for email → reject
3. Create `invitations` record: email, token (UUID v4), status=pending, invited_by=caller, expires_at=now()+invite_expiry_hours
4. Send email via SMTP with link `https://app.example.com/accept-invite?token=<uuid>`
5. Return `{ invite_url: string, expires_at: string }`

**Response**: `{ invite_url: string, expires_at: string }`

### 2.3 accept-invite

**Auth**: None (public)

**Request body**:
```typescript
{
  token: string;
  password: string;
}
```

**Logic**:
1. Fetch invitation by token
2. Validate: exists, status=pending, not expired → return 400
3. Call `supabaseAdmin.auth.admin.createUser({ email, password, user_metadata: { role: 'athlete' } })`
4. Update invitation: status=accepted, used_at=now()
5. Return `{ user_id: string }`

**Response**: `{ user_id: string }` or `{ error: string }`

### 2.4 revoke-user

**Auth**: Admin only

**Request body**:
```typescript
{
  user_id: string;
}
```

**Logic**:
1. Validate caller has role=admin
2. Call `supabaseAdmin.auth.admin.updateUserById(user_id, { user_metadata: { banned: true, banned_at: now() } })`
3. Return `{ success: true }`

**Response**: `{ success: true }` or `{ error: string }`

### 2.5 registration-settings

**Auth**: Admin only

**GET**: Returns current `app_settings` row

**POST** (body: `{ registration_mode?: 'open' | 'invite_only', invite_expiry_hours?: number }`):
Updates `app_settings` row. Only admin can write.

---

## 3. Frontend Components

### 3.1 RegisterPage — `src/features/auth/pages/RegisterPage.tsx`

**Purpose**: Public registration page, mode-aware

**Behavior**:
- On mount: parse `?token=` from URL
- If token present: validate via `GET /accept-invite/validate?token=<uuid>` (or inline validation)
- If mode=invite_only AND no valid token: show "by invitation only" message
- Form fields: email, password, passwordConfirmation
- On submit: call `register-user` Edge Function with `{ email, password, token? }`
- Uses React Hook Form + Zod

**Zod schema**:
```typescript
z.object({
  email: z.string().email(),
  password: z.string().min(8),
  passwordConfirmation: z.string(),
}).refine(data => data.password === data.passwordConfirmation, {
  message: "Passwords do not match",
  path: ["passwordConfirmation"],
})
```

### 3.2 AcceptInvitePage — `src/features/auth/pages/AcceptInvitePage.tsx`

**Purpose**: Public set-password page for invite acceptance

**Behavior**:
- On mount: validate token via Edge Function call
- If invalid: show error state with admin contact link
- If valid: show set-password form (password, passwordConfirmation)
- On submit: call `accept-invite` Edge Function
- On success: redirect to `/login?registered=true`

### 3.3 CreateUserPage — `src/features/admin/create-user/pages/CreateUserPage.tsx`

**Purpose**: Admin creates users directly or via invite

**Behavior**:
- Toggle between "Create with password" and "Send invite"
- Email field
- On "Create": call `register-user` with `mode: "temp_password"` → show generated password
- On "Send invite": call `create-invite` → show success
- Admin-only; redirect non-admins

### 3.4 RegistrationSettingsPage — `src/features/admin/registration-settings/pages/RegistrationSettingsPage.tsx`

**Purpose**: Admin toggles registration mode and manages invitations

**Behavior**:
- Toggle: open / invite-only
- Invitation table: columns as per admin-registration-settings spec
- Row actions: Resend (if pending + not expired), Revoke (if pending)
- Ban user action: available on user rows in UserManagementPage (not here)

### 3.5 Hooks

| Hook | Function | Auth |
|------|----------|------|
| `useRegister` | POST `/register-user` | none |
| `useAcceptInvite` | POST `/accept-invite` | none |
| `useCreateUser` | POST `/create-invite` | admin |
| `useRegistrationSettings` | GET/POST `/registration-settings` | admin |
| `useInvitations` | GET `/invitations-list` | admin |
| `useRevokeUser` | POST `/revoke-user` | admin |

---

## 4. Router Changes — `src/app/router.tsx`

Add public routes OUTSIDE ProtectedRoute:

```typescript
// Public routes — no auth required
{
  path: '/register',
  element: <RegisterPage />,
},
{
  path: '/accept-invite',
  element: <AcceptInvitePage />,
},
```

Add admin routes INSIDE AdminShell layout:

```typescript
{
  path: '/admin/create-user',
  element: <AdminShell><CreateUserPage /></AdminShell>,
},
{
  path: '/admin/registration-settings',
  element: <AdminShell><RegistrationSettingsPage /></AdminShell>,
},
```

---

## 5. AdminShell Navigation — `src/features/admin/admin-shell/AdminShell.tsx`

Add to sidebar nav (under Admin section — 6 items total):

```tsx
{
  label: 'Create User',
  href: '/admin/create-user',
  icon: <UserPlusIcon />,
},
{
  label: 'Registration Settings',
  href: '/admin/registration-settings',
  icon: <SettingsIcon />,
},
```

---

## 6. SMTP Configuration

### Local Development (`supabase/config.toml`)

Inbucket is already available on port 54324. No SMTP configuration needed for local dev — invitation emails will be captured by Inbucket.

For local testing of actual email sending, add:

```toml
[auth.email]
enable_signup = true
double_confirm_changes = true
enable_confirmations = false

[auth.email.smtp]
host = "localhost"
port = 54324
```

### Production

Required environment variables:
```
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=notifications@foundrytraining.com
SMTP_PASSWORD=your-smtp-password
SMTP_ADMIN_EMAIL=admin@foundrytraining.com
```

---

## 7. Auth Flow Sequence

### Open Registration
```
Visitor → GET /register → RegisterPage
  → POST /register-user { email, password }
    → Edge Function: validates mode=open
    → supabaseAdmin.auth.admin.createUser()
    → handle_new_user trigger fires
    → Returns { user_id }
  → Redirect /login?registered=true
```

### Invite-Only Registration
```
Admin → POST /create-invite { email }
  → Edge Function: creates invitations record + SMTP email
  → Returns { invite_url }

Visitor → Email link: GET /accept-invite?token=<uuid>
  → AcceptInvitePage validates token on mount
  → POST /accept-invite { token, password }
    → Edge Function: validates token, creates user, marks accepted
    → Returns { user_id }
  → Redirect /login?registered=true
```

---

## 8. Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Token storage | UUID v4 in `invitations` table | Single-use, unguessable, no collision |
| Expiry | 48h default, configurable via `invite_expiry_hours` | Reasonable window for invite email |
| Role enforcement | Edge Functions set `role=athlete` always | Admin cannot create other roles |
| Ban strategy | `user_metadata.banned = true` instead of delete | Preserves audit trail and related data |
| Mode check | Server-side in Edge Functions | Client cannot bypass invite-only mode |
| Token validation | Edge Function validates, not RLS | Cleaner public access pattern |