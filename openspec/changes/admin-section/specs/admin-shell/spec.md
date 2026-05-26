# Delta Spec: admin-shell

**Change:** admin-section
**Domain:** admin-shell
**Status:** Draft

## ADDED Requirements

### Requirement: AdminShell Renders Sidebar with Four Nav Items

The AdminShell component MUST render a left sidebar with navigation links to all four admin sections. Each nav item MUST be labeled: "BJJ Techniques", "AI Settings", "Thresholds", and "Users". The component MUST accept an `<Outlet />` for the main content area.

#### Scenario: All four nav items visible

- GIVEN an authenticated admin user navigates to any `/admin/*` route
- WHEN the AdminShell renders
- THEN the sidebar displays four nav items: BJJ Techniques, AI Settings, Thresholds, Users
- AND the active route's nav item is visually highlighted (e.g., distinct background or text treatment)

#### Scenario: Sidebar persists across admin sub-routes

- GIVEN an authenticated admin user is on `/admin/bjj-techniques`
- WHEN the user clicks "Users" in the sidebar
- THEN the sidebar remains visible on `/admin/users`
- AND the main content area updates to show the Users Management page

#### Scenario: Non-admin user cannot see sidebar

- GIVEN an authenticated non-admin (athlete) user navigates to any `/admin/*` route
- WHEN the AdminRoute guard renders
- THEN access is denied and the AdminShell is never rendered

---

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
- AND other nav items are not marked active