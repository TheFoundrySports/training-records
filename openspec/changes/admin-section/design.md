# Design: Unified Admin Section

## Technical Approach

Consolidate all `/admin/*` routes under a parent layout route (`AdminShell`) that renders a left sidebar with 4 nav items. A new `/admin/users` route exposes User Management with inline role editing via a Supabase Edge Function (`update-user-role`) that performs dual-write to `profiles.role` and `auth.users.user_metadata`. Existing admin pages get migrated into the new route hierarchy, and scattered admin links in AppShell get replaced with a single conditional "Admin" link.

## Architecture Decisions

### Decision: Parent Layout Route for `/admin/*`

**Choice**: Add `path: 'admin'` as a parent route in `router.tsx` rendering `AdminLayout` (sidebar + `<Outlet>`), with child routes for each admin section.
**Alternatives considered**: Wrap each admin route individually with an `<AdminLayout>` component — rejected due to sidebar re-mounting on navigation and duplicated wrapper code.
**Rationale**: React Router nested layout routes are the idiomatic way to share UI across sibling routes without prop drilling or context.

### Decision: Dual-Write in Edge Function (Not Trigger-Based)

**Choice**: `update-user-role` writes to `profiles.role` first, then `auth.users.user_metadata`. If the second write fails, rollback the first.
**Alternatives considered**: Use a Postgres trigger on `profiles.role` UPDATE to sync `user_metadata` — rejected because triggers can't write to `auth.users`. DB-level triggers also lack granular error handling for partial failures.
**Rationale**: The Edge Function approach gives explicit control over the write order, rollback, and error responses. Follows the same Deno/Supabase pattern as existing edge functions in the repo.

### Decision: TanStack Query Hooks for User List and Role Update

**Choice**: `useUsers()` query hook + `useUpdateUserRole()` mutation hook.
**Alternatives considered**: Call Edge Function directly from component — rejected; would scatter fetch logic, invalidate logic, and error handling across the component.
**Rationale**: Consistent with existing TanStack Query patterns (`useAISettings`) already in the codebase. Enables automatic cache invalidation after role updates.

### Decision: New RLS Policy for profiles (SELECT) Instead of UPDATE Policy

**Choice**: Add a SELECT policy `auth.uid() IS NOT NULL` (or admin check) to allow admins to read all profiles. No new UPDATE RLS policy; the Edge Function uses `service_role` to bypass RLS.
**Alternatives considered**: Add an UPDATE RLS policy allowing admins to update any profile — rejected because the Edge Function bypasses RLS anyway (service_role), and the dual-write requirement means the Edge Function is the sole write path.
**Rationale**: Minimal RLS surface. The Edge Function is the authoritative write path; RLS only needs to permit reading.

## Data Flow

```
Admin navigates to /admin/users
        │
        ▼
  AdminShell renders
  (sidebar + <Outlet>)
        │
        ▼
UserManagementPage mounts
        │
        ├─── useUsers() ───────────────────────────────┐
        │    TanStack Query query to profiles view      │
        │    (RLS: auth.uid() IS NOT NULL)              │
        │                                              │
        ▼                                              ▼
Admin clicks role dropdown                 useUpdateUserRole()
        │                                    │
        ▼                                    ▼
Edge Function update-user-role       invalidateUsers()
        │                                    │
        ├─ SELECT caller role from profiles │
        │   (reject if not admin)           │
        │                                    │
        ├─ UPDATE profiles.role = new_role  │
        │                                    │
        ├─ UPDATE auth.users.user_metadata  │
        │   (rollback on failure)           │
        │                                    │
        └────── 200 OK / error ──────────────┘
                    │
                    ▼
             TanStack Query cache invalidated
             User list re-fetches with new roles
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/app/router.tsx` | Modify | Add `admin` parent route with `AdminLayout`, migrate child routes under it |
| `src/app/AppShell.tsx` | Modify | Remove individual admin links, add conditional single "Admin" link |
| `src/features/admin/admin-shell/AdminLayout.tsx` | Create | Sidebar component with 4 nav items, active highlighting, `<Outlet>` |
| `src/features/admin/users/pages/UserManagementPage.tsx` | Create | User table with inline role dropdown |
| `src/features/admin/users/hooks/useUsers.ts` | Create | TanStack Query `useQuery` for user list |
| `src/features/admin/users/hooks/useUpdateUserRole.ts` | Create | TanStack Query `useMutation` calling Edge Function |
| `src/features/admin/users/users.types.ts` | Create | `UserRow` type (id, email, role) |
| `supabase/functions/update-user-role/index.ts` | Create | Edge Function for dual-write role updates |
| `supabase/migrations/YYYYMMDD_admin_rls_policies.sql` | Create | New SELECT policy on profiles for admin read |

## Interfaces / Contracts

### Edge Function: `update-user-role`

```typescript
// Request (POST with Authorization header)
{
  user_id: string,   // UUID of the user to update
  role: string       // 'admin' | 'athlete' only
}

// Response 200
{ success: true, role: 'admin' | 'athlete' }

// Response 400
{ error: { code: 'INVALID_ROLE', message: '...' } }

// Response 403
{ error: { code: 'FORBIDDEN', message: 'Admin only' } }

// Response 404
{ error: { code: 'USER_NOT_FOUND', message: '...' } }
```

### `useUsers()` hook return

```typescript
{
  users: UserRow[],       // { id: string, email: string, role: 'admin' | 'athlete' }[]
  isLoading: boolean,
  error: Error | null
}
```

### `useUpdateUserRole()` hook return

```typescript
{
  updateRole: (userId: string, role: 'admin' | 'athlete') => Promise<void>,
  isPending: boolean,
  mutationError: Error | null,
  isSuccess: boolean
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `AdminLayout` active nav detection | Vitest: render with mock `useLocation`, assert active class |
| Unit | `useUpdateUserRole` validation (invalid role) | Vitest: mock Edge Function, pass invalid role, assert error |
| Integration | Edge Function dual-write | Call function with test admin token, verify both tables updated atomically |
| E2E | Full role change flow | Playwright: admin logs in, changes user role, verifies UI updates without reload |

## Migration / Rollout

1. **DB migration first** — add RLS SELECT policy on profiles. Deploy migration before code.
2. **Edge Function deploy** — deploy `update-user-role` to Supabase Edge Functions.
3. **Router + AppShell** — deploy new route structure + nav cleanup.
4. **UserManagementPage + hooks** — final step; depends on Edge Function being live.

No feature flags needed. Rollback: revert migration (drop policy) and redeploy previous router/AppShell snapshot.

## Open Questions

- None identified — all technical decisions follow existing repo patterns.