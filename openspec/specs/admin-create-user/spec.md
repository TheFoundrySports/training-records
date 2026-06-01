# admin-create-user — Delta Spec

**Change:** understand-supabase-functions-registration
**Date:** 2026-06-01

## Purpose

The `admin-create-user` Edge Function creates a user account directly from the Admin UI. This delta changes the function to create a fully-usable user immediately (`email_confirm: true`) and send a custom notification email instead of the Supabase "Confirm signup" email.

## Requirements

### REQ-1: Creates a user that can log in immediately

The system **shall** create the user with `email_confirm: true` so that `email_confirmed_at` is set at creation time and the user can sign in without clicking an email confirmation link.

#### Scenario: Valid submission creates an immediately usable account
Given the caller is authenticated as an admin (`profiles.role = 'admin'`)
And the submitted email is `newuser@example.com` with a password of 8+ characters
When the admin submits the Create User form
Then the Edge Function calls `admin.createUser({ email: 'newuser@example.com', password: '<redacted>', email_confirm: true })`
And the response is `{ success: true, user_id: '<uuid>' }`
And the created user has `email_confirmed_at` set to a recent timestamp
And no "Confirm signup" email is sent by Supabase Auth

#### Scenario: Email already exists returns a human-readable error
Given the caller is authenticated as an admin
And the submitted email is already registered in `auth.users`
When the admin submits the Create User form
Then the Edge Function returns `409` with `{ error: { code: 'EMAIL_ALREADY_EXISTS', message: 'A user with this email already exists' } }`
And the human-readable `message` is surfaced to the admin (not a generic SDK error)

### REQ-2: Sends a custom notification email after creation

The system **shall** dispatch a notification email to the new user stating their account was created. This email **must not** contain a verify/confirm link — it is a courtesy notice, not a confirmation request.

#### Scenario: Creation succeeded triggers notification email dispatch
Given the user was created successfully with `email_confirm: true`
When the Edge Function receives a success response from `createUser`
Then a notification email is dispatched to the new user's email address
And the email body states the account was created by an administrator
And the email contains no verify/confirm link or action URL

#### Scenario: Email dispatch failure does not block user creation
Given the user was created successfully
But the email sending service (Supabase Auth / Mailpit) is unreachable or rate-limited
Then the Edge Function returns `200` with `{ success: true, user_id: '<uuid>', notification_sent: false }`
And the user is still created and can log in

### REQ-3: Rejects non-admin callers

The system **shall** return `403` with `FORBIDDEN: Admin only` when the caller is authenticated but `profiles.role` is not `'admin'`.

#### Scenario: Non-admin caller is rejected
Given the caller holds a valid JWT but `profiles.role` is `'user'`
When the caller invokes `admin-create-user`
Then the Edge Function returns `403` with `{ error: { code: 'FORBIDDEN', message: 'Admin only' } }`
And no user record is created

### REQ-4: Validates required input

The system **shall** return `400` for missing or weak input fields.

#### Scenario: Empty email is rejected
Given the caller is an admin
But the `email` field is empty or omitted
When the admin submits the Create User form
Then the Edge Function returns `400` with `{ error: { code: 'BAD_REQUEST', message: 'email is required' } }`

#### Scenario: Password shorter than 8 characters is rejected
Given the caller is an admin
But the `password` field has fewer than 8 characters
When the admin submits the Create User form
Then the Edge Function returns `400` with `{ error: { code: 'WEAK_PASSWORD', message: 'Password must be at least 8 characters' } }`