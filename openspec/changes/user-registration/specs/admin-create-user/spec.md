# Delta for admin-create-user

## ADDED Requirements

### Requirement: Admin Create User Form

The system MUST provide an admin-only page at `/admin/create-user` containing a form with the following fields: email address (required, valid format).

The form MUST offer two creation modes:
1. "Create with temporary password" — generates and displays a password for the admin to share manually
2. "Send invitation email" — triggers an email to the user with an invite link

The admin MUST select one mode before submission.

#### Scenario: Admin creates user with temp password

- GIVEN the authenticated user has `role = admin`
- WHEN the admin selects "Create with temporary password" and submits with email `newuser@example.com`
- THEN the system calls `register-user` Edge Function with `{ email, mode: "temp_password" }`
- AND the Edge Function creates `auth.users` with `email = newuser@example.com`, `user_metadata.role = 'athlete'`
- AND the Edge Function returns a temporary password `TempPassXYZ` (min 12 chars)
- AND the system displays "User created successfully" with the temporary password for the admin to copy
- AND the form resets

#### Scenario: Admin sends invite email

- GIVEN the authenticated user has `role = admin`
- WHEN the admin selects "Send invitation email" and submits with email `invited@example.com`
- THEN the system calls `create-invite` Edge Function with `{ email }`
- AND the Edge Function creates an `invitations` record with `status = pending`, `expires_at = now() + 48h`
- AND the Edge Function sends an email via SMTP to `invited@example.com` with link `/accept-invite?token=<uuid>`
- AND the system displays "Invitation sent to invited@example.com"
- AND the form resets

#### Scenario: Non-admin accessing create user page

- GIVEN the authenticated user has `role = athlete`
- WHEN the user navigates to `/admin/create-user`
- THEN the system returns a 403 Forbidden response
- OR redirects to an unauthorized page

#### Scenario: Invalid email format

- GIVEN an admin is on the create user form
- WHEN the admin submits with email `not-an-email`
- THEN the form displays "Please enter a valid email address"
- AND no user is created
- AND no API call is made

### Requirement: Edge Function Validation

The `register-user` and `create-invite` Edge Functions MUST validate that the caller has `role = admin` before performing any action.

Any request without a valid admin session MUST be rejected with HTTP 401.

#### Scenario: Unauthenticated request to register-user

- GIVEN no valid session token is provided
- WHEN a request is made to `register-user` Edge Function
- THEN the function returns HTTP 401 with `{ error: "Unauthorized" }`
- AND no user is created