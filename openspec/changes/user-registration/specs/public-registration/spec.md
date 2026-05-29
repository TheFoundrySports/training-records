# Delta for public-registration

## ADDED Requirements

### Requirement: Open Registration Mode

The system MUST allow any visitor to register an account using a valid email address and a password meeting minimum security requirements when `app_settings.registration_mode` is `open`.

The registration form MUST collect: email (required, valid format), password (required, minimum 8 characters), password confirmation (required, must match password).

On successful registration, the system MUST create a `auth.users` record with `role=athlete` in `user_metadata` and invoke the `handle_new_user` trigger to create a corresponding profile.

#### Scenario: Happy path — open registration succeeds

- GIVEN `app_settings.registration_mode` is `open`
- WHEN a visitor submits the registration form with valid email `newuser@example.com`, password `SecurePass123`, and matching confirmation
- THEN the system creates `auth.users` with `email = newuser@example.com` and `user_metadata.role = 'athlete'`
- AND the `handle_new_user` trigger fires, creating a profile record
- AND the visitor receives a session JWT

#### Scenario: Open mode — invalid email format

- GIVEN `app_settings.registration_mode` is `open`
- WHEN a visitor submits the registration form with email `not-an-email`
- THEN the form displays a validation error "Please enter a valid email address"
- AND no account is created

#### Scenario: Open mode — password too short

- GIVEN `app_settings.registration_mode` is `open`
- WHEN a visitor submits the registration form with password `short`
- THEN the form displays a validation error "Password must be at least 8 characters"
- AND no account is created

#### Scenario: Open mode — passwords do not match

- GIVEN `app_settings.registration_mode` is `open`
- WHEN a visitor submits the registration form with password `SecurePass123` and confirmation `DifferentPass456`
- THEN the form displays a validation error "Passwords do not match"
- AND no account is created

### Requirement: Invite-Only Registration Mode

The system MUST reject registration attempts when `app_settings.registration_mode` is `invite_only`, returning a user-friendly error that the current mode requires an invitation.

#### Scenario: Invite-only mode — registration blocked

- GIVEN `app_settings.registration_mode` is `invite_only`
- WHEN a visitor attempts to access `/register`
- THEN the system displays an error message "Registration is currently by invitation only. Please contact your administrator."
- AND the registration form is disabled or hidden

### Requirement: Token Validation on Page Load

When the registration page loads with a query parameter `?token=<uuid>`, the system MUST validate the token against the `invitations` table before displaying the registration form.

#### Scenario: Valid invite token — form enabled

- GIVEN `app_settings.registration_mode` is `invite_only`
- WHEN a visitor loads `/register?token=<valid-uuid>`
- THEN the system validates the token exists, status is `pending`, and `expires_at` has not passed
- AND the registration form is displayed and enabled

#### Scenario: Expired token — form disabled with error

- GIVEN a visitor loads `/register?token=<expired-uuid>`
- THEN the system displays "This invitation link has expired. Please contact your administrator for a new invitation."
- AND the registration form is disabled

#### Scenario: Used token — form disabled with error

- GIVEN a visitor loads `/register?token=<already-used-uuid>`
- THEN the system displays "This invitation has already been used. Please contact your administrator for a new invitation."
- AND the registration form is disabled

#### Scenario: Invalid token format — form disabled with error

- GIVEN a visitor loads `/register?token=<not-a-uuid>`
- THEN the system displays "Invalid invitation link. Please check the link or contact your administrator."
- AND the registration form is disabled