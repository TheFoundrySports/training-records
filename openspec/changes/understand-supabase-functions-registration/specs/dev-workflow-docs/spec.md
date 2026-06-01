# dev-workflow-docs — New Spec

**Change:** understand-supabase-functions-registration
**Date:** 2026-06-01

## Purpose

This is a new specification (no existing spec to delta) documenting the developer workflow for running Supabase Edge Functions locally. It is targeted at new developers joining the project and at existing developers who need to debug EFs.

## Requirements

### REQ-1: supabase/functions/README.md documents the local development workflow

The system **shall** provide a `supabase/functions/README.md` file that a new developer can read to understand how to run and debug Edge Functions locally.

#### Scenario: New developer reads the README on first day
Given a new developer clones the repository
And they have run `supabase start` to start the local Supabase stack
When they read `supabase/functions/README.md`
Then they learn:
- The built-in Edge Runtime on `http://127.0.0.1:54321` automatically serves all functions in `supabase/functions/*/index.ts` — no separate `serve` process is needed for normal development
- To invoke a function locally: `supabase functions invoke <function-name>` (e.g., `supabase functions invoke admin-create-user`)
- To debug a specific function with hot-reload and a custom env file: `supabase functions serve admin-create-user --env-file supabase/functions/.env`
- The rate limit for `email_sent` in `config.toml` is set to `100` per hour — it may need to be raised for intensive local testing
- Captured emails (from Inbucket / Mailpit) can be viewed at `http://127.0.0.1:54324`
- `APP_URL` must be set via `supabase secrets set APP_URL=http://127.0.0.1:5173` for `create_invite` to generate correct invite links