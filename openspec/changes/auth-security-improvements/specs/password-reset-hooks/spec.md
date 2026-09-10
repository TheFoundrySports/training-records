---
name: password-reset-hooks
description: React hooks for password reset flow
change: auth-security-improvements
status: draft
---

# Delta for Password Reset Hooks

> **Domain**: `password-reset-hooks`  
> **Change**: `auth-security-improvements`

---

## Purpose

Provide React hooks for the password reset flow that integrate with the Edge Functions and provide consistent state management.

---

## ADDED Requirements

### REQ-PRH1: useForgotPassword Hook

The system MUST provide a `useForgotPassword` hook for requesting password reset emails.

#### Interface

```typescript
interface UseForgotPasswordOptions {
  onSuccess?: () => void
  onError?: (error: string) => void
}

function useForgotPassword(options?: UseForgotPasswordOptions): {
  requestReset: (email: string) => Promise<void>
  isLoading: boolean
  isSuccess: boolean
  error: string | null
}
```

#### Behavior

1. Accept email as input
2. Call `request-password-reset` Edge Function via `invokeFunction`
3. Return loading/success/error states
4. Call `onSuccess` callback on successful submission (always succeeds to prevent enumeration)
5. Call `onError` callback with error message on failure

#### Scenario: Successful request

- GIVEN a valid email address for an existing user
- WHEN `requestReset(email)` is called
- THEN the hook MUST call the edge function
- AND set `isSuccess` to `true`
- AND return `isLoading` as `false`
- AND call `onSuccess` callback if provided

#### Scenario: Non-existent user

- GIVEN an email address that does not exist
- WHEN `requestReset(email)` is called
- THEN the hook MUST still return `isSuccess: true` (edge function returns success for security)
- AND NOT call `onError`

#### Scenario: Network error

- GIVEN a valid email
- WHEN the edge function call fails due to network error
- THEN the hook MUST set `error` to the error message
- AND set `isLoading` to `false`
- AND call `onError` callback if provided

---

### REQ-PRH2: useResetPassword Hook

The system MUST provide a `useResetPassword` hook for completing password reset.

#### Interface

```typescript
interface ResetPasswordInput {
  token: string
  new_password: string
}

interface UseResetPasswordOptions {
  onSuccess?: () => void
  onError?: (error: string) => void
}

function useResetPassword(options?: UseResetPasswordOptions): {
  resetPassword: (input: ResetPasswordInput) => Promise<void>
  isLoading: boolean
  isSuccess: boolean
  isError: boolean
  error: string | null
}
```

#### Behavior

1. Accept token and new password as input
2. Validate password strength locally before calling edge function
3. Call `reset-password` Edge Function via `invokeFunction`
4. Return loading/success/error states
5. Call `onSuccess` callback on successful reset
6. Call `onError` callback with error message on failure

#### Scenario: Successful reset

- GIVEN a valid token and a strong password
- WHEN `resetPassword({ token, new_password })` is called
- THEN the hook MUST call the edge function
- AND set `isSuccess` to `true`
- AND call `onSuccess` callback if provided

#### Scenario: Weak password rejected locally

- GIVEN a token and a weak password (e.g., "password")
- WHEN `resetPassword({ token, new_password })` is called
- THEN the hook MUST reject immediately without calling the edge function
- AND set `error` to "Password must be at least 8 characters and contain uppercase, number, and symbol"

#### Scenario: Invalid or expired token

- GIVEN a valid token and strong password
- WHEN the edge function returns INVALID_TOKEN error
- THEN the hook MUST set `isError` to `true`
- AND set `error` to the error message from the edge function
- AND call `onError` callback if provided

---

### REQ-PRH3: Password Strength Validation in Existing Hooks

The system MUST update existing auth hooks to validate password strength.

#### useRegister Hook Update

The `useRegister` hook MUST reject weak passwords before calling the edge function.

```typescript
// Add to existing useRegister implementation
const passwordValidation = validateStrongPassword(input.password)
if (!passwordValidation.valid) {
  throw new Error(passwordValidation.message)
}
```

#### useAcceptInvite Hook Update

The `useAcceptInvite` hook MUST reject weak passwords before calling the edge function.

---

## Password Strength Validation Utility

### REQ-PRH4: validateStrongPassword Function

The system MUST provide a reusable password validation function.

```typescript
interface ValidationResult {
  valid: boolean
  message?: string
}

function validateStrongPassword(password: string): ValidationResult
```

#### Validation Rules

| Rule                   | Error Message                                        |
| ---------------------- | ---------------------------------------------------- | ---- |
| Minimum 8 characters   | "Password must be at least 8 characters"             |
| At least one uppercase | "Password must contain an uppercase letter"          |
| At least one number    | "Password must contain a number"                     |
| At least one symbol    | "Password must contain a symbol (!@#$%^&\*(),.?\":{} | <>)" |

#### Scenario: Valid strong password

- GIVEN a password "SecurePass123!"
- WHEN `validateStrongPassword` is called
- THEN the result MUST be `{ valid: true }`

#### Scenario: Too short

- GIVEN a password "Pass1!"
- WHEN `validateStrongPassword` is called
- THEN the result MUST be `{ valid: false, message: "Password must be at least 8 characters" }`

#### Scenario: Missing uppercase

- GIVEN a password "securepass123!"
- WHEN `validateStrongPassword` is called
- THEN the result MUST be `{ valid: false, message: "Password must contain an uppercase letter" }`

#### Scenario: Missing number

- GIVEN a password "SecurePassword!"
- WHEN `validateStrongPassword` is called
- THEN the result MUST be `{ valid: false, message: "Password must contain a number" }`

#### Scenario: Missing symbol

- GIVEN a password "SecurePass123"
- WHEN `validateStrongPassword` is called
- THEN the result MUST be `{ valid: false, message: "Password must contain a symbol" }`

---

## Files to Create/Modify

| File                                           | Action | Purpose                          |
| ---------------------------------------------- | ------ | -------------------------------- |
| `src/features/auth/hooks/useForgotPassword.ts` | Create | Request password reset hook      |
| `src/features/auth/hooks/useResetPassword.ts`  | Create | Complete password reset hook     |
| `src/features/auth/hooks/useRegister.ts`       | Modify | Add password strength validation |
| `src/features/auth/hooks/useAcceptInvite.ts`   | Modify | Add password strength validation |
| `src/features/auth/lib/password-validation.ts` | Create | Password validation utility      |

---

## Dependencies

- `@tanstack/react-query` for mutation state management
- `src/lib/edge-function.ts` for `invokeFunction` helper
- Zod schemas for validation (reused from frontend)
