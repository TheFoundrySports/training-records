# RLS Verification

Row Level Security (RLS) is enabled on all user-owned tables. This document describes the policies in place and how to verify them manually.

## Tables with RLS enabled

| Table | Policies |
|-------|----------|
| `public.profiles` | Owner read/write (`id = auth.uid()`) |
| `public.workouts` | Athlete own rows; Admin read-all |

## Policies

### `public.workouts`

```sql
-- Athletes see and modify only their own rows
create policy "athlete_own_rows" on public.workouts
  for all using (auth.uid() = user_id);

-- Admins can read all rows (no write bypass)
create policy "admin_read_all" on public.workouts
  for select using (
    (select role from public.profiles where id = auth.uid()) = 'admin'
  );
```

### `public.profiles`

```sql
-- Users can read and update their own profile
create policy "profile_owner" on public.profiles
  for all using (id = auth.uid());
```

## Manual verification steps

### 1. Athlete isolation

Sign in as `athlete1@example.com` and verify that:

- `GET /workouts` returns only workouts belonging to athlete1.
- `GET /workouts/:id` for a workout owned by athlete2 returns a 404 or empty result.
- `DELETE /workouts/:id` for athlete2's workout is rejected.

Sign in as `athlete2@example.com` and repeat the symmetric checks.

### 2. Admin read-all

Sign in as `admin@example.com` and verify that:

- `GET /workouts` returns workouts from all users.
- `DELETE /workouts/:id` for another user's workout is rejected (admin cannot write).

### 3. Unauthenticated access

Without a valid JWT, all requests to `/workouts` must return `401 Unauthorized`.

## Running against local Supabase

```bash
# Start local Supabase
npx supabase start

# Seed the database
npx supabase db reset

# Run the app
npm run dev
```

Seed credentials (password: `Password123!`):

| Email | Role |
|-------|------|
| `athlete1@example.com` | athlete |
| `athlete2@example.com` | athlete |
| `admin@example.com` | admin |
