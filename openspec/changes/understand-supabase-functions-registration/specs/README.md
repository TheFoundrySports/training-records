# Specs Index — understand-supabase-functions-registration

**Change:** understand-supabase-functions-registration
**Date:** 2026-06-01

This change introduces 5 delta/new specs covering Edge Function corrections and developer documentation.

| # | Capability | Type | Spec File |
|---|------------|------|-----------|
| 1 | `admin-create-user` — switch to `email_confirm: true` + notification email | Delta | [specs/admin-create-user/spec.md](./admin-create-user/spec.md) |
| 2 | `useCreateUser` hook — parse `{ error: { code, message } }` from EF body | Delta | [specs/use-create-user-error-parsing/spec.md](./use-create-user-error-parsing/spec.md) |
| 3 | `accept-invite` EF — return `warning` when no pending invitation found | Delta | [specs/accept-invite-warning/spec.md](./accept-invite-warning/spec.md) |
| 4 | `create_invite` EF — fail fast with `MISSING_APP_URL` when env var absent | Delta | [specs/create-invite-app-url-required/spec.md](./create-invite-app-url-required/spec.md) |
| 5 | Dev workflow — document local EF development in `supabase/functions/README.md` | New | [specs/dev-workflow-docs/spec.md](./dev-workflow-docs/spec.md) |

## Requirements Count by Capability

| Capability | Reqs | Scenarios |
|------------|------|-----------|
| `admin-create-user` | 4 | 7 |
| `use-create-user-error-parsing` | 2 | 4 |
| `accept-invite-warning` | 3 | 4 |
| `create-invite-app-url-required` | 3 | 6 |
| `dev-workflow-docs` | 1 | 1 |
| **Total** | **13** | **22** |

## Coverage Summary

- Happy paths: covered (all 5 capabilities)
- Edge cases: covered (email exists, no invitation found, APP_URL missing, non-admin callers)
- Error states: covered (bad request, weak password, dispatch failure, auth failures)

## Next Phase

Ready for **sdd-design** to define the technical approach for each spec.