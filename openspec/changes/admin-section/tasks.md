# Tasks: Unified Admin Section

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 250–350 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

---

## Phase 1: Database & Edge Function (Foundation)

- [ ] 1.1 Create `supabase/migrations/YYYYMMDD_admin_rls_policies.sql` — add `CREATE POLICY "Admins can read all profiles" ON profiles FOR SELECT USING (auth.uid() IS NOT NULL);` — verify existing UPDATE policies still work for self-update
- [ ] 1.2 Create `supabase/functions/update-user-role/index.ts` — implement `update-user-role` Edge Function per design spec: validate caller is admin from `profiles.role`, dual-write `profiles.role` then `auth.users.user_metadata` with rollback on failure, validate role is 'admin' or 'athlete'
- [ ] 1.3 Deploy Edge Function to Supabase and test with a non-admin token (expect 403) and admin token (expect 200)

## Phase 2: AdminLayout Component (Core Implementation)

- [ ] 2.1 Create `src/features/admin/admin-shell/AdminLayout.tsx` — render left sidebar with `<nav>` links to BJJ Techniques (`/admin/bjj-techniques`), AI Settings (`/admin/ai-settings`), Thresholds (`/admin/technique-thresholds`), Users (`/admin/users`), use `useLocation` to highlight active link, render `<Outlet />` for main content
- [ ] 2.2 Create `src/features/admin/admin-shell/admin-shell.types.ts` — export `NavItem` type

## Phase 3: Router & AppShell (Integration)

- [ ] 3.1 Modify `src/app/router.tsx` — add `path: 'admin'` parent route with `AdminLayout` as element, migrate existing admin child routes (`admin/bjj-techniques`, `admin/bjj-techniques/new`, `admin/bjj-techniques/:id/edit`, `admin/ai-settings`, `admin/technique-thresholds`) under the new parent, add new `admin/users` route wrapping `UserManagementPage` in `<AdminRoute>`, wrap ALL child routes in `<AdminRoute>`
- [ ] 3.2 Modify `src/app/AppShell.tsx` — remove `<Link to="/admin/bjj-techniques">` (BJJ Techniques), `<Link to="/admin/ai-settings">` (AI Settings), and `<Link to="/admin/technique-thresholds">` (Thresholds) links from nav; add conditional `<Link to="/admin/bjj-techniques">Admin</Link>` that only renders when `role === 'admin'` (from `useAuth()`)

## Phase 4: User Management UI (Core Implementation)

- [ ] 4.1 Create `src/features/admin/users/users.types.ts` — define `UserRow = { id: string; email: string; role: 'admin' | 'athlete' }`
- [ ] 4.2 Create `src/features/admin/users/hooks/useUsers.ts` — TanStack Query `useQuery` fetching from `profiles` view/table selecting id, email, role, sorted by email
- [ ] 4.3 Create `src/features/admin/users/hooks/useUpdateUserRole.ts` — TanStack Query `useMutation` calling `POST /functions/v1/update-user-role` with `{ user_id, role }`, on success call `queryClient.invalidateQueries({ queryKey: ['users'] })`
- [ ] 4.4 Create `src/features/admin/users/pages/UserManagementPage.tsx` — render `<table>` with columns Email and Role; for each user row, show email and a `<select>` dropdown for role (options: Admin, Athlete), on change call `updateRole(user.id, newRole)`, show loading state during mutation

## Phase 5: Testing & Verification

- [ ] 5.1 Vitest: `AdminLayout` renders 4 nav items; active class applied when location matches
- [ ] 5.2 Vitest: `useUpdateUserRole` calls correct endpoint with correct payload; invalid role rejected
- [ ] 5.3 E2E (Playwright): Admin logs in, navigates to `/admin/users`, sees user table, changes a user's role, verifies dropdown updated immediately
- [ ] 5.4 E2E: Non-admin user navigates to `/admin/users` — expect redirect (AdminRoute guard)
- [ ] 5.5 Manual: Toggle own role to athlete, verify no "Admin" link appears in AppShell nav
- [ ] 5.6 Run `npm run build` to verify no TypeScript or build errors