---
name: auth-security-improvements
description: Email verification, self-service password reset, and stronger password requirements
change: auth-security-improvements
status: draft
---

# Auth Security Improvements Specification

**Change**: auth-security-improvements  
**Domains**: `edge-functions`, `password-strength-meter`, `password-reset-hooks`, `password-reset-pages`  
**Status**: Draft

---

## Overview

Enable email verification, self-service password reset, and stronger password requirements.

### Context

Currently, `enable_confirmations = false` and no SMTP is configured. Password validation is 8 characters only with no complexity rules. The system needs:

- Email verification (user-requested flow via external API)
- Self-service password reset (forgot → email link → set password)
- Strong password enforcement (8+ chars, uppercase, number, symbol)
- Visual password strength meter

### User Decisions

- Use external email API (Resend) instead of built-in SMTP
- Self-service password reset (not admin-initiated)
- Strong password policy
- Password meter UI

---

## Domains

This change introduces specifications for the following domains:

| Domain                    | File                                    |
| ------------------------- | --------------------------------------- |
| `edge-functions`          | `specs/edge-functions/spec.md`          |
| `password-strength-meter` | `specs/password-strength-meter/spec.md` |
| `password-reset-hooks`    | `specs/password-reset-hooks/spec.md`    |
| `password-reset-pages`    | `specs/password-reset-pages/spec.md`    |

---

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

---

## Success Criteria

- [ ] User can request password reset and receive email (with Resend API)
- [ ] User can set new password via reset link
- [ ] Password strength meter shows real-time feedback
- [ ] Weak passwords rejected at frontend and backend
- [ ] All edge functions return consistent error format
- [ ] Login page has "Forgot password?" link
- [ ] No regressions in existing registration/invite flows
