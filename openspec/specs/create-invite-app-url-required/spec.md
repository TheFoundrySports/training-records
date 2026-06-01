# create-invite-app-url-required — Delta Spec

**Change:** understand-supabase-functions-registration
**Date:** 2026-06-01

## Purpose

The `create_invite` Edge Function sends an invitation email via Supabase Auth's `inviteUserByEmail`, setting the `redirectTo` to the application's invite acceptance URL. This delta removes the hardcoded `localhost:5173` fallback and instead requires `APP_URL` to be set as an environment variable, failing immediately with a descriptive error if it is absent.

## Requirements

### REQ-1: Uses `APP_URL` from the environment to build the invite link

The system **shall** read `APP_URL` from `Deno.env.get('APP_URL')` and use it as the base for the `redirectTo` parameter in `inviteUserByEmail`.

#### Scenario: APP_URL is set to the local dev URL
Given `APP_URL` is set to `"http://127.0.0.1:5173"` in the Edge Runtime environment
When the Edge Function calls `inviteUserByEmail`
Then `redirectTo` is `"http://127.0.0.1:5173/accept-invite"`
And the generated invite link in the email points to that URL

#### Scenario: APP_URL is set to a production URL
Given `APP_URL` is set to `"https://training.example.com"` in the Edge Runtime environment
When the Edge Function calls `inviteUserByEmail`
Then `redirectTo` is `"https://training.example.com/accept-invite"`
And no `localhost` or fallback URL appears in the invite link

### REQ-2: Fails fast when APP_URL is not set

The system **shall** return `500` with `MISSING_APP_URL` before calling `inviteUserByEmail` when `APP_URL` is missing or empty — so no email is sent with a broken redirect URL.

#### Scenario: APP_URL env var is missing — function returns error immediately
Given `APP_URL` is not set (or is an empty string) in the Edge Runtime environment
When the Edge Function is invoked
Then the function returns `500` with `{ error: { code: 'MISSING_APP_URL', message: 'APP_URL environment variable is required' } }`
And `inviteUserByEmail` is **not** called
And no invitation email is dispatched

### REQ-3: Existing behaviour preserved

The system **shall** preserve all other behaviour of `create_invite`:

- Returns `403` with `FORBIDDEN: Admin only` if caller is not admin
- Returns `409` with `EMAIL_ALREADY_EXISTS` if a user with that email already exists in `auth.users`
- Returns `400` with `INVITE_EXISTS` if a pending invitation already exists for that email in `invitations`
- Writes an audit row to `invitations` with `email`, `token`, `status: 'pending'`, `invited_by`, and `expires_at`

#### Scenario: Non-admin caller is rejected
Given the caller holds a valid JWT but `profiles.role` is not `'admin'`
When the caller invokes `create_invite`
Then the response is `403` with `{ error: { code: 'FORBIDDEN', message: 'Admin only' } }`

#### Scenario: Email already exists returns conflict
Given the caller is an admin
But the email `existing@example.com` is already registered in `auth.users`
When the caller invokes `create_invite`
Then the response is `409` with `{ error: { code: 'EMAIL_ALREADY_EXISTS', message: 'A user with this email already exists' } }`

#### Scenario: Pending invitation already exists
Given the caller is an admin
And a pending invitation already exists for `invited@example.com` in `invitations`
When the caller invokes `create_invite`
Then the response is `400` with `{ error: { code: 'INVITE_EXISTS', message: 'A pending invitation already exists for this email' } }`