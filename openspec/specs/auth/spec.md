# Auth — Spec

## Overview

The auth feature provides email/password login via Supabase Auth, persists a short-lived JWT session in `localStorage`, and exposes an `AuthContext` that all protected routes consume. Two roles exist: `athlete` (default) and `admin`, stored in `public.profiles.role`. Any route inside the app shell is wrapped by `ProtectedRoute`, which redirects unauthenticated visitors to `/login`.

## Requirements

### REQ-AUTH-01: Login Form

The system MUST provide a login page at `/login` with an email field, a password field, and a submit button. Both fields MUST be required. The form MUST prevent submission while a previous request is in flight.

#### Scenarios

- GIVEN the user navigates to `/login` / WHEN the page renders / THEN an email input, a password input, and a "Sign in" button are visible
- GIVEN the user submits the form with an empty email / WHEN the browser validates / THEN the form is not submitted (HTML `required` constraint)
- GIVEN the user submits the form with an empty password / WHEN the browser validates / THEN the form is not submitted (HTML `required` constraint)
- GIVEN a sign-in request is in flight / WHEN the button is rendered / THEN it is disabled and shows "Signing in…"
- GIVEN a successful sign-in / WHEN `supabase.auth.signInWithPassword` resolves without error / THEN the user is navigated to `/workouts`
- GIVEN invalid credentials / WHEN `supabase.auth.signInWithPassword` returns an error / THEN an inline message "Invalid email or password" is shown with `role="alert"`
- GIVEN the user retries after a failed login / WHEN they submit again / THEN the previous error message is cleared before the new request is sent

### REQ-AUTH-02: Session Persistence

The system MUST restore the session on page load without requiring the user to log in again. The session MUST be managed by `@supabase/supabase-js`, which stores the JWT and refresh token in `localStorage`.

#### Scenarios

- GIVEN the user has an active session stored in `localStorage` / WHEN they reload the page / THEN `AuthProvider` calls `supabase.auth.getSession()` and restores `session`
- GIVEN the access token has expired but the refresh token is valid / WHEN any `api.ts` call receives a 401 / THEN the client retries once with a refreshed token before propagating the error
- GIVEN the user logs out or the refresh token is expired / WHEN the app loads / THEN `session` is `null` and `isLoading` becomes `false`
- GIVEN `AuthProvider` mounts / WHEN `supabase.auth.onAuthStateChange` fires / THEN `session` state is updated synchronously (no flicker to login)

### REQ-AUTH-03: Auth Context

The system MUST expose `useAuth()` which returns `{ session, user, role, isLoading }`. `role` MUST be derived from `user.user_metadata.role` and typed as `'athlete' | 'admin' | null`.

#### Scenarios

- GIVEN an authenticated user with role `admin` / WHEN `useAuth()` is called / THEN `role` equals `'admin'`
- GIVEN an authenticated user with no role metadata / WHEN `useAuth()` is called / THEN `role` is `null`
- GIVEN `AuthProvider` is still resolving the session / WHEN `useAuth()` is called / THEN `isLoading` is `true` and `user` is `null`
- GIVEN the session resolves / WHEN `isLoading` becomes `false` / THEN `user` is either a Supabase `User` object or `null`

### REQ-AUTH-04: Protected Routes

The system MUST prevent unauthenticated users from accessing any route inside the app shell. While auth state is loading, a spinner MUST be shown. Authenticated users MUST see the requested route.

#### Scenarios

- GIVEN an unauthenticated user navigates to `/workouts` / WHEN `ProtectedRoute` renders with `session = null` and `isLoading = false` / THEN they are redirected to `/login` (replace navigation)
- GIVEN an authenticated user navigates to `/workouts` / WHEN `ProtectedRoute` renders with a valid session / THEN the protected content renders
- GIVEN `isLoading` is `true` / WHEN `ProtectedRoute` renders / THEN neither the protected content nor the login page is shown — a spinner (`animate-spin`) is rendered
- GIVEN the root path `/` is accessed / WHEN the user is authenticated / THEN they are redirected to `/workouts` via `<Navigate replace>`

### REQ-AUTH-05: Role-Based Access Control

The system MUST gate write operations on the exercises catalog to `admin` role users. Athlete-role users MUST have read-only access to the catalog. All JWT validation for write operations MUST occur server-side in the Edge Function, not in the SPA.

#### Scenarios

- GIVEN a user with role `athlete` calls `POST /exercises` / WHEN the `exercises` Edge Function processes the request / THEN it returns `403 FORBIDDEN`
- GIVEN a user with role `admin` calls `POST /exercises` / WHEN the Edge Function processes the request / THEN the exercise is created and `201` is returned
- GIVEN a user with role `athlete` calls `GET /exercises` / WHEN the Edge Function processes the request / THEN it returns `200` with the exercise list
- GIVEN a request arrives at any Edge Function without an `Authorization` header / WHEN the function processes it / THEN it returns `401 UNAUTHORIZED`
- GIVEN an expired or invalid JWT is sent / WHEN `supabase.auth.getUser()` returns an error / THEN the Edge Function returns `401`

## Implementation Reference

| Concern                   | Location                                                    |
| ------------------------- | ----------------------------------------------------------- |
| Types                     | `src/features/auth/auth.types.ts`                           |
| Context / Provider        | `src/features/auth/AuthContext.tsx`                         |
| Login page                | `src/features/auth/LoginPage.tsx`                           |
| Protected route guard     | `src/features/auth/ProtectedRoute.tsx`                      |
| Route guard tests         | `src/features/auth/ProtectedRoute.test.tsx`                 |
| Session storage           | Supabase JS client (`localStorage`)                         |
| API token refresh         | `src/lib/api.ts` — `fetchWithAuth` with 401 retry           |
| Role enforcement (server) | `supabase/functions/exercises/index.ts` — `isAdmin()` guard |

## Configuration

| Variable                    | Source           | Purpose                                 |
| --------------------------- | ---------------- | --------------------------------------- |
| `VITE_SUPABASE_URL`         | `.env`           | Supabase project URL                    |
| `VITE_SUPABASE_ANON_KEY`    | `.env`           | Supabase anon key for client            |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase secrets | Used by Edge Functions to validate JWTs |

## Design Decisions

- **Email/password only (MVP):** OAuth providers and magic links are deferred. The login form calls `supabase.auth.signInWithPassword` directly.
- **Role in `user_metadata`:** The `AuthContext` reads `user.user_metadata.role` rather than fetching the `profiles` table on the client. This avoids an extra round-trip but means the role in the SPA may lag behind if changed server-side until the token is refreshed.
- **Server-side role enforcement:** The SPA uses `role` only for UI hints (e.g., showing admin buttons). Actual write authorization is enforced in the `exercises` Edge Function via a `profiles` table lookup, not in the SPA.
- **JWT refresh on 401:** `api.ts` retries once with `supabase.auth.refreshSession()` before propagating a 401. This handles short-lived token expiry transparently.
- **`ProtectedRoute` as layout guard:** `ProtectedRoute` uses `<Outlet>` — all child routes inside the app shell are protected without individually decorating each route.

## Changelog

- **2026-04-12** — Initial spec written from implemented code (reverse-engineered)
