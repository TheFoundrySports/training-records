# Delta Spec: user-management

**Change:** admin-section
**Domain:** user-management
**Status:** Draft

## ADDED Requirements

### Requirement: User List Displays All Users with Email and Role

The system MUST display a table listing every user with their email address and current role (admin or athlete). The list MUST include the authenticated admin's own account.

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

---

### Requirement: Admin Can Change Any User's Role Inline

An authenticated admin MUST be able to change any user's role to either "admin" or "athlete" using an inline dropdown control in the user list table. The change MUST be submitted immediately upon selection with no additional confirmation step.

#### Scenario: Admin changes another user's role to admin

- GIVEN an authenticated admin is on the User Management page
- WHEN the admin clicks the role dropdown for a user with role "Athlete"
- AND selects "Admin"
- THEN the system calls `update-user-role` with the new role
- AND the dropdown updates to show "Admin" immediately

#### Scenario: Admin changes a user's role to athlete

- GIVEN an authenticated admin is on the User Management page
- WHEN the admin clicks the role dropdown for a user with role "Admin"
- AND selects "Athlete"
- THEN the system calls `update-user-role` with the new role
- AND the dropdown updates to show "Athlete" immediately

---

### Requirement: Role Change Takes Effect Immediately Without Re-login

After an admin updates a user's role via the User Management page, the updated role MUST be effective immediately. There MUST be no need for the target user to log out and back in.

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
- AND on the next page load, the admin's role-based UI (e.g., admin links) reflects the change

---

## MODIFIED Requirements

### Requirement: Role Assignment via Edge Function (Previously: Self-Update Only)

The system MUST use the `update-user-role` Edge Function for all role changes initiated by an admin. The Edge Function MUST write to both `profiles.role` AND `auth.users.user_metadata` atomically. The function MUST reject requests from non-admin callers.

#### Scenario: Edge Function rejects non-admin caller

- GIVEN a non-admin (athlete) user attempts to call `update-user-role`
- WHEN the Edge Function is invoked
- THEN the function returns an error with status 403
- AND no role changes are made to any system

#### Scenario: Edge Function updates both tables in sequence

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
- AND no changes are made to the database
(Previously: Role was only updateable by the user themselves via self-update flow)

---

### Requirement: Admin Route Guard Covers All `/admin/*` Routes (Previously: Limited Admin Routes)

The AdminRoute guard MUST protect all routes under `/admin/*`, including the new `/admin/users` route. Any unauthenticated or non-admin request to these routes MUST be denied.

#### Scenario: Non-admin user denied access to `/admin/users`

- GIVEN an authenticated user with role "athlete" navigates to `/admin/users`
- WHEN the AdminRoute guard evaluates the user's role
- THEN access is denied (redirect to home or error page)

#### Scenario: AdminRoute wraps all admin sub-routes

- GIVEN the router is configured
- WHEN any route under `/admin/*` is matched
- THEN the route element is wrapped in `<AdminRoute>`
(Previously: AdminRoute protected only bjj-techniques, ai-settings, technique-thresholds — not users)