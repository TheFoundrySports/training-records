# Delta for accept-invite

## ADDED Requirements

### Requirement: Accept Invite Page Access

The system MUST provide a public route `/accept-invite?token=<uuid>` accessible without authentication.

The page MUST validate the token on load before displaying any form.

#### Scenario: Valid token — password form displayed

- GIVEN a valid invitation record exists with `status = pending` and `expires_at > now()`
- WHEN a visitor loads `/accept-invite?token=<valid-uuid>`
- THEN the system displays the set-password form
- AND no error message is shown

#### Scenario: Expired token — error state, no form

- GIVEN an invitation record exists with `expires_at <= now()`
- WHEN a visitor loads `/accept-invite?token=<expired-uuid>`
- THEN the system displays "This invitation link has expired. Please contact your administrator for a new invitation."
- AND no form is displayed
- AND a link to contact admin is provided

#### Scenario: Already accepted token — error state, no form

- GIVEN an invitation record exists with `status = accepted`
- WHEN a visitor loads `/accept-invite?token=<used-uuid>`
- THEN the system displays "This invitation has already been used. Please contact your administrator for a new invitation."
- AND no form is displayed

#### Scenario: Revoked token — error state, no form

- GIVEN an invitation record exists with `status = revoked`
- WHEN a visitor loads `/accept-invite?token=<revoked-uuid>`
- THEN the system displays "This invitation has been revoked. Please contact your administrator for a new invitation."
- AND no form is displayed

#### Scenario: Token not found — error state

- GIVEN no invitation record exists for the given token
- WHEN a visitor loads `/accept-invite?token=<unknown-uuid>`
- THEN the system displays "Invalid invitation link. Please check the link or contact your administrator."
- AND no form is displayed

### Requirement: Set Password Form

The system MUST present a form with: password (minimum 8 characters), password confirmation (must match).

The submit button MUST be disabled until both fields are valid.

#### Scenario: Valid password submission — account created

- GIVEN a valid pending invitation for `user@example.com`
- WHEN the visitor submits the form with password `SecurePass123` and matching confirmation
- THEN the system creates `auth.users` with `email = user@example.com` and `user_metadata.role = 'athlete'`
- AND marks the invitation `status = accepted` with `used_at = now()`
- AND the `handle_new_user` trigger fires, creating a profile record
- AND the visitor is redirected to `/login` with a success message "Account created. Please log in."

#### Scenario: Password too short

- GIVEN a valid pending invitation
- WHEN the visitor submits with password `short`
- THEN the form displays "Password must be at least 8 characters"
- AND no account is created
- AND the invitation remains `pending`

#### Scenario: Passwords do not match

- GIVEN a valid pending invitation
- WHEN the visitor submits with password `SecurePass123` and confirmation `DifferentPass456`
- THEN the form displays "Passwords do not match"
- AND no account is created
- AND the invitation remains `pending`

### Requirement: Post-Submit Redirect

On successful account creation, the system MUST redirect the visitor to `/login` with a query param `?registered=true` to display an appropriate success message.

#### Scenario: Successful invite acceptance redirects to login

- GIVEN a valid pending invitation
- WHEN the visitor successfully submits the set-password form
- THEN the visitor is redirected to `/login?registered=true`
- AND the login page displays "Your account has been created. Please sign in."