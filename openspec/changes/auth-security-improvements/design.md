# SDD Design: Auth Security Improvements

> **Change**: auth-security-improvements  
> **Status**: Approved for Implementation  
> **Author**: SDD Executor  
> **Date**: 2024

---

## 1. Executive Summary

This design implements three interconnected security improvements:

1. **Email Service Integration** — Add Resend-based email sending capability via shared Edge Function
2. **Password Strength Enforcement** — Enforce 8+ char with uppercase, number, and symbol
3. **Self-Service Password Reset** — Complete forgot → email → reset flow

**Key architectural decision**: Centralize password validation logic in a shared TypeScript module consumed by both frontend (Zod) and backend (Edge Functions).

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              Frontend                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │
│  │ RegisterPage │  │AcceptInvitePg│  │ResetPasswordPg│                 │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘                  │
│         │                 │                 │                            │
│  ┌──────▼─────────────────▼─────────────────▼───────┐                 │
│  │           PasswordStrengthMeter Component           │                 │
│  └──────────────────────┬──────────────────────────────┘                 │
│                         │                                                │
│  ┌─────────────────────▼──────────────────────────────────┐              │
│  │   src/features/auth/lib/password-validation.ts          │              │
│  │   • validateStrongPassword() → ValidationResult         │              │
│  │   • calculatePasswordStrength() → 0-4 score             │              │
│  └──────────────────────┬─────────────────────────────────┘              │
│                         │                                                │
│  ┌──────────────────────▼─────────────────────────────────┐              │
│  │                  React Query Hooks                     │              │
│  │  • useForgotPassword  • useResetPassword               │              │
│  │  • useRegister (update)  • useAcceptInvite (update)    │              │
│  └──────────────────────┬─────────────────────────────────┘              │
└─────────────────────────┼─────────────────────────────────────────────────┘
                          │ invokeFunction()
┌─────────────────────────▼─────────────────────────────────────────────────┐
│                         Supabase Edge Functions                            │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │ send-email (helper)                                                  │  │
│  │   └─► Resend API                                                     │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│  ┌────────────────────┐  ┌────────────────────┐  ┌─────────────────┐  │
│  │request-password-  │  │   reset-password    │  │  register-user   │  │
│  │    reset           │  │                     │  │   (update)       │  │
│  └─────────┬──────────┘  └─────────┬──────────┘  └────────┬────────┘  │
│            │                        │                        │             │
│            └────────────────────────┴────────────────────────┘             │
│                                    │                                      │
│                              Supabase Auth                                │
│                         (password hashing, tokens)                        │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Password Validation Strategy

### 3.1 Shared Validation Module

**File**: `src/features/auth/lib/password-validation.ts`

```typescript
// Single source of truth for password rules
// Used by: frontend Zod schemas, React hooks, Edge Functions

export interface ValidationResult {
  valid: boolean
  message?: string
}

// Password regex mirrors backend validation
// Requires: 8+ chars, uppercase, number, symbol
export const STRONG_PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\d!@#$%^&*(),.?":{}|<>]{8,}$/

/**
 * Validate password meets strong requirements.
 * Used by: useResetPassword, useRegister, useAcceptInvite
 */
export function validateStrongPassword(password: string): ValidationResult {
  if (!password) {
    return { valid: false, message: 'Password is required' }
  }

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
    return { valid: false, message: 'Password must contain a symbol (!@#$%^&*(),.?"{}|<>)' }
  }

  return { valid: true }
}

/**
 * Calculate password strength score (0-4).
 * Used by: PasswordStrengthMeter component
 */
export function calculatePasswordStrength(password: string): number {
  if (password.length < 8) return 0
  if (!STRONG_PASSWORD_REGEX.test(password)) return 1

  const hasUppercase = /[A-Z]/.test(password)
  const hasNumber = /\d/.test(password)
  const hasSymbol = /[!@#$%^&*(),.?":{}|<>]/.test(password)

  const criteriaCount = [hasUppercase, hasNumber, hasSymbol].filter(Boolean).length

  if (criteriaCount === 1) return 2 // Fair
  if (criteriaCount === 2) return 3 // Good
  return 4 // Strong
}
```

### 3.2 Frontend Integration (Zod)

**Updated pages**: `RegisterPage`, `AcceptInvitePage`, `ResetPasswordPage`

```typescript
// Zod schema uses same rules as shared validation module
const registerSchema = z
  .object({
    email: z.string().email('Invalid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain an uppercase letter')
      .regex(/\d/, 'Must contain a number')
      .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Must contain a symbol'),
    passwordConfirmation: z.string(),
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    message: 'Passwords do not match',
    path: ['passwordConfirmation'],
  })
```

### 3.3 Backend Integration (Edge Functions)

**Pattern**: Edge Functions import the regex constant from a shared location or duplicate the constant (Deno modules are isolated). Backend must validate same rules for defense-in-depth.

```typescript
// In register-user, accept-invite, reset-password edge functions
const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\d!@#$%^&*(),.?":{}|<>]{8,}$/

function validatePassword(password: string): { valid: boolean; message?: string } {
  if (!PASSWORD_REGEX.test(password)) {
    return {
      valid: false,
      message: 'Password must be at least 8 characters and contain uppercase, number, and symbol',
    }
  }
  return { valid: true }
}
```

---

## 4. Email Service Architecture

### 4.1 send-email Helper Edge Function

**File**: `supabase/functions/send-email/index.ts`

**Purpose**: Abstract Resend API, provide consistent email sending interface.

```typescript
// @ts-nocheck
import { Resend } from 'resend'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function errorResponse(code: string, message: string, status: number) {
  return new Response(JSON.stringify({ error: { code, message } }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const resendApiKey = Deno.env.get('RESEND_API_KEY')
  if (!resendApiKey) {
    return errorResponse('INTERNAL_ERROR', 'Resend API key not configured', 500)
  }

  let to: string
  let subject: string
  let html: string

  try {
    const body = (await req.json()) as { to?: string; subject?: string; html?: string }
    to = body.to ?? ''
    subject = body.subject ?? ''
    html = body.html ?? ''
  } catch {
    return errorResponse('BAD_REQUEST', 'Invalid JSON body', 400)
  }

  if (!to || !subject || !html) {
    return errorResponse('BAD_REQUEST', 'to, subject, and html are required', 400)
  }

  const resend = new Resend(resendApiKey)
  const { error } = await resend.emails.send({
    from: 'Training Records <noreply@resend.dev>',
    to,
    subject,
    html,
  })

  if (error) {
    console.error('Resend API error:', error)
    return errorResponse('INTERNAL_ERROR', 'Failed to send email', 500)
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
```

### 4.2 Dependency Installation

```bash
cd supabase/functions
npm install resend
```

### 4.3 Environment Variables

| Variable         | Description                                         |
| ---------------- | --------------------------------------------------- |
| `RESEND_API_KEY` | Resend API key for sending emails                   |
| `APP_URL`        | Frontend URL (e.g., `https://training.example.com`) |

---

## 5. Token Handling for Password Reset

### 5.1 Token Generation Flow

```
User submits email
       ↓
request-password-reset EF
       ↓
Check if user exists (fail silently)
       ↓
Generate magic link via supabaseAdmin.auth.admin.generateLink({ type: 'magiclink' })
       ↓
Store hashed_token in reset URL
       ↓
Send email via send-email helper
       ↓
User clicks link → /reset-password?token={hashed_token}
```

### 5.2 request-password-reset Edge Function

**File**: `supabase/functions/request-password-reset/index.ts`

```typescript
// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function errorResponse(code: string, message: string, status: number) {
  return new Response(JSON.stringify({ error: { code, message } }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const appUrl = Deno.env.get('APP_URL')!

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

  let email: string
  try {
    const body = (await req.json()) as { email?: string }
    email = body.email ?? ''
  } catch {
    return errorResponse('BAD_REQUEST', 'Invalid JSON body', 400)
  }

  if (!email || !EMAIL_REGEX.test(email)) {
    return errorResponse('BAD_REQUEST', 'Invalid email address', 400)
  }

  // Check if user exists (fail silently for email enumeration prevention)
  const { data: users } = await supabaseAdmin.auth.admin.listUsers()
  const user = users?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())

  if (!user) {
    // Return success to prevent email enumeration attacks
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Generate magic link
  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  })

  if (linkError || !linkData) {
    console.error('Failed to generate magic link:', linkError?.message)
    return errorResponse('INTERNAL_ERROR', 'Failed to generate reset link', 500)
  }

  // Send email via send-email helper
  const resetUrl = `${appUrl}/reset-password?token=${encodeURIComponent(linkData.properties.hashed_token)}`
  const emailHtml = `
    <h1>Password Reset Request</h1>
    <p>You requested a password reset. Click the link below to set a new password:</p>
    <p><a href="${resetUrl}">Reset Password</a></p>
    <p>This link expires in 1 hour. If you didn't request this, please ignore this email.</p>
  `

  try {
    await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        to: email,
        subject: 'Password Reset Instructions',
        html: emailHtml,
      }),
    })
  } catch (emailError) {
    console.error('Failed to send email:', emailError)
    return errorResponse('INTERNAL_ERROR', 'Failed to send reset email', 500)
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
```

### 5.3 reset-password Edge Function

**File**: `supabase/functions/reset-password/index.ts`

```typescript
// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function errorResponse(code: string, message: string, status: number) {
  return new Response(JSON.stringify({ error: { code, message } }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// Password validation regex (same as frontend/backend shared module)
const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\d!@#$%^&*(),.?":{}|<>]{8,}$/

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

  let token: string
  let newPassword: string

  try {
    const body = (await req.json()) as { token?: string; new_password?: string }
    token = body.token ?? ''
    newPassword = body.new_password ?? ''
  } catch {
    return errorResponse('BAD_REQUEST', 'Invalid JSON body', 400)
  }

  if (!token || !newPassword) {
    return errorResponse('BAD_REQUEST', 'token and new_password are required', 400)
  }

  // Validate password strength (same as frontend)
  if (!PASSWORD_REGEX.test(newPassword)) {
    return errorResponse(
      'WEAK_PASSWORD',
      'Password must be at least 8 characters and contain uppercase, number, and symbol',
      400,
    )
  }

  // Verify token using magic link
  const { data: user, error: verifyError } = await supabaseAdmin.auth.admin.getUserByLink(
    decodeURIComponent(token),
  )

  if (verifyError || !user) {
    return errorResponse('INVALID_TOKEN', 'Reset link is invalid or has expired', 400)
  }

  // Update password
  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
    password: newPassword,
  })

  if (updateError) {
    console.error('Failed to update password:', updateError.message)
    return errorResponse('INTERNAL_ERROR', 'Failed to update password', 500)
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
```

### 5.4 Security Considerations

| Concern           | Mitigation                                             |
| ----------------- | ------------------------------------------------------ |
| Email enumeration | Always return success even if user not found           |
| Token expiry      | Supabase magic links have 1-hour expiry (configurable) |
| Token reuse       | Magic links are single-use                             |
| HTTPS             | Enforce HTTPS in production via `site_url`             |
| Password storage  | Supabase handles bcrypt hashing                        |

---

## 6. Component Architecture

### 6.1 PasswordStrengthMeter Component

**File**: `src/components/ui/PasswordStrengthMeter.tsx`

```typescript
import { calculatePasswordStrength } from '@/features/auth/lib/password-validation'

interface PasswordStrengthMeterProps {
  password: string
}

const STRENGTH_CONFIG = [
  { label: 'Very Weak', color: 'red' },
  { label: 'Weak', color: 'orange' },
  { label: 'Fair', color: 'yellow' },
  { label: 'Good', color: 'lime' },
  { label: 'Strong', color: 'green' },
] as const

export function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  const strength = calculatePasswordStrength(password)
  const config = STRENGTH_CONFIG[strength]
  const widthPercent = password ? (strength + 1) * 20 : 0

  if (!password) {
    return null
  }

  return (
    <div className="space-y-1">
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full bg-${config.color}-500 transition-all duration-300 ease-out`}
          style={{ width: `${widthPercent}%` }}
        />
      </div>
      <p className={`text-xs text-${config.color}-600`}>{config.label}</p>
    </div>
  )
}
```

### 6.2 Integration Points

| Page                | Integration                                           |
| ------------------- | ----------------------------------------------------- |
| `RegisterPage`      | Below password input, in form validation              |
| `AcceptInvitePage`  | Below password input, in form validation              |
| `ResetPasswordPage` | Below new password input, with requirements checklist |

---

## 7. Error Handling Strategy

### 7.1 Consistent Error Format

All Edge Functions return the same error structure:

```typescript
{ error: { code: string, message: string } }
```

### 7.2 Error Code Registry

| Code              | HTTP | Scenario                              |
| ----------------- | ---- | ------------------------------------- |
| `BAD_REQUEST`     | 400  | Missing/invalid parameters            |
| `INVALID_TOKEN`   | 400  | Expired or used reset token           |
| `WEAK_PASSWORD`   | 400  | Password doesn't meet requirements    |
| `EMAIL_NOT_FOUND` | 404  | Not returned (enumeration prevention) |
| `INTERNAL_ERROR`  | 500  | Database or email API failure         |

### 7.3 Frontend Error Parsing

All hooks use `invokeFunction` helper for consistent error parsing:

```typescript
import { invokeFunction } from '@/lib/edge-function'

const data = await invokeFunction<ResetPasswordResponse>({
  name: 'reset-password',
  body: { token, new_password },
})

if (data.error) {
  throw new Error(data.error.message)
}
```

---

## 8. React Hooks Architecture

### 8.1 useForgotPassword Hook

**File**: `src/features/auth/hooks/useForgotPassword.ts`

```typescript
import { useMutation } from '@tanstack/react-query'
import { invokeFunction } from '@/lib/edge-function'

interface ForgotPasswordResponse {
  success: boolean
  error?: { code: string; message: string }
}

interface UseForgotPasswordOptions {
  onSuccess?: () => void
  onError?: (error: string) => void
}

export function useForgotPassword(options?: UseForgotPasswordOptions) {
  const mutation = useMutation({
    mutationFn: async (email: string) => {
      const data = await invokeFunction<ForgotPasswordResponse>({
        name: 'request-password-reset',
        body: { email },
      })

      if (data.error) {
        throw new Error(data.error.message)
      }

      return data
    },
    onSuccess: () => options?.onSuccess?.(),
    onError: (error: Error) => options?.onError?.(error.message),
  })

  return {
    requestReset: mutation.mutateAsync,
    isLoading: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
    error: mutation.error?.message ?? null,
  }
}
```

### 8.2 useResetPassword Hook

**File**: `src/features/auth/hooks/useResetPassword.ts`

```typescript
import { useMutation } from '@tanstack/react-query'
import { invokeFunction } from '@/lib/edge-function'
import { validateStrongPassword } from '../lib/password-validation'

interface ResetPasswordInput {
  token: string
  new_password: string
}

interface ResetPasswordResponse {
  success: boolean
  error?: { code: string; message: string }
}

interface UseResetPasswordOptions {
  onSuccess?: () => void
  onError?: (error: string) => void
}

const WEAK_PASSWORD_ERROR =
  'Password must be at least 8 characters and contain uppercase, number, and symbol'

export function useResetPassword(options?: UseResetPasswordOptions) {
  const mutation = useMutation({
    mutationFn: async (input: ResetPasswordInput) => {
      // Validate password strength locally first (fail-fast)
      const validation = validateStrongPassword(input.new_password)
      if (!validation.valid) {
        throw new Error(validation.message ?? WEAK_PASSWORD_ERROR)
      }

      const data = await invokeFunction<ResetPasswordResponse>({
        name: 'reset-password',
        body: { token: input.token, new_password: input.new_password },
      })

      if (data.error) {
        throw new Error(data.error.message)
      }

      return data
    },
    onSuccess: () => options?.onSuccess?.(),
    onError: (error: Error) => options?.onError?.(error.message),
  })

  return {
    resetPassword: mutation.mutateAsync,
    isLoading: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
    error: mutation.error?.message ?? null,
  }
}
```

### 8.3 Updated useRegister Hook

**File**: `src/features/auth/hooks/useRegister.ts`

```typescript
import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { RegisterInput, RegisterResponse } from '../auth.types'
import { validateStrongPassword } from '../lib/password-validation'

const WEAK_PASSWORD_ERROR =
  'Password must be at least 8 characters and contain uppercase, number, and symbol'

export function useRegister() {
  const mutation = useMutation({
    mutationFn: async (input: RegisterInput) => {
      // Validate password strength locally first
      const validation = validateStrongPassword(input.password)
      if (!validation.valid) {
        throw new Error(validation.message ?? WEAK_PASSWORD_ERROR)
      }

      const { data, error } = await supabase.functions.invoke<RegisterResponse>('register-user', {
        body: input,
      })

      if (error) {
        throw new Error(error.message ?? 'Failed to register')
      }

      if (data?.error) {
        throw new Error(data.error)
      }

      return data
    },
  })

  return {
    register: mutation.mutateAsync,
    isLoading: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
    error: mutation.error?.message ?? null,
  }
}
```

### 8.4 Updated useAcceptInvite Hook

**File**: `src/features/auth/hooks/useAcceptInvite.ts`

Same pattern as `useRegister` - add `validateStrongPassword` call.

---

## 9. Page Components

### 9.1 ForgotPasswordPage

**File**: `src/features/auth/pages/ForgotPasswordPage.tsx`

- Email input with basic validation
- Submit button with loading state
- Success message after submission
- "Back to login" link
- Error alert with focus management

### 9.2 ResetPasswordPage

**File**: `src/features/auth/pages/ResetPasswordPage.tsx`

- Token extraction from URL query params
- New password input with `PasswordStrengthMeter`
- Password requirements checklist (checkmarks for met criteria)
- Confirm password input
- Submit button disabled until password is valid
- Success state with redirect to login
- Token validation (redirect if missing)

### 9.3 Updated Pages

| Page               | Changes                                                                   |
| ------------------ | ------------------------------------------------------------------------- |
| `LoginPage`        | Add "Forgot password?" link                                               |
| `RegisterPage`     | Update Zod schema with strong password rules, add `PasswordStrengthMeter` |
| `AcceptInvitePage` | Update Zod schema with strong password rules, add `PasswordStrengthMeter` |

---

## 10. Router Updates

**File**: `src/app/router.tsx`

```typescript
import { ForgotPasswordPage } from '@/features/auth/pages/ForgotPasswordPage'
import { ResetPasswordPage } from '@/features/auth/pages/ResetPasswordPage'

// Add to router array:
{
  path: '/forgot-password',
  element: <ForgotPasswordPage />,
},
{
  path: '/reset-password',
  element: <ResetPasswordPage />,
}
```

---

## 11. Supabase Configuration

**File**: `supabase/config.toml`

```toml
[auth]
minimum_password_length = 8
password_requirements = "lower_upper_letters_digits_symbols"

[auth.email]
enable_confirmations = false  # We handle verification via external flow
```

---

## 12. Testing Strategy

### 12.1 Unit Tests

| Test File                                                     | Coverage                                              |
| ------------------------------------------------------------- | ----------------------------------------------------- |
| `src/features/auth/lib/__tests__/password-validation.test.ts` | `validateStrongPassword`, `calculatePasswordStrength` |

### 12.2 Hook Tests

| Test File                                                      | Coverage               |
| -------------------------------------------------------------- | ---------------------- |
| `src/features/auth/hooks/__tests__/useForgotPassword.test.tsx` | Hook state transitions |
| `src/features/auth/hooks/__tests__/useResetPassword.test.tsx`  | Hook state transitions |
| `src/features/auth/hooks/__tests__/useRegister.test.tsx`       | Regression test        |
| `src/features/auth/hooks/__tests__/useAcceptInvite.test.tsx`   | Regression test        |

### 12.3 Component Tests

| Test File                                                       | Coverage                            |
| --------------------------------------------------------------- | ----------------------------------- |
| `src/components/ui/__tests__/PasswordStrengthMeter.test.tsx`    | Visual states, strength calculation |
| `src/features/auth/pages/__tests__/ForgotPasswordPage.test.tsx` | Form submission, error handling     |
| `src/features/auth/pages/__tests__/ResetPasswordPage.test.tsx`  | Token handling, form validation     |

### 12.4 Edge Function Tests

Edge Functions use manual testing pattern:

```bash
# Serve locally
supabase functions serve send-email --env-file supabase/functions/.env
supabase functions serve request-password-reset --env-file supabase/functions/.env
supabase functions serve reset-password --env-file supabase/functions/.env

# Invoke with test data
supabase functions invoke request-password-reset \
  --no-verify-jwt \
  -H 'Content-Type: application/json' \
  -b '{"email":"test@example.com"}'
```

---

## 13. File Inventory

| File                                                            | Action | Phase    |
| --------------------------------------------------------------- | ------ | -------- |
| `.env.local`                                                    | Modify | Config   |
| `supabase/config.toml`                                          | Modify | Config   |
| `supabase/functions/send-email/index.ts`                        | Create | Backend  |
| `supabase/functions/request-password-reset/index.ts`            | Create | Backend  |
| `supabase/functions/reset-password/index.ts`                    | Create | Backend  |
| `src/features/auth/lib/password-validation.ts`                  | Create | Shared   |
| `src/features/auth/lib/__tests__/password-validation.test.ts`   | Create | Tests    |
| `src/features/auth/hooks/useForgotPassword.ts`                  | Create | Frontend |
| `src/features/auth/hooks/__tests__/useForgotPassword.test.tsx`  | Create | Tests    |
| `src/features/auth/hooks/useResetPassword.ts`                   | Create | Frontend |
| `src/features/auth/hooks/__tests__/useResetPassword.test.tsx`   | Create | Tests    |
| `src/features/auth/hooks/useRegister.ts`                        | Modify | Frontend |
| `src/features/auth/hooks/useAcceptInvite.ts`                    | Modify | Frontend |
| `src/components/ui/PasswordStrengthMeter.tsx`                   | Create | Frontend |
| `src/components/ui/__tests__/PasswordStrengthMeter.test.tsx`    | Create | Tests    |
| `src/features/auth/pages/ForgotPasswordPage.tsx`                | Create | Frontend |
| `src/features/auth/pages/__tests__/ForgotPasswordPage.test.tsx` | Create | Tests    |
| `src/features/auth/pages/ResetPasswordPage.tsx`                 | Create | Frontend |
| `src/features/auth/pages/__tests__/ResetPasswordPage.test.tsx`  | Create | Tests    |
| `src/app/router.tsx`                                            | Modify | Frontend |
| `src/features/auth/LoginPage.tsx`                               | Modify | Frontend |
| `src/features/auth/pages/RegisterPage.tsx`                      | Modify | Frontend |
| `src/features/auth/pages/AcceptInvitePage.tsx`                  | Modify | Frontend |

---

## 14. Implementation Order

### Phase 1: Config & Environment

1. Add `RESEND_API_KEY`, `APP_URL` to `.env.local`
2. Update `supabase/config.toml` with password requirements

### Phase 2: Backend (Edge Functions)

3. Create `send-email` Edge Function
4. Create `request-password-reset` Edge Function
5. Create `reset-password` Edge Function
6. Update existing Edge Functions with password validation

### Phase 3: Shared Validation

7. Create `src/features/auth/lib/password-validation.ts`

### Phase 4: Frontend Hooks

8. Create `useForgotPassword` hook
9. Create `useResetPassword` hook
10. Update `useRegister` hook
11. Update `useAcceptInvite` hook

### Phase 5: Components

1.  Create `PasswordStrengthMeter` component

### Phase 6: Pages

1.  Create `ForgotPasswordPage`
2.  Create `ResetPasswordPage`
3.  Update `LoginPage`
4.  Update `RegisterPage`
5.  Update `AcceptInvitePage`

### Phase 7: Router

1.  Add new routes to `router.tsx`

### Phase 8: Testing

1.  Create and run all unit/component/hook tests

---

## 15. Rollback Plan

1. Revert `supabase/config.toml` to `minimum_password_length = 6`, `password_requirements = ""`
2. Delete new Edge Functions (`send-email`, `request-password-reset`, `reset-password`)
3. Remove new routes from `router.tsx`
4. Delete new pages, hooks, components, and validation module
5. Revert `RegisterPage`, `AcceptInvitePage`, `LoginPage`, `useRegister`, `useAcceptInvite` to previous state
6. No database migrations needed (Supabase Auth manages password storage)

---

## 16. Open Questions

| Question                                          | Resolution                                                                         |
| ------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Should we add rate limiting to password reset?    | Handled by Resend's built-in limits; can add Edge Function rate limiting if needed |
| Should reset tokens be stored in DB for tracking? | No - use Supabase's built-in magic link tokens                                     |
| Should we email from a custom domain?             | Resend supports custom domains; can configure `from` address later                 |
| Should we add password history?                   | Out of scope for this SDD                                                          |
| Should we notify users of password changes?       | Supabase handles this notification automatically                                   |

---

## 17. References

- [Resend API Documentation](https://resend.com/docs)
- [Supabase Auth Configuration](https://supabase.com/docs/guides/auth)
- [Edge Function Development](https://supabase.com/docs/guides/functions)
- Existing patterns from PR #71 codebase
