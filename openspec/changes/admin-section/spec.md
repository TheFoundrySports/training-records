# Delta Spec: admin-section

**Change:** admin-section
**Date:** 2026-05-23
**Status:** Draft

---

## Domain: admin-shell

### ADDED Requirements

### Requirement: AdminShell Renders Sidebar with Four Nav Items

The AdminShell component MUST render a left sidebar with navigation links to all four admin sections. Each nav item MUST be labeled: "BJJ Techniques", "AI Settings", "Thresholds", and "Users". The component MUST accept an `<Outlet />` for the main content area.

#### Scenario: All four nav items visible
- GIVEN an authenticated admin user navigates to any `/admin/*` route
- WHEN the AdminShell renders
- THEN the sidebar displays four nav items: BJJ Techniques, AI Settings, Thresholds, Users
- AND the active route's nav item is visually highlighted

#### Scenario: Sidebar persists across admin sub-routes
- GIVEN an admin user is on `/admin/bjj-techniques`
- WHEN the user clicks "Users" in the sidebar
- THEN the sidebar remains visible on `/admin/users`
- AND the main content area updates to show the Users Management page

#### Scenario: Non-admin user cannot see sidebar
- GIVEN an authenticated non-admin (athlete) user navigates to any `/admin/*` route
- WHEN the AdminRoute guard renders
- THEN access is denied and the AdminShell is never rendered

### Requirement: All `/admin/*` Routes Nest Inside AdminShell

All admin sub-routes MUST be children of the AdminShell layout route, ensuring the sidebar persists without re-mounting on navigation.

#### Scenario: Nested admin routes inherit layout
- GIVEN an admin user navigates to `/admin/users`
- WHEN the route renders
- THEN the AdminShell layout (sidebar + `<Outlet>`) wraps the User Management page content

#### Scenario: Active nav item highlights on route match
- GIVEN an admin user navigates to `/admin/ai-settings`
- WHEN the AdminShell renders with the new route
- THEN the "AI Settings" nav item is marked active

---

## Domain: user-management

### ADDED Requirements

### Requirement: User List Displays All Users with Email and Role

The system MUST display a table listing every user with their email address and current role (admin or athlete).

#### Scenario: Admin views full user list
- GIVEN an authenticated admin user navigates to `/admin/users`
- WHEN the User Management page renders
- THEN a table displays each user's email and role
- AND the list is sorted by email (alphabetical)

#### Scenario: Roles shown as human-readable labels
- GIVEN an admin is viewing the user list
- WHEN a user's role is `admin`
- THEN the row displays "Admin" in the role column
- AND when a user's role is `athlete`
- THEN the row displays "Athlete" in the role column

### Requirement: Admin Can Change Any User's Role Inline

An authenticated admin MUST be able to change any user's role using an inline dropdown control. The change is submitted immediately upon selection.

#### Scenario: Admin changes another user's role to admin
- GIVEN an authenticated admin is on the User Management page
- WHEN the admin clicks the role dropdown for a user with role "Athlete" and selects "Admin"
- THEN the system calls `update-user-role` with the new role
- AND the dropdown updates to show "Admin" immediately

#### Scenario: Admin changes a user's role to athlete
- GIVEN an authenticated admin is on the User Management page
- WHEN the admin clicks the role dropdown for a user with role "Admin" and selects "Athlete"
- THEN the system calls `update-user-role` with the new role
- AND the dropdown updates to show "Athlete" immediately

### Requirement: Role Change Takes Effect Immediately Without Re-login

After an admin updates a user's role, the updated role MUST be effective immediately with no re-login required.

#### Scenario: Role change reflects in AuthContext immediately
- GIVEN a user is logged in and viewing their dashboard
- WHEN an admin changes that user's role from "athlete" to "admin"
- AND the admin's UI confirms the update succeeded
- THEN the target user's next navigation or page refresh shows the new role
- AND the target user's `user_metadata.role` matches the new role

#### Scenario: Admin updating own role sees immediate effect
- GIVEN an admin is on the User Management page
- WHEN the admin changes their own role from "Admin" to "Athlete"
- THEN the role dropdown in the table shows "Athlete"
- AND on the next page load, the admin's role-based UI reflects the change

### MODIFIED Requirements

### Requirement: Role Assignment via Edge Function (Previously: Self-Update Only)

The system MUST use the `update-user-role` Edge Function for all admin-initiated role changes. The function MUST write to both `profiles.role` AND `auth.users.user_metadata` atomically and MUST reject non-admin callers.

#### Scenario: Edge Function rejects non-admin caller
- GIVEN a non-admin user attempts to call `update-user-role`
- WHEN the Edge Function is invoked
- THEN the function returns an error with status 403
- AND no role changes are made

#### Scenario: Edge Function updates both tables with rollback
- GIVEN an admin calls `update-user-role(user_id, 'admin')`
- WHEN the Edge Function executes
- THEN it MUST update `profiles.role` to 'admin'
- AND it MUST update `auth.users.user_metadata.role` to 'admin'
- AND if the `user_metadata` update fails, it MUST rollback the `profiles.role` change
- AND return an error to the caller

#### Scenario: Edge Function validates role value
- GIVEN an admin calls `update-user-role(user_id, 'superadmin')`
- WHEN the Edge Function validates the input
- THEN it MUST reject with a 400 error
- AND no changes are made
(Previously: Role was only updateable by the user themselves via self-update flow)

### Requirement: Admin Route Guard Covers All `/admin/*` Routes (Previously: Limited Admin Routes)

The AdminRoute guard MUST protect all routes under `/admin/*`, including the new `/admin/users` route.

#### Scenario: Non-admin user denied access to `/admin/users`
- GIVEN an authenticated user with role "athlete" navigates to `/admin/users`
- WHEN the AdminRoute guard evaluates the user's role
- THEN access is denied (redirect to home or error page)
(Previously: AdminRoute protected only bjj-techniques, ai-settings, technique-thresholds — not users)