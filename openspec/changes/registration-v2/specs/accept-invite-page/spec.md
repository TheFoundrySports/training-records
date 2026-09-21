# Delta for accept-invite-page

## ADDED Requirements

### Requirement: User Accepts Invitation and Sets Password

The system MUST allow a user who received an invitation email to accept it by setting their password. When the user lands on `/accept-invite` with a Supabase session token in the URL hash (`#access_token=...`), the page SHALL detect the session via `onAuthStateChange`. The user SHALL enter a password twice for confirmation, and the system SHALL call `supabase.auth.updateUser({ password })` to set the password.

The edge function `accept-invite` SHALL be called as an audit-only step to record that the invitation was accepted.

#### Scenario: User accepts invitation successfully

- GIVEN a user has clicked the invitation link and landed on `/accept-invite`
- AND the URL contains a Supabase session token in the hash (`#access_token=...`)
- WHEN the page loads
- THEN the system SHALL detect the session via `supabase.auth.onAuthStateChange`
- AND the page SHALL display a password entry form with two fields: password and confirm password
- AND the user submits `{ password: "NewStrongPass123!" }` in both fields
- THEN the system SHALL call `supabase.auth.updateUser({ password: "NewStrongPass123!" })`
- AND the edge function `accept-invite` SHALL be called for audit purposes
- AND the user SHALL be able to log in with `newuser@example.com` and `NewStrongPass123!`

#### Scenario: Passwords do not match

- GIVEN a user is on the `AcceptInvitePage` after clicking an invitation link
- WHEN the user enters `Password123!` in the password field and `DifferentPass123!` in the confirm password field
- THEN the system SHALL display a validation error indicating the passwords do not match
- AND the system SHALL NOT call `supabase.auth.updateUser`

#### Scenario: Invalid or expired session

- GIVEN a user lands on `/accept-invite` with an invalid or expired session token in the hash
- WHEN the page attempts to detect the session via `onAuthStateChange`
- THEN the system SHALL display an error indicating the invitation link is invalid or expired
- AND the system SHALL NOT proceed to password entry

#### Scenario: Weak password rejected

- GIVEN a user is on the `AcceptInvitePage` with a valid session
- WHEN the user enters a password that does not meet Supabase strength requirements (e.g., "weak")
- THEN the system SHALL display a validation error indicating the password is too weak
- AND the system SHALL NOT call `supabase.auth.updateUser`

#### Scenario: Audit call fails gracefully

- GIVEN a user has successfully set their password via `supabase.auth.updateUser`
- WHEN the `accept-invite` edge function is called for audit purposes
- AND the edge function returns an error or times out
- THEN the system SHALL still allow the user to proceed and log in
- AND the audit failure SHALL NOT block user registration