---
name: password-reset-pages
description: Forgot password and reset password pages
change: auth-security-improvements
status: draft
---

# Delta for Password Reset Pages

> **Domain**: `password-reset-pages`  
> **Change**: `auth-security-improvements`

---

## Purpose

Provide user-facing pages for the password reset flow with accessible forms and clear user feedback.

---

## ADDED Requirements

### REQ-PRP1: ForgotPasswordPage

The system MUST provide a `ForgotPasswordPage` component for requesting password reset emails.

#### Route

- **Path**: `/forgot-password`
- **Component**: `src/features/auth/pages/ForgotPasswordPage.tsx`

#### UI Layout

```
┌─────────────────────────────────────┐
│         Forgot Password             │
│                                     │
│ Enter your email and we'll send    │
│ you a link to reset your password. │
│                                     │
│ [ email input                  ]   │
│                                     │
│ [ Send Reset Link               ]  │
│                                     │
│ Remember your password?            │
│ [Back to login]                     │
└─────────────────────────────────────┘
```

#### Components Used

- `Card`, `CardHeader`, `CardContent`, `CardDescription` from `@/components/ui/card`
- `Input` from `@/components/ui/input`
- `Label` from `@/components/ui/label`
- `Button` from `@/components/ui/button`

#### Form Behavior

1. Email input with proper type (`type="email"`) and autocomplete
2. Submit button disabled while loading
3. Success message displayed after submission
4. Error message displayed on failure
5. Link back to login page

#### Scenario: Successful submission

- GIVEN a valid email address
- WHEN the user fills the email field and clicks "Send Reset Link"
- AND the submission succeeds
- THEN show "Check your email for a reset link" success message
- AND keep the success message visible
- AND disable the form

#### Scenario: Invalid email format

- GIVEN an invalid email format
- WHEN the user attempts to submit
- THEN show "Invalid email address" error below the input
- AND prevent submission

#### Scenario: Network error

- GIVEN a valid email
- WHEN the submission fails due to network error
- THEN show the error message from the hook
- AND allow retry

---

### REQ-PRP2: ResetPasswordPage

The system MUST provide a `ResetPasswordPage` component for setting a new password.

#### Route

- **Path**: `/reset-password?token={token}`
- **Component**: `src/features/auth/pages/ResetPasswordPage.tsx`
- **Query Parameter**: `token` (required)

#### UI Layout

```
┌─────────────────────────────────────┐
│         Set New Password            │
│                                     │
│ [ password input               ]   │
│ [ ████████░░ Strong          ]   │
│                                     │
│ [ confirm password input      ]   │
│                                     │
│ [ Reset Password              ]   │
│                                     │
│ Password must include:              │
│ ✓ 8+ characters                     │
│ ✓ Uppercase letter                  │
│ ✓ Number                            │
│ ✓ Symbol                            │
└─────────────────────────────────────┘
```

#### Components Used

- `Card`, `CardHeader`, `CardContent`, `CardDescription` from `@/components/ui/card`
- `Input` from `@/components/ui/input`
- `Label` from `@/components/ui/label`
- `Button` from `@/components/ui/button`
- `PasswordStrengthMeter` from `@/components/ui/PasswordStrengthMeter`

#### Form Behavior

1. Password input with `PasswordStrengthMeter` below
2. Password confirmation input
3. Real-time password requirements checklist
4. Submit button disabled while loading
5. Redirect to login on success
6. Display token errors if token is invalid

#### Requirements Checklist

Show checkmarks for met requirements:

- ✓ 8+ characters
- ✓ Uppercase letter
- ✓ Number
- ✓ Symbol

#### Scenario: Missing token

- GIVEN the page is accessed without a token query parameter
- WHEN the component loads
- THEN redirect to `/login`

#### Scenario: Successful password reset

- GIVEN a valid token and matching passwords that meet requirements
- WHEN the user clicks "Reset Password"
- THEN show "Password reset successful!" briefly
- AND redirect to `/login?reset=true`

#### Scenario: Password mismatch

- GIVEN a valid token and passwords that don't match
- WHEN the user submits
- THEN show "Passwords do not match" error below confirmation input

#### Scenario: Weak password

- GIVEN a valid token and a weak password
- WHEN the user types in the password field
- THEN show `PasswordStrengthMeter` with appropriate strength
- AND when submitting, show "Password must be at least 8 characters and contain uppercase, number, and symbol"

#### Scenario: Invalid or expired token

- GIVEN an invalid or expired token
- WHEN the edge function returns an error
- THEN show "Reset link is invalid or has expired"
- AND show a link to request a new reset email

---

### REQ-PRP3: Router Updates

The system MUST add the new routes to the router.

#### Routes to Add

```typescript
// In src/app/router.tsx
{
  path: '/forgot-password',
  element: <ForgotPasswordPage />
},
{
  path: '/reset-password',
  element: <ResetPasswordPage />
}
```

#### Import Statements

```typescript
import { ForgotPasswordPage } from '@/features/auth/pages/ForgotPasswordPage'
import { ResetPasswordPage } from '@/features/auth/pages/ResetPasswordPage'
```

---

### REQ-PRP4: LoginPage Update

The system MUST add a "Forgot password?" link to the login page.

#### Location

Below the form, alongside the "Don't have an account?" link:

```tsx
<p className="mt-4 text-center text-sm text-muted-foreground">
  Forgot your password?{' '}
  <Link to="/forgot-password" className="text-primary hover:underline">
    Reset it
  </Link>
</p>
```

#### Scenario: User clicks forgot password

- GIVEN the user is on the login page
- WHEN the user clicks "Reset it" or "Forgot your password?"
- THEN navigate to `/forgot-password`

---

### REQ-PRP5: RegisterPage Update

The system MUST add `PasswordStrengthMeter` to the registration form.

#### Location

Below the password input field:

```tsx
<div className="space-y-2">
  <Label htmlFor="password">Password</Label>
  <Input id="password" type="password" autoComplete="new-password" {...register('password')} />
  <PasswordStrengthMeter password={watch('password') ?? ''} />
  {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
</div>
```

#### Zod Schema Update

Update `registerSchema` to enforce strong password:

```typescript
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
```

---

### REQ-PRP6: AcceptInvitePage Update

The system MUST add `PasswordStrengthMeter` to the invite acceptance form.

#### Same Update Pattern as RegisterPage

- Add `PasswordStrengthMeter` below password input
- Update `acceptInviteSchema` to enforce strong password requirements
- Use `watch('password')` to get live password value

---

## Files to Create

| File                                             | Purpose                  |
| ------------------------------------------------ | ------------------------ |
| `src/features/auth/pages/ForgotPasswordPage.tsx` | Request reset email page |
| `src/features/auth/pages/ResetPasswordPage.tsx`  | Set new password page    |

---

## Files to Modify

| File                                           | Change                                                 |
| ---------------------------------------------- | ------------------------------------------------------ |
| `src/app/router.tsx`                           | Add `/forgot-password` and `/reset-password` routes    |
| `src/features/auth/LoginPage.tsx`              | Add "Forgot password?" link                            |
| `src/features/auth/pages/RegisterPage.tsx`     | Add `PasswordStrengthMeter` and strong password schema |
| `src/features/auth/pages/AcceptInvitePage.tsx` | Add `PasswordStrengthMeter` and strong password schema |

---

## Accessibility

All pages MUST:

- Have proper `aria-labelledby` on the main element
- Have labels associated with inputs using `htmlFor`
- Show errors with `role="alert"` and `aria-live="assertive"`
- Show success messages with `role="status"` and `aria-live="polite"`
- Support keyboard navigation
- Have proper focus management
