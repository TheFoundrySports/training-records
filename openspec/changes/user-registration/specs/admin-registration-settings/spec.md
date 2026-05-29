# Delta for admin-registration-settings

## ADDED Requirements

### Requirement: Registration Mode Toggle

The system MUST provide an admin-only interface to view and update `app_settings.registration_mode`.

The interface MUST display the current mode as a toggle switch with options `Open` and `Invite-only`.

#### Scenario: Admin changes mode to invite-only

- GIVEN the authenticated user has `role = admin`
- WHEN the admin toggles the registration mode from `Open` to `Invite-only`
- THEN the system calls `registration-settings` Edge Function with `{ registration_mode: "invite_only" }`
- AND the `app_settings` row is updated
- AND the UI reflects the new mode immediately
- AND a success toast "Registration mode updated to invite-only" is shown

#### Scenario: Admin changes mode to open

- GIVEN the authenticated user has `role = admin`
- WHEN the admin toggles the registration mode from `Invite-only` to `Open`
- THEN the system updates `app_settings.registration_mode` to `open`
- AND a success toast "Registration mode updated to open" is shown

### Requirement: Invitation List View

The system MUST display a table of all invitations with columns: Email, Status, Invited By, Created At, Expires At, Actions.

Status values MUST be: `pending`, `accepted`, `revoked`.

#### Scenario: Admin views invitation list

- GIVEN the authenticated user has `role = admin`
- WHEN the admin navigates to `/admin/registration-settings`
- THEN the system displays the invitation list sorted by `created_at` descending
- AND each row shows: email, status badge (color-coded), inviter name, created date, expiry date

#### Scenario: Empty invitation list

- GIVEN no invitations exist
- WHEN the admin views the invitation list
- THEN the system displays "No invitations yet" with a prompt to create one

### Requirement: Resend Invite Action

An admin MAY resend an invitation email if the invitation `status = pending` AND `expires_at > now()`.

The resend action MUST call `create-invite` Edge Function with the existing email, generating a new token and sending a new email.

#### Scenario: Resend invite for pending invitation

- GIVEN a pending invitation for `user@example.com` that has not expired
- WHEN the admin clicks "Resend" on that invitation row
- THEN the system creates a new `invitations` record with a fresh UUID token
- AND the old invitation is marked `revoked` (or kept pending — design choice: keep old one pending, create new)
- AND the Edge Function sends a new email with the new `/accept-invite?token=<new-uuid>` link
- AND a success toast "Invitation resent to user@example.com" is shown

### Requirement: Revoke Invite Action

An admin MAY revoke an invitation if `status = pending`.

Revoking MUST set `status = revoked` on the invitation record.

#### Scenario: Revoke pending invitation

- GIVEN a pending invitation for `user@example.com`
- WHEN the admin clicks "Revoke" on that invitation row
- THEN the system updates `invitations.status` to `revoked`
- AND the invitation can no longer be used
- AND a success toast "Invitation revoked for user@example.com" is shown

#### Scenario: Revoke button hidden for non-pending invitations

- GIVEN an invitation with `status = accepted` or `revoked`
- THEN the "Revoke" button is NOT displayed for that row

### Requirement: Revoke User Access (Ban)

An admin MAY revoke a registered user's access by calling the `revoke-user` Edge Function with the user's `auth.users.id`.

The system MUST mark the user as banned — future requests from that user MUST receive HTTP 401.

#### Scenario: Admin revokes user access

- GIVEN a registered user with `auth.users.id = <uuid>`
- WHEN the admin clicks "Revoke Access" on the user's row in UserManagementPage
- THEN the system calls `revoke-user` Edge Function with `{ user_id: "<uuid>" }`
- AND the Edge Function calls `supabase.auth.admin.updateUserById(id, { user_metadata: { banned: true } })`
- AND the user record remains (data preserved)
- AND subsequent requests from that user return HTTP 401

#### Scenario: Banned user attempts to access protected route

- GIVEN a user was previously banned via `revoke-user`
- WHEN that user attempts to access any protected route
- THEN the system returns HTTP 401 Unauthorized
- AND the user is redirected to `/login?reason=banned`