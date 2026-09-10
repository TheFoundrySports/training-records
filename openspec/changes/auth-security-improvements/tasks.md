# Implementation Tasks: auth-security-improvements

## Review Workload Forecast

| Field                   | Value                                                                                   |
| ----------------------- | --------------------------------------------------------------------------------------- |
| Estimated changed lines | 650-800                                                                                 |
| 400-line budget risk    | Medium                                                                                  |
| Chained PRs recommended | Yes                                                                                     |
| Suggested split         | PR 1: Config + Edge Functions, PR 2: Hooks + Components, PR 3: Pages + Router + Updates |
| Delivery strategy       | ask-on-risk                                                                             |
| Chain strategy          | stacked-to-main                                                                         |

**Rationale**: This change spans 4 domains (edge-functions, password-strength-meter, password-reset-hooks, password-reset-pages) with 18+ files to create/modify. Stacked PRs protect review focus on each layer.

---

**Decision needed before apply**: Yes  
**Chained PRs recommended**: Yes  
**Chain strategy**: stacked-to-main  
**400-line budget risk**: Medium

---

## Phase 1: Config & Environment

### Task 1.1: Add Resend API Key to Environment

**Files to modify:**

- `.env.local`

**Changes:**

```bash
# Add these variables
RESEND_API_KEY=re_your_api_key_here
APP_URL=http://127.0.0.1:5173
```

**Verification:**

```bash
grep -q "RESEND_API_KEY" .env.local && echo "RESEND_API_KEY found"
```

**Complexity:** Simple

---

### Task 1.2: Update Supabase Auth Password Requirements

**Files to modify:**

- `supabase/config.toml`

**Changes:**

```toml
[auth]
# Update minimum password length
minimum_password_length = 8

# Enable password requirements
password_requirements = "lower_upper_letters_digits_symbols"
```

**Verification:**

```bash
grep "minimum_password_length = 8" supabase/config.toml
grep "lower_upper_letters_digits_symbols" supabase/config.toml
```

**Complexity:** Simple

---

## Phase 2: Edge Functions (Backend)

### Task 2.1: Create send-email Edge Function

**Files to create:**

- `supabase/functions/send-email/index.ts`

**Implementation:**

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
    return errorResponse('INTERNAL_ERROR', error.message, 500)
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
```

**Dependencies:**

- Install `resend` package: `cd supabase/functions && npm install resend`

**Verification:**

```bash
# Run function tests (manual testing)
supabase functions serve send-email --env-file supabase/functions/.env
```

**Complexity:** Medium

---

### Task 2.2: Create request-password-reset Edge Function

**Files to create:**

- `supabase/functions/request-password-reset/index.ts`

**Implementation:**

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

// Email validation regex
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

  // Check if user exists (fail silently for security)
  const { data: users } = await supabaseAdmin.auth.admin.listUsers()
  const user = users?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())

  if (!user) {
    // Return success to prevent email enumeration
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Generate magic link
  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  })

  if (linkError) {
    console.error('Failed to generate magic link:', linkError.message)
    return errorResponse('INTERNAL_ERROR', 'Failed to generate reset link', 500)
  }

  // Send email via send-email function
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

**Verification:**

```bash
# Test locally
supabase functions serve request-password-reset --env-file supabase/functions/.env
# Then invoke with:
supabase functions invoke request-password-reset --no-verify-jwt -H 'Content-Type: application/json' -b '{"email":"test@example.com"}'
```

**Complexity:** Medium

---

### Task 2.3: Create reset-password Edge Function

**Files to create:**

- `supabase/functions/reset-password/index.ts`

**Implementation:**

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

// Password strength validation regex
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

  // Validate password strength
  if (!PASSWORD_REGEX.test(newPassword)) {
    return errorResponse(
      'WEAK_PASSWORD',
      'Password must be at least 8 characters and contain uppercase, number, and symbol',
      400,
    )
  }

  // Verify token
  const { data: user, error: verifyError } = await supabaseAdmin.auth.admin.getUserByLink(token)

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

**Verification:**

```bash
# Test locally
supabase functions serve reset-password --env-file supabase/functions/.env
```

**Complexity:** Medium

---

## Phase 3: Password Validation Library

### Task 3.1: Create password-validation utility

**Files to create:**

- `src/features/auth/lib/password-validation.ts`

**Implementation:**

```typescript
export interface ValidationResult {
  valid: boolean
  message?: string
}

// Password strength regex (same as backend)
const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\d!@#$%^&*(),.?":{}|<>]{8,}$/

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

// Calculate strength score (0-4)
export function calculatePasswordStrength(password: string): number {
  if (password.length < 8) return 0
  if (!PASSWORD_REGEX.test(password)) return 1

  const hasUppercase = /[A-Z]/.test(password)
  const hasNumber = /\d/.test(password)
  const hasSymbol = /[!@#$%^&*(),.?":{}|<>]/.test(password)

  const criteriaCount = [hasUppercase, hasNumber, hasSymbol].filter(Boolean).length

  if (criteriaCount === 1) return 2 // Fair
  if (criteriaCount === 2) return 3 // Good
  return 4 // Strong
}
```

**Tests to create:**

- `src/features/auth/lib/__tests__/password-validation.test.ts`

**Verification:**

```bash
npm test -- src/features/auth/lib/__tests__/password-validation.test.ts
```

**Complexity:** Simple

---

## Phase 4: React Hooks

### Task 4.1: Create useForgotPassword hook

**Files to create:**

- `src/features/auth/hooks/useForgotPassword.ts`

**Implementation:**

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
    onSuccess: () => {
      options?.onSuccess?.()
    },
    onError: (error: Error) => {
      options?.onError?.(error.message)
    },
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

**Tests to create:**

- `src/features/auth/hooks/__tests__/useForgotPassword.test.tsx`

**Verification:**

```bash
npm test -- src/features/auth/hooks/__tests__/useForgotPassword.test.tsx
```

**Complexity:** Medium

---

### Task 4.2: Create useResetPassword hook

**Files to create:**

- `src/features/auth/hooks/useResetPassword.ts`

**Implementation:**

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
      // Validate password strength locally first
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
    onSuccess: () => {
      options?.onSuccess?.()
    },
    onError: (error: Error) => {
      options?.onError?.(error.message)
    },
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

**Tests to create:**

- `src/features/auth/hooks/__tests__/useResetPassword.test.tsx`

**Verification:**

```bash
npm test -- src/features/auth/hooks/__tests__/useResetPassword.test.tsx
```

**Complexity:** Medium

---

### Task 4.3: Update useRegister hook with password validation

**Files to modify:**

- `src/features/auth/hooks/useRegister.ts`

**Changes:**

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

**Verification:**

```bash
npm test -- src/features/auth/hooks/__tests__/useRegister.test.tsx
```

**Complexity:** Simple

---

### Task 4.4: Update useAcceptInvite hook with password validation

**Files to modify:**

- `src/features/auth/hooks/useAcceptInvite.ts`

**Changes:**

```typescript
import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { AcceptInviteInput, AcceptInviteResponse } from '../auth.types'
import { validateStrongPassword } from '../lib/password-validation'

const WEAK_PASSWORD_ERROR =
  'Password must be at least 8 characters and contain uppercase, number, and symbol'

export function useAcceptInvite() {
  const mutation = useMutation({
    mutationFn: async (input: AcceptInviteInput) => {
      // Validate password strength locally first
      const validation = validateStrongPassword(input.password)
      if (!validation.valid) {
        throw new Error(validation.message ?? WEAK_PASSWORD_ERROR)
      }

      const { data, error } = await supabase.functions.invoke<AcceptInviteResponse>(
        'accept-invite',
        {
          body: input,
        },
      )

      if (error) {
        throw new Error(error.message ?? 'Failed to accept invitation')
      }

      if (data?.error) {
        throw new Error(data.error)
      }

      return data
    },
  })

  return {
    acceptInvite: mutation.mutateAsync,
    isLoading: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
    error: mutation.error?.message ?? null,
    warning: mutation.data?.warning ?? null,
  }
}
```

**Verification:**

```bash
npm test -- src/features/auth/hooks/__tests__/useAcceptInvite.test.tsx
```

**Complexity:** Simple

---

## Phase 5: PasswordStrengthMeter Component

### Task 5.1: Create PasswordStrengthMeter component

**Files to create:**

- `src/components/ui/PasswordStrengthMeter.tsx`

**Implementation:**

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

**Tests to create:**

- `src/components/ui/__tests__/PasswordStrengthMeter.test.tsx`

**Verification:**

```bash
npm test -- src/components/ui/__tests__/PasswordStrengthMeter.test.tsx
```

**Complexity:** Simple

---

## Phase 6: Password Reset Pages

### Task 6.1: Create ForgotPasswordPage

**Files to create:**

- `src/features/auth/pages/ForgotPasswordPage.tsx`

**Implementation:**

```typescript
import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { useForgotPassword } from '../hooks/useForgotPassword'

export function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState<string | null>(null)
  const errorRef = React.useRef<HTMLParagraphElement>(null)

  const { requestReset, isLoading, isSuccess, error } = useForgotPassword({
    onSuccess: () => {
      // Success - email sent (or fail-safe for non-existent users)
    },
    onError: (errorMessage) => {
      setTimeout(() => errorRef.current?.focus(), 50)
    },
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setEmailError(null)

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email || !emailRegex.test(email)) {
      setEmailError('Invalid email address')
      return
    }

    try {
      await requestReset(email)
    } catch {
      // Error handled by hook
    }
  }

  return (
    <main
      aria-labelledby="forgot-password-heading"
      className="flex min-h-screen items-center justify-center bg-background px-4"
    >
      <Card className="w-full max-w-sm">
        <CardHeader>
          <h1 id="forgot-password-heading" className="text-2xl font-semibold tracking-tight">
            Forgot Password
          </h1>
          <CardDescription>
            Enter your email and we&apos;ll send you a link to reset your password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isSuccess ? (
            <div className="space-y-4">
              <div
                role="status"
                aria-live="polite"
                className="rounded-md bg-green-50 p-4 text-sm text-green-800 border border-green-200"
              >
                Check your email for a reset link.
              </div>
              <p className="text-center text-sm text-muted-foreground">
                <Link to="/login" className="text-primary hover:underline">
                  Back to login
                </Link>
              </p>
            </div>
          ) : (
            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                />
                {emailError && (
                  <p className="text-sm text-destructive">{emailError}</p>
                )}
              </div>
              {error && (
                <p ref={errorRef} role="alert" aria-live="assertive" className="text-sm font-medium text-destructive">
                  {error}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Sending...' : 'Send Reset Link'}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Remember your password?{' '}
                <Link to="/login" className="text-primary hover:underline">
                  Back to login
                </Link>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
```

**Tests to create:**

- `src/features/auth/pages/__tests__/ForgotPasswordPage.test.tsx`

**Verification:**

```bash
npm test -- src/features/auth/pages/__tests__/ForgotPasswordPage.test.tsx
```

**Complexity:** Medium

---

### Task 6.2: Create ResetPasswordPage

**Files to create:**

- `src/features/auth/pages/ResetPasswordPage.tsx`

**Implementation:**

```typescript
import React, { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { PasswordStrengthMeter } from '@/components/ui/PasswordStrengthMeter'
import { useResetPassword } from '../hooks/useResetPassword'
import { validateStrongPassword } from '../lib/password-validation'

const resetPasswordSchema = z
  .object({
    password: z.string(),
    passwordConfirmation: z.string(),
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    message: 'Passwords do not match',
    path: ['passwordConfirmation'],
  })

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const errorRef = React.useRef<HTMLParagraphElement>(null)

  const { resetPassword, isLoading, isSuccess, isError, error } = useResetPassword({
    onSuccess: () => {
      setTimeout(() => navigate('/login?reset=true'), 1500)
    },
    onError: () => {
      setTimeout(() => errorRef.current?.focus(), 50)
    },
  })

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  })

  const password = watch('password') ?? ''

  // Validate password in real-time
  const passwordValidation = validateStrongPassword(password)

  // Redirect if no token
  React.useEffect(() => {
    if (!token) {
      void navigate('/login')
    }
  }, [token, navigate])

  async function onSubmit(data: ResetPasswordFormData) {
    if (!token) return
    try {
      await resetPassword({ token, new_password: data.password })
    } catch {
      // Error handled by hook
    }
  }

  if (!token) {
    return null
  }

  return (
    <main
      aria-labelledby="reset-password-heading"
      className="flex min-h-screen items-center justify-center bg-background px-4"
    >
      <Card className="w-full max-w-sm">
        <CardHeader>
          <h1 id="reset-password-heading" className="text-2xl font-semibold tracking-tight">
            Set New Password
          </h1>
          <CardDescription>Create a new password for your account.</CardDescription>
        </CardHeader>
        <CardContent>
          {isSuccess ? (
            <div
              role="status"
              aria-live="polite"
              className="rounded-md bg-green-50 p-4 text-sm text-green-800 border border-green-200"
            >
              Password reset successful! Redirecting to login...
            </div>
          ) : (
            <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  {...register('password')}
                />
                <PasswordStrengthMeter password={password} />
              </div>

              {/* Password requirements checklist */}
              <div className="space-y-1 text-sm text-muted-foreground">
                <p className="font-medium">Password must include:</p>
                <ul className="space-y-0.5 pl-4">
                  <li className={password.length >= 8 ? 'text-green-600' : ''}>
                    {password.length >= 8 ? '✓' : '○'} 8+ characters
                  </li>
                  <li className={/[A-Z]/.test(password) ? 'text-green-600' : ''}>
                    {/[A-Z]/.test(password) ? '✓' : '○'} Uppercase letter
                  </li>
                  <li className={/\d/.test(password) ? 'text-green-600' : ''}>
                    {/\d/.test(password) ? '✓' : '○'} Number
                  </li>
                  <li className={/[!@#$%^&*(),.?":{}|<>]/.test(password) ? 'text-green-600' : ''}>
                    {/[!@#$%^&*(),.?":{}|<>]/.test(password) ? '✓' : '○'} Symbol
                  </li>
                </ul>
              </div>

              <div className="space-y-2">
                <Label htmlFor="passwordConfirmation">Confirm Password</Label>
                <Input
                  id="passwordConfirmation"
                  type="password"
                  autoComplete="new-password"
                  {...register('passwordConfirmation')}
                />
                {errors.passwordConfirmation && (
                  <p className="text-sm text-destructive">{errors.passwordConfirmation.message}</p>
                )}
              </div>

              {isError && error && (
                <p ref={errorRef} role="alert" aria-live="assertive" className="text-sm font-medium text-destructive">
                  {error}
                </p>
              )}

              <Button type="submit" className="w-full" disabled={isLoading || !passwordValidation.valid}>
                {isLoading ? 'Resetting...' : 'Reset Password'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
```

**Tests to create:**

- `src/features/auth/pages/__tests__/ResetPasswordPage.test.tsx`

**Verification:**

```bash
npm test -- src/features/auth/pages/__tests__/ResetPasswordPage.test.tsx
```

**Complexity:** Medium

---

## Phase 7: Router Updates

### Task 7.1: Add new routes to router

**Files to modify:**

- `src/app/router.tsx`

**Changes:**

```typescript
import { ForgotPasswordPage } from '@/features/auth/pages/ForgotPasswordPage'
import { ResetPasswordPage } from '@/features/auth/pages/ResetPasswordPage'

// Add these routes to the router array:
{
  path: '/forgot-password',
  element: <ForgotPasswordPage />,
},
{
  path: '/reset-password',
  element: <ResetPasswordPage />,
},
```

**Verification:**

```bash
npm test -- src/app/router.test.tsx
# Or just verify the build works
npm run build 2>&1 | head -20
```

**Complexity:** Simple

---

## Phase 8: Page Updates

### Task 8.1: Update LoginPage with forgot password link

**Files to modify:**

- `src/features/auth/LoginPage.tsx`

**Changes:**

```typescript
// Add this after the existing "Don't have an account?" link:
{!isConfigLoading && registrationMode === 'open' && (
  <>
    <p className="mt-4 text-center text-sm text-muted-foreground">
      Don&apos;t have an account?{' '}
      <Link to="/register" className="text-primary hover:underline">
        Create one
      </Link>
    </p>
    <p className="mt-2 text-center text-sm text-muted-foreground">
      Forgot your password?{' '}
      <Link to="/forgot-password" className="text-primary hover:underline">
        Reset it
      </Link>
    </p>
  </>
)}
```

**Verification:**

```bash
npm test -- src/features/auth/pages/__tests__/LoginPage.test.tsx
```

**Complexity:** Simple

---

### Task 8.2: Update RegisterPage with PasswordStrengthMeter and strong password schema

**Files to modify:**

- `src/features/auth/pages/RegisterPage.tsx`

**Changes:**

```typescript
import { PasswordStrengthMeter } from '@/components/ui/PasswordStrengthMeter'

// Update the schema:
const registerSchema = z
  .object({
    email: z.string().email('Invalid email address'),
    password: z
      .string()
      .min(8, 'Must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain an uppercase letter')
      .regex(/\d/, 'Must contain a number')
      .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Must contain a symbol'),
    passwordConfirmation: z.string(),
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    message: 'Passwords do not match',
    path: ['passwordConfirmation'],
  })

// Add watch to form
const { watch } = useForm<RegisterFormData>(...)

// Add PasswordStrengthMeter after password Input:
<Input
  id="password"
  type="password"
  autoComplete="new-password"
  {...register('password')}
/>
<PasswordStrengthMeter password={watch('password') ?? ''} />
{errors.password && (
  <p className="text-sm text-destructive">{errors.password.message}</p>
)}
```

**Verification:**

```bash
npm test -- src/features/auth/pages/__tests__/RegisterPage.test.tsx
```

**Complexity:** Simple

---

### Task 8.3: Update AcceptInvitePage with PasswordStrengthMeter and strong password schema

**Files to modify:**

- `src/features/auth/pages/AcceptInvitePage.tsx`

**Changes:** Same pattern as RegisterPage - update schema, add watch, add PasswordStrengthMeter

**Verification:**

```bash
npm test -- src/features/auth/pages/__tests__/AcceptInvitePage.test.tsx
```

**Complexity:** Simple

---

## Phase 9: Integration Testing

### Task 9.1: Run full test suite

**Verification:**

```bash
npm test -- --run
```

**Expected to pass:**

- All existing auth tests
- All new password validation tests
- All new hook tests
- All new page tests

**Complexity:** Simple

---

## Phase 10: E2E Smoke Tests (Manual)

### Task 10.1: Manual E2E testing

**Test scenarios:**

1. Register flow with strong password
2. Login with new account
3. Forgot password flow (request reset email)
4. Reset password with valid token
5. Reset password with weak password (should reject)
6. Accept invite with strong password

**Verification:** Manual in browser

**Complexity:** Simple

---

## File Summary

| File                                                            | Action | Complexity |
| --------------------------------------------------------------- | ------ | ---------- |
| `.env.local`                                                    | Modify | Simple     |
| `supabase/config.toml`                                          | Modify | Simple     |
| `supabase/functions/send-email/index.ts`                        | Create | Medium     |
| `supabase/functions/request-password-reset/index.ts`            | Create | Medium     |
| `supabase/functions/reset-password/index.ts`                    | Create | Medium     |
| `src/features/auth/lib/password-validation.ts`                  | Create | Simple     |
| `src/features/auth/lib/__tests__/password-validation.test.ts`   | Create | Simple     |
| `src/features/auth/hooks/useForgotPassword.ts`                  | Create | Medium     |
| `src/features/auth/hooks/__tests__/useForgotPassword.test.tsx`  | Create | Medium     |
| `src/features/auth/hooks/useResetPassword.ts`                   | Create | Medium     |
| `src/features/auth/hooks/__tests__/useResetPassword.test.tsx`   | Create | Medium     |
| `src/features/auth/hooks/useRegister.ts`                        | Modify | Simple     |
| `src/features/auth/hooks/useAcceptInvite.ts`                    | Modify | Simple     |
| `src/components/ui/PasswordStrengthMeter.tsx`                   | Create | Simple     |
| `src/components/ui/__tests__/PasswordStrengthMeter.test.tsx`    | Create | Simple     |
| `src/features/auth/pages/ForgotPasswordPage.tsx`                | Create | Medium     |
| `src/features/auth/pages/__tests__/ForgotPasswordPage.test.tsx` | Create | Medium     |
| `src/features/auth/pages/ResetPasswordPage.tsx`                 | Create | Medium     |
| `src/features/auth/pages/__tests__/ResetPasswordPage.test.tsx`  | Create | Medium     |
| `src/app/router.tsx`                                            | Modify | Simple     |
| `src/features/auth/LoginPage.tsx`                               | Modify | Simple     |
| `src/features/auth/pages/RegisterPage.tsx`                      | Modify | Simple     |
| `src/features/auth/pages/AcceptInvitePage.tsx`                  | Modify | Simple     |

---

## Testing Commands

```bash
# Unit tests
npm test -- src/features/auth/lib/__tests__/password-validation.test.ts
npm test -- src/features/auth/hooks/__tests__/useForgotPassword.test.tsx
npm test -- src/features/auth/hooks/__tests__/useResetPassword.test.tsx
npm test -- src/components/ui/__tests__/PasswordStrengthMeter.test.tsx
npm test -- src/features/auth/pages/__tests__/ForgotPasswordPage.test.tsx
npm test -- src/features/auth/pages/__tests__/ResetPasswordPage.test.tsx

# Existing tests (should not regress)
npm test -- src/features/auth/hooks/__tests__/useRegister.test.tsx
npm test -- src/features/auth/hooks/__tests__/useAcceptInvite.test.tsx

# Full test suite
npm test -- --run

# Edge functions (local development)
supabase functions serve send-email --env-file supabase/functions/.env
supabase functions serve request-password-reset --env-file supabase/functions/.env
supabase functions serve reset-password --env-file supabase/functions/.env
```
