# Delta for admin-create-invite

## ADDED Requirements

### Requirement: Admin Send Invitation via Edge Function

The system MUST allow administrators to send a user invitation by email only. The edge function `create_invite` SHALL validate the authenticated user's admin role before proceeding. The auth method SHALL use `supabaseAdmin.auth.admin.inviteUserByEmail(email, { redirectTo: '{APP_URL}/accept-invite' })` to generate an invitation link and trigger Supabase to send a "You have been invited" email.

The system MUST return `{ success: true }` on success. Supabase handles email delivery.

#### Scenario: Admin sends invitation successfully

- GIVEN an authenticated admin user is on the `CreateUserPage`
- WHEN the admin submits only `{ email: "invitee@example.com" }`
- THEN the system SHALL call `create_invite` edge function
- AND the edge function SHALL validate the request includes a valid admin auth header
- AND the edge function SHALL call `supabaseAdmin.auth.admin.inviteUserByEmail("invitee@example.com", { redirectTo: "{APP_URL}/accept-invite" })`
- AND Supabase SHALL send a "You have been invited" email with a link to `/accept-invite`
- AND the system SHALL return `{ success: true }`

#### Scenario: Invitation already exists for email

- GIVEN an authenticated admin user submits `{ email: "alreadyinvited@example.com" }`
- WHEN `supabaseAdmin.auth.admin.inviteUserByEmail` is called for an email that already has a pending invitation
- THEN the edge function SHALL return `{ error: "INVITE_EXISTS", status: 400 }`

#### Scenario: Missing or invalid auth header

- GIVEN a request is made to `create_invite` without a valid Authorization header
- WHEN the edge function validates the auth header
- THEN the edge function SHALL return `{ error: "UNAUTHORIZED", status: 401 }`

#### Scenario: Non-admin user forbidden

- GIVEN an authenticated user with insufficient privileges submits `{ email: "invitee@example.com" }`
- WHEN the edge function validates the user's admin role
- THEN the edge function SHALL return `{ error: "FORBIDDEN", status: 403 }`