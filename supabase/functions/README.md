# Supabase Edge Functions

This directory contains Supabase Edge Functions written in Deno and served on the built-in Edge Runtime.

## What are Edge Functions?

Edge Functions run on Supabase's built-in Edge Runtime — no separate `serve` process needed. They are invoked from the frontend via `fetch` (bypassing `supabase.functions.invoke` for full response body control) and can also be called locally with the Supabase CLI.

## Development

### Running functions locally

```bash
# Start the full local Supabase stack (includes Edge Runtime)
supabase start

# For hot-reload debugging of a specific function:
supabase functions serve create_invite --env-file supabase/functions/.env

# Invoke a function locally
supabase functions invoke admin-create-user
```

### Environment variables

Functions running under `supabase functions serve` read from `.env` (gitignored — safe for local secrets like `APP_URL=http://127.0.0.1:5173`).

For the built-in Edge Runtime (via `supabase start`), set secrets with:

```bash
supabase secrets set APP_URL=http://127.0.0.1:5173
```

### Inspecting emails

Inbucket captures all outgoing SMTP. Open Mailpit at [http://127.0.0.1:54324](http://127.0.0.1:54324) to see invite emails sent by `create_invite` and notification emails from `admin-create-user`.

## Common Gotchas

- **`@ts-nocheck` on all functions** — Deno global types are not available in editors; suppress with `// @ts-nocheck`
- **`email_sent` rate limit** — Supabase's `inviteUserByEmail` has a rate limit; the `create_invite` function handles this
- **Redirect URL mismatch** — Ensure `APP_URL` matches exactly what Supabase has configured (no trailing slash)
- **`accept-invite` warning** — When no pending invitation is found, the function returns `{ success: true, marked: false, warning: '...' }` — the UI renders this as a non-blocking notice