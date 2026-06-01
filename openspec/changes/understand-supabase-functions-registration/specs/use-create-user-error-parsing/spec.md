# use-create-user-error-parsing — Delta Spec

**Change:** understand-supabase-functions-registration
**Date:** 2026-06-01

## Purpose

The `useCreateUser` React hook calls the `admin-create-user` Edge Function. This delta fixes the hook to parse the structured error response body (`{ error: { code, message } }`) instead of relying on fragile regex extraction from the generic SDK error message wrapper.

## Requirements

### REQ-1: Surfaces the human-readable error message from the EF response body

The system **shall** parse the Edge Function response body's `error.message` field and expose it as the hook's `error` state when the EF returns a non-2xx status.

#### Scenario: EF returns a structured error body — hook exposes the message
Given the `admin-create-user` Edge Function returns `409` with body:
```json
{ "error": { "code": "EMAIL_ALREADY_EXISTS", "message": "A user with this email already exists" } }
```
When the `useCreateUser` mutation is invoked
Then the hook's `error` state equals `"A user with this email already exists"` (or `"EMAIL_ALREADY_EXISTS: A user with this email already exists"`)
And the admin sees the human-readable message in the UI

#### Scenario: EF returns success — hook has no error
Given the `admin-create-user` Edge Function returns `200` with `{ success: true, user_id: '...' }`
When the `useCreateUser` mutation resolves
Then the hook's `error` state is `null`
And the hook's `userId` field is set to the returned user ID

### REQ-2: Preserves the existing loading and success state machine

The system **shall** set `isLoading` to `true` during the mutation request and `isSuccess` to `true` after a successful response.

#### Scenario: Loading state during request
Given the admin has submitted the Create User form
When `useCreateUser.mutateAsync(...)` is called
Then `isLoading` is `true` while the Edge Function request is in-flight

#### Scenario: Success state after successful creation
Given `useCreateUser.mutateAsync(...)` resolved with `{ success: true, user_id: '...' }`
When the promise settles
Then `isSuccess` is `true` and `error` is `null`