---
name: edge-functions
description: Password reset edge functions using Resend API
change: auth-security-improvements
status: draft
---

# Delta for Edge Functions

> **Domain**: `edge-functions`  
> **Change**: `auth-security-improvements`

---

## Purpose

Create Edge Functions for password reset flow using Resend API for email delivery. All functions return consistent error format `{ error: { code, message } }`.

---

## Environment Variables

| Variable         | Description                                         |
| ---------------- | --------------------------------------------------- |
| `RESEND_API_KEY` | Resend API key for sending emails                   |
| `APP_URL`        | Frontend URL (e.g., `https://training.example.com`) |

---

## ADDED Requirements

### REQ-EF1: Send Email Helper Function

The system MUST provide a `send-email` Edge Function that abstracts Resend API calls for consistency.

#### Interface

```typescript
interface EmailOptions {
  to: string
  subject: string
  html: string
}

async function sendEmail(options: EmailOptions): Promise<void>
```

#### Scenario: Send password reset email

- GIVEN valid email options with recipient address, subject, and HTML body
- WHEN the function is invoked with those options
- THEN it MUST send the email via Resend API
- AND return success status

#### Scenario: Resend API failure

- GIVEN valid email options
- WHEN Resend API returns an error
- THEN the function MUST throw an error with code `INTERNAL_ERROR`
- AND include the API error message

---

### REQ-EF2: Request Password Reset Function

The system MUST provide a `request-password-reset` Edge Function that validates email and sends reset link.

#### Input Schema

```typescript
interface RequestPasswordResetInput {
  email: string
}
```

#### Output Schema

```typescript
// Always returns 200 to prevent email enumeration
{ success: true } | { error: { code: string, message: string } }
```

#### Flow

1. Validate email is provided and well-formed
2. Check if user exists via `supabaseAdmin.auth.admin.listUsers()`
3. If user not found → return `{ success: true }` (fail-safe for security)
4. Generate reset link via `supabaseAdmin.auth.admin.generateLink({ type: 'magiclink', email })`
5. Send email via `send-email` function with reset link
6. Return `{ success: true }`

#### Scenario: Valid email request

- GIVEN a valid email address that matches an existing user
- WHEN the function is invoked with that email
- THEN it MUST check if the user exists
- AND generate a magic link
- AND send the password reset email via Resend
- AND return `{ success: true }`

#### Scenario: Non-existent email request

- GIVEN an email address that does not match any user
- WHEN the function is invoked with that email
- THEN it MUST return `{ success: true }` without sending any email
- AND NOT reveal whether the email exists

#### Scenario: Invalid email format

- GIVEN an invalid email format
- WHEN the function is invoked
- THEN it MUST return `{ error: { code: 'BAD_REQUEST', message: 'Invalid email address' } }`

---

### REQ-EF3: Reset Password Function

The system MUST provide a `reset-password` Edge Function that validates token and updates password.

#### Input Schema

```typescript
interface ResetPasswordInput {
  token: string
  new_password: string
}
```

#### Flow

1. Validate password strength (8+ chars, uppercase, number, symbol)
2. Verify token via `supabaseAdmin.auth.admin.getUserByLink(token)`
3. If token invalid or expired → return error
4. Extract user ID from verified link
5. Update password via `supabaseAdmin.auth.admin.updateUserById(id, { password })`
6. Return `{ success: true }`

#### Scenario: Valid token with strong password

- GIVEN a valid, unexpired reset token
- AND a password meeting all requirements (8+ chars, uppercase, number, symbol)
- WHEN the function is invoked
- THEN it MUST verify the token
- AND update the user's password
- AND return `{ success: true }`

#### Scenario: Invalid or expired token

- GIVEN an invalid or expired token
- WHEN the function is invoked
- THEN it MUST return `{ error: { code: 'INVALID_TOKEN', message: 'Reset link is invalid or has expired' } }`

#### Scenario: Weak password

- GIVEN a valid token
- AND a password that does not meet requirements
- WHEN the function is invoked
- THEN it MUST return `{ error: { code: 'WEAK_PASSWORD', message: 'Password must be at least 8 characters and contain uppercase, number, and symbol' } }`

---

## Password Strength Validation

### REQ-EF4: Strong Password Regex

The system MUST validate passwords using the following regex pattern:

```typescript
const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\d!@#$%^&*(),.?":{}|<>]{8,}$/
```

#### Requirements

- Minimum 8 characters
- At least one lowercase letter
- At least one uppercase letter
- At least one digit
- At least one symbol from: `!@#$%^&*(),.?":{}|<>`

---

## Error Codes

| Code             | HTTP | Scenario                                                                 |
| ---------------- | ---- | ------------------------------------------------------------------------ |
| `BAD_REQUEST`    | 400  | Missing/invalid parameters                                               |
| `INVALID_TOKEN`  | 400  | Expired or used reset token                                              |
| `WEAK_PASSWORD`  | 400  | Password doesn't meet requirements                                       |
| `USER_NOT_FOUND` | 404  | Email not registered (not returned to client for enumeration prevention) |
| `INTERNAL_ERROR` | 500  | Database or email API failure                                            |

---

## Files to Create

| File                                                 | Purpose                                       |
| ---------------------------------------------------- | --------------------------------------------- |
| `supabase/functions/send-email/index.ts`             | Resend API email helper                       |
| `supabase/functions/request-password-reset/index.ts` | Request password reset flow                   |
| `supabase/functions/reset-password/index.ts`         | Complete password reset with token validation |

---

## Dependencies

- Uses `invokeFunction` helper from `src/lib/edge-function.ts`
- Consistent error format `{ code, message }`
- Fail-fast validation patterns
