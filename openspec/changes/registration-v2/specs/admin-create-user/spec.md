# Delta for admin-create-user

## ADDED Requirements

### Requirement: Admin Create User via Edge Function

The system MUST allow administrators to create a user account by providing an email address and initial password. The edge function `admin-create-user` SHALL validate the authenticated user's admin role before proceeding. The auth method SHALL use `supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: false })` to create the user and send a "Confirm signup" email.

The system MUST return `{ success: true, user_id: string }` on success.

#### Scenario: Admin creates user successfully

- GIVEN an authenticated admin user is on the `CreateUserPage`
- WHEN the admin submits `{ email: "newuser@example.com", password: "StrongPass123!" }`
- THEN the system SHALL call `admin-create-user` edge function
- AND the edge function SHALL validate the request includes a valid admin auth header
- AND the edge function SHALL call `supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: false })`
- AND Supabase SHALL send a "Confirm signup" email to `newuser@example.com`
- AND the system SHALL return `{ success: true, user_id: "{supabase-user-id}" }`

#### Scenario: Email already exists

- GIVEN an authenticated admin user submits `{ email: "existing@example.com", password: "StrongPass123!" }`
- WHEN `supabaseAdmin.auth.admin.createUser` is called with an email that already exists in the system
- THEN the edge function SHALL return `{ error: "EMAIL_ALREADY_EXISTS", status: 409 }`

#### Scenario: Weak password rejected

- GIVEN an authenticated admin user submits `{ email: "newuser@example.com", password: "weak" }`
- WHEN `supabaseAdmin.auth.admin.createUser` is called with a password that does not meet Supabase strength requirements
- THEN the edge function SHALL return `{ error: "WEAK_PASSWORD", status: 400 }`

#### Scenario: Missing or invalid auth header

- GIVEN a request is made to `admin-create-user` without a valid Authorization header
- WHEN the edge function validates the auth header
- THEN the edge function SHALL return `{ error: "UNAUTHORIZED", status: 401 }`

#### Scenario: Non-admin user forbidden

- GIVEN an authenticated user with insufficient privileges submits `{ email: "newuser@example.com", password: "StrongPass123!" }`
- WHEN the edge function validates the user's admin role
- THEN the edge function SHALL return `{ error: "FORBIDDEN", status: 403 }`