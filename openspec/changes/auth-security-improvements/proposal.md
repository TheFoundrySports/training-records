# Auth Security Improvements

Enable email verification, self-service password reset, and stronger password requirements.

## Context

Currently, `enable_confirmations = false` and no SMTP is configured. Password validation is 8 characters only with no complexity rules. The system needs:

- Email verification (user-requested flow via external API)
- Self-service password reset (forgot → email link → set password)
- Strong password enforcement (8+ chars, uppercase, number, symbol)
- Visual password strength meter

**User decisions:**

- Use external email API (Resend) instead of built-in SMTP
- Self-service password reset (not admin-initiated)
- Strong password policy
- Password meter UI

## Quick Path

1. Add `RESEND_API_KEY` env var
2. Create `supabase/functions/send-email` edge function using Resend API
3. Update `supabase/config.toml` with password requirements
4. Create `reset-password` edge function + `/forgot-password`, `/reset-password` routes
5. Add password strength validation to RegisterPage + AcceptInvitePage
6. Add `PasswordStrengthMeter` component

## Affected Areas

| Area                                    | Changes                                                                                       |
| --------------------------------------- | --------------------------------------------------------------------------------------------- |
| `supabase/config.toml`                  | `password_requirements = "lower_upper_letters_digits_symbols"`, `minimum_password_length = 8` |
| `supabase/functions/register-user/`     | `email_confirm: false`, add strength validation                                               |
| `supabase/functions/accept-invite/`     | Add strength validation                                                                       |
| `supabase/functions/admin-create-user/` | Add strength validation                                                                       |
| `src/features/auth/`                    | New pages, hooks, components                                                                  |
| `src/app/router.tsx`                    | Add `/forgot-password`, `/reset-password` routes                                              |

## Email Verification Strategy

### Decision: External API (Resend)

| Provider     | Pros                                               | Cons                                     |
| ------------ | -------------------------------------------------- | ---------------------------------------- |
| **Resend** ✓ | Simple API, React Email templates, $3/mo free tier | External dependency                      |
| SendGrid     | Reliable, feature-rich                             | Complex setup, more expensive            |
| Custom SMTP  | Full control                                       | No SMTP configured; requires mail server |

**Resend is recommended** for simplicity and cost.

### Flow: Self-Service Password Reset

```
User clicks "Forgot password"
    ↓
POST /functions/v1/request-password-reset { email }
    ↓
Edge function validates email exists
    ↓
Edge function calls Resend API → sends email with magic link
    ↓
User clicks link → /reset-password?token=xxx
    ↓
POST /functions/v1/reset-password { token, new_password }
    ↓
Edge function validates token, updates password
    ↓
User redirected to /login
```

### Email Template

```
Subject: Reset your password

Hi,

Click the link below to reset your password:
{reset_link}

This link expires in 1 hour.

If you didn't request this, ignore this email.
```

## Edge Functions

### 1. `request-password-reset` (new)

**Purpose:** Validate email, send reset link via Resend.

```typescript
// Input
{ email: string }

// Output (always 200 to prevent email enumeration)
{ success: true } | { error: { code, message } }

// Flow
1. Check if user exists (supabaseAdmin.auth.admin.listUsers)
2. If not exists → return { success: true } (no-op for security)
3. Generate reset link via supabaseAdmin.auth.admin.generateLink({ type: 'magiclink' })
4. Send email via Resend API
5. Return { success: true }
```

### 2. `reset-password` (new)

**Purpose:** Validate token, update password.

```typescript
// Input
{ token: string, new_password: string }

// Flow
1. Validate password strength (same rules as registration)
2. Verify token via supabaseAdmin.auth.admin.getUserByLink(token)
3. Update password via supabaseAdmin.auth.admin.updateUserById(id, { password })
4. Return { success: true }
```

### 3. `send-email` (new, helper)

**Purpose:** Abstract Resend API calls for consistency.

```typescript
interface EmailOptions {
  to: string
  subject: string
  html: string
}

async function sendEmail(options: EmailOptions): Promise<void>
```

## Frontend Changes

### New Routes

| Route              | Component            | Purpose                      |
| ------------------ | -------------------- | ---------------------------- |
| `/forgot-password` | `ForgotPasswordPage` | Email input → request reset  |
| `/reset-password`  | `ResetPasswordPage`  | New password form with token |

### `ForgotPasswordPage`

```
┌─────────────────────────────────┐
│         Forgot Password         │
│                                 │
│ Enter your email and we'll     │
│ send you a link to reset       │
│ your password.                 │
│                                 │
│ [ email input              ]   │
│                                 │
│ [ Send Reset Link           ]  │
│                                 │
│ Remember your password?        │
│ [Back to login]                │
└─────────────────────────────────┘
```

### `ResetPasswordPage`

```
┌─────────────────────────────────┐
│         Set New Password        │
│                                 │
│ [ password input           ]   │
│ [ ████████░░ Strong        ]   │
│                                 │
│ [ confirm password input   ]   │
│                                 │
│ [ Reset Password           ]  │
│                                 │
│ Password must include:          │
│ ✓ 8+ characters                 │
│ ✓ Uppercase letter              │
│ ✓ Number                        │
│ ✓ Symbol                        │
└─────────────────────────────────┘
```

### Password Strength Validation

**Backend (Edge Functions):**

```typescript
const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\d!@#$%^&*(),.?":{}|<>]{8,}$/

function validatePassword(password: string): { valid: boolean; message?: string } {
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters' }
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain an uppercase letter' }
  }
  if (!/\d/.test(password)) {
    return { valid: false, message: 'Password must contain a number' }
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return { valid: false, message: 'Password must contain a symbol' }
  }
  return { valid: true }
}
```

**Frontend (Zod schema):**

```typescript
const strongPasswordSchema = z
  .string()
  .min(8, 'Must be at least 8 characters')
  .regex(/[A-Z]/, 'Must contain an uppercase letter')
  .regex(/\d/, 'Must contain a number')
  .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Must contain a symbol')

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: strongPasswordSchema,
  passwordConfirmation: z.string(),
}).refine(...)
```

### PasswordStrengthMeter Component

```tsx
interface PasswordStrengthMeterProps {
  password: string
}

function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  const strength = calculateStrength(password) // 0-4
  const label = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'][strength]
  const color = ['red', 'orange', 'yellow', 'lime', 'green'][strength]

  return (
    <div className="space-y-1">
      <div className="h-2 w-full rounded-full bg-muted">
        <div
          className={`h-2 rounded-full bg-${color}-500 transition-all`}
          style={{ width: `${(strength + 1) * 20}%` }}
        />
      </div>
      <p className={`text-xs text-${color}-600`}>{label}</p>
    </div>
  )
}

function calculateStrength(password: string): number {
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password)) score++
  if (/\d/.test(password)) score++
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++
  return Math.min(4, score - 1)
}
```

## Supabase Config Changes

```toml
[auth]
minimum_password_length = 8
password_requirements = "lower_upper_letters_digits_symbols"

[auth.email]
enable_confirmations = false  # We handle verification via external flow
```

## Environment Variables

| Variable         | Description                                         |
| ---------------- | --------------------------------------------------- |
| `RESEND_API_KEY` | Resend API key for sending emails                   |
| `APP_URL`        | Frontend URL (e.g., `https://training.example.com`) |

## Error Handling

All edge functions return consistent format:

```typescript
{ error: { code: string, message: string } }
```

| Code             | HTTP | Scenario                           |
| ---------------- | ---- | ---------------------------------- |
| `BAD_REQUEST`    | 400  | Missing/invalid parameters         |
| `INVALID_TOKEN`  | 400  | Expired or used reset token        |
| `WEAK_PASSWORD`  | 400  | Password doesn't meet requirements |
| `USER_NOT_FOUND` | 404  | Email not registered               |
| `INTERNAL_ERROR` | 500  | Database or email API failure      |

## Security Considerations

1. **Email enumeration prevention:** Always return success for valid/invalid emails
2. **Rate limiting:** Resend handles this; add Edge Function rate limits if needed
3. **Token expiry:** Supabase magic links expire in 1 hour (OTP expiry setting)
4. **Password storage:** Supabase handles hashing with bcrypt/scrypt
5. **HTTPS only:** Ensure `site_url` uses HTTPS in production

## Out of Scope

- MFA (TOTP)
- OAuth providers
- User role expansion
- Password expiration policies
- Account lockout after failed attempts

## Implementation Order

1. Add `RESEND_API_KEY` to `.env.local`
2. Create `supabase/functions/send-email/index.ts`
3. Create `supabase/functions/request-password-reset/index.ts`
4. Create `supabase/functions/reset-password/index.ts`
5. Update `supabase/config.toml` with password requirements
6. Update `register-user`, `accept-invite`, `admin-create-user` with strength validation
7. Add `PasswordStrengthMeter` component
8. Add `useForgotPassword`, `useResetPassword` hooks
9. Create `ForgotPasswordPage` and `ResetPasswordPage`
10. Update `router.tsx` with new routes
11. Update `LoginPage` with "Forgot password?" link
12. Update `RegisterPage` with password strength meter

## Rollback Plan

- Revert `supabase/config.toml` to previous password settings
- Delete new edge functions
- Remove new routes and components
- No database migrations needed (password stored by Supabase Auth)

## Success Criteria

- [ ] User can request password reset and receive email (with Resend API)
- [ ] User can set new password via reset link
- [ ] Password strength meter shows real-time feedback
- [ ] Weak passwords rejected at frontend and backend
- [ ] All edge functions return consistent error format
- [ ] Login page has "Forgot password?" link
- [ ] No regressions in existing registration/invite flows
