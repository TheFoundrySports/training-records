# accept-invite-warning — Delta Spec

**Change:** understand-supabase-functions-registration
**Date:** 2026-06-01

## Purpose

The `accept-invite` Edge Function is called by the Admin UI after a user accepts an invitation and sets their password via `updateUser`. Its purpose is to mark the invitation as accepted (audit only). This delta changes the function to return a `warning` field when no matching pending invitation is found, instead of silently returning `{ marked: false }`.

## Requirements

### REQ-1: Marks the invitation as accepted when a matching pending invitation is found

The system **shall** update `invitations.status` to `'accepted'` and return `success: true` when the caller has a valid session and a pending invitation row exists for their email.

#### Scenario: Valid pending invitation is found and marked accepted
Given the caller is authenticated (valid JWT via invite link session)
And the `invitations` table contains a row with `email` matching the auth user's email
And that row has `status = 'pending'`
When the caller invokes `accept-invite`
Then `invitations.status` is updated to `'accepted'` for that row
And the response is `{ success: true, invitation_id: '<uuid>' }`

### REQ-2: Returns a warning when no matching pending invitation is found

The system **shall** return `success: true` with a `warning` field (not an error) when no pending invitation exists — allowing the user to continue even if their invitation was already accepted, expired, or never created.

#### Scenario: No pending invitation found — warning returned, user allowed to proceed
Given the caller is authenticated
But no `invitations` row with `status = 'pending'` exists for the caller's email
When the caller invokes `accept-invite`
Then the response is `{ success: true, warning: 'No pending invitation found for this session' }`
And the `warning` key is present at the top level of the response object (not nested under `error`)
And the user is not blocked — they may continue setting their password

### REQ-3: Rejects unauthenticated callers

The system **shall** return `401` with `UNAUTHORIZED: Missing auth token` when no Authorization header is present.

#### Scenario: No auth token provided
Given the caller invokes `accept-invite` with no `Authorization` header
When the Edge Function is invoked
Then the response is `401` with `{ error: { code: 'UNAUTHORIZED', message: 'Missing auth token' } }`
And no invitation record is modified