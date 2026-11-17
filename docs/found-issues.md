# Found Issues — GitHub Task Drafts

Issues discovered during QA. Each entry below is ready to paste into a new GitHub issue.

**Areas covered:** BJJ Dashboard · Workouts list · Training Calendar

---

## Open

### Training Calendar (`/calendar`)

---

### Task 8 — Month view broken on mobile (days stack in one column)


| Field                | Value                                                                                          |
| -------------------- | ---------------------------------------------------------------------------------------------- |
| **Title**            | Calendar: month view collapses to a single column on mobile                                    |
| **Type**             | Bug / UX                                                                                       |
| **Area**             | Training Calendar · month grid                                                                 |
| **Suggested labels** | `bug`, `calendar`, `mobile`, `ui`                                                              |
| **Evidence**         | Mobile screenshot — weekday labels and day cells stack vertically; empty cells take full width |




#### Description

On mobile, the Training Calendar month view does not render as a 7-column grid. Weekday headers (`Mon`…`Sun`) and day cells stack in one column, so the month is barely usable (huge empty cells, endless scroll).

Desktop still shows a grid, but weekday header wrapping (`Sun` under `Mon`) suggests the same layout is fragile.

#### Steps to reproduce

1. Open `/calendar` on a narrow viewport (or DevTools mobile).
2. Select **Month**.
3. Observe weekday labels and day cells.



#### Expected

A usable month layout on mobile — either:

- a proper 7-column month grid (possibly compact / scrollable), **or**
- a dedicated mobile calendar pattern (e.g. denser month + day detail panel), **or**
- adopt an MUI calendar/scheduler widget that handles responsive month views.



#### Actual

Days and weekday labels render in a single vertical column.

#### MUI options (spike / decision)


| Option                                      | Fits?           | Notes                                                                                                                |
| ------------------------------------------- | --------------- | -------------------------------------------------------------------------------------------------------------------- |
| **MUI X Date Pickers (**`DateCalendar`**)** | No (alone)      | Date *picker* only — not an event/agenda month grid.                                                                 |
| **MUI X Scheduler** (`@mui/x-scheduler`)    | Yes (candidate) | Event scheduler with day/week/month-style views; evaluate maturity, license (MUI X), and fit with our workout chips. |
| **Keep custom grid + fix responsive CSS**   | Yes (minimal)   | Today: Tailwind `grid-cols-7` + `min-w-[640px]` in `CalendarGrid` — mobile UX still broken / awkward.                |
| **Third-party (e.g. FullCalendar)**         | Possible        | Heavier dependency; only if MUI Scheduler / custom fix are insufficient.                                             |




#### Likely location

- `src/features/calendar/components/CalendarGrid.tsx` (`grid-cols-7`, `min-w-[640px]`)
- `CalendarCell`, `MobileDayDetailPanel` (mobile day selection already exists)
- Related: desktop weekday header wrap for `Sun`



#### Acceptance criteria

- [ ] On mobile, month view does **not** stack all days in one column.
- [ ] Weekday headers stay aligned with columns (no `Sun` under `Mon`).
- [ ] User can scan the month and open/select a day without excessive empty full-width cells.
- [ ] Spike notes whether we adopt **MUI X Scheduler**, fix the custom grid, or another approach — decision recorded in the issue/PR.
- [ ] Desktop month view remains usable.

---



### Task 9 — Color-code workout titles and type tags on the calendar


| Field                | Value                                                                                             |
| -------------------- | ------------------------------------------------------------------------------------------------- |
| **Title**            | Calendar: color-code workout titles and type tags by workout category                             |
| **Type**             | Enhancement / UX                                                                                  |
| **Area**             | Training Calendar · workout chips                                                                 |
| **Suggested labels** | `enhancement`, `calendar`, `ui`                                                                   |
| **Evidence**         | Desktop screenshot — “Bjj” / “Crossfit” / “Functional” tags are grayscale; titles are plain black |




#### Description

Calendar entries show title + type badge, but everything is monochrome. Titles and tags should use category colors so BJJ / CrossFit / Functional are recognizable at a glance (align with the colored chips already used on the Workouts list).

#### Steps to reproduce

1. Open `/calendar` in **Month** (desktop or mobile).
2. Find days with BJJ, CrossFit, and Functional workouts.
3. Observe title text and type tags.



#### Expected

- Title and/or chip background/border/text use category colors (e.g. BJJ vs CrossFit vs Functional).
- Tags remain readable (contrast OK in light and dark mode).
- Planned workouts can keep a distinct treatment (e.g. dashed) **and** still show category color.



#### Actual

Titles are plain black; type badges use neutral `secondary`/`outline` styles with no category color.

#### Likely location

- `src/features/calendar/components/WorkoutChip.tsx` (title + `Badge` for `workout.type`)
- Reuse category palette from workouts theme (`createWorkoutsTheme` / `theme.palette.bjj|crossfit|functional`) or shared tokens
- Also apply in `MobileDayDetailPanel` (uses the same `WorkoutChip`)



#### Acceptance criteria

- [ ] Each workout type has a distinct color on the calendar chip (title and/or tag).
- [ ] Colors match (or deliberately map to) the Workouts list category colors.
- [ ] Readable contrast in light and dark mode.
- [ ] Month, week, and day views (wherever chips appear) use the same coloring.
- [ ] Planned state remains visually distinct without losing type color.

---



### Workouts section (`/workouts`)

---



### Task 4 — Workout list rows: denser layout, larger type, richer metadata


| Field                | Value                                                                   |
| -------------------- | ----------------------------------------------------------------------- |
| **Title**            | Workouts list: enlarge rows, tighten spacing, show more useful metadata |
| **Type**             | Enhancement / UX                                                        |
| **Area**             | Workouts list · `WorkoutCard`                                           |
| **Suggested labels** | `enhancement`, `workouts`, `ui`                                         |




#### Description

The workouts list uses a small font and sparse rows with too much empty space. Each row should feel larger and denser, with clearer spacing between rows, and surface more useful info than date + workout type alone.

#### Steps to reproduce

1. Open `/workouts`.
2. Observe list row typography, vertical density, and what metadata each row shows.



#### Expected

- Larger, more readable row typography and hit targets.
- Clearer spacing between rows (less leftover whitespace inside/around rows).
- Each row shows relevant extras beyond date and type (e.g. title prominence, duration, RPE, format/notes snippet — pick what fits available `Workout` fields).



#### Actual

Rows feel small and sparse; metadata is thin (mainly date + type chip, plus title/duration today).

#### Likely location

- `WorkoutCard` in `src/features/workouts/pages/WorkoutListPage.tsx`
- List gap / card padding in the same page



#### Acceptance criteria

- [ ] Row title and secondary text are larger / more readable than current.
- [ ] Row height and internal padding reduce empty whitespace without feeling cramped.
- [ ] Spacing between rows is intentional and consistent.
- [ ] Each row shows at least one additional useful field beyond date + type (e.g. RPE, duration more prominently, WOD format, or short notes).
- [ ] Layout works on mobile and desktop.

---



### Task 5 — Type filter buttons: MUI, larger, more colorful


| Field                | Value                                                                       |
| -------------------- | --------------------------------------------------------------------------- |
| **Title**            | Workouts list: restyle type filters with larger, more colorful MUI controls |
| **Type**             | Enhancement / UX                                                            |
| **Area**             | Workouts list · type filter                                                 |
| **Suggested labels** | `enhancement`, `workouts`, `ui`, `mui`                                      |




#### Description

The workout type filter buttons look weak. They should stay on MUI but be larger and more colorful so filters are easy to see and tap.

#### Steps to reproduce

1. Open `/workouts`.
2. Look at the All / CrossFit / Functional / BJJ filter controls.



#### Expected

MUI filter controls that are bigger, use stronger category colors (active + idle states), and feel like first-class UI — not small muted toggles.

#### Actual

Current `ToggleButtonGroup` filters look flat / underwhelming.

#### Likely location

- `TypeFilter` / `CategoryToggleButton` / `useCategoryToggleSx` in `src/features/workouts/pages/WorkoutListPage.tsx`



#### Acceptance criteria

- [ ] Filters remain MUI components.
- [ ] Controls are larger (size / padding / font) than today.
- [ ] Selected and unselected states use clearer category colors.
- [ ] Accessible: selected state announced; keyboard focus visible.
- [ ] Works on mobile (wrap or scroll without clipping).

---



### Task 6 — Hide Import for non-admin users


| Field                | Value                                                 |
| -------------------- | ----------------------------------------------------- |
| **Title**            | Workouts list: hide Import button for non-admin users |
| **Type**             | Bug / access control                                  |
| **Area**             | Workouts list · Import                                |
| **Suggested labels** | `bug`, `workouts`, `auth`, `admin`                    |




#### Description

The **Import** button on `/workouts` is visible to all users. It should only be shown to admin users.

#### Steps to reproduce

1. Sign in as a non-admin (athlete) user.
2. Open `/workouts`.
3. Observe the **Import** button in the header actions.



#### Expected

Import (button + import modal entry point) is hidden for non-admin users. Admins still see and can use it.

#### Actual

Import is shown to everyone.

#### Likely location

- Import button in `WorkoutListPage` (`src/features/workouts/pages/WorkoutListPage.tsx`)
- Role check via existing user profile / `UserRole` (`athlete`  `admin`)



#### Acceptance criteria

- [ ] Non-admin users do not see the Import button.
- [ ] Admin users still see Import and can open the import modal.
- [ ] No alternate UI path exposes import to non-admins from this page.
- [ ] Covered by a unit or e2e assertion for both roles if feasible.

---



### Task 7 — Unify header action button styles


| Field                | Value                                                                            |
| -------------------- | -------------------------------------------------------------------------------- |
| **Title**            | Workouts list: make Export / Import / Log workout buttons share one style system |
| **Type**             | Bug / UX consistency                                                             |
| **Area**             | Workouts list · header actions                                                   |
| **Suggested labels** | `bug`, `workouts`, `ui`, `mui`                                                   |




#### Description

Header action buttons on `/workouts` are visually inconsistent — only two look similar. All primary page actions should share the same component system and visual language.

#### Steps to reproduce

1. Open `/workouts` (as admin so Import is visible).
2. Compare **Export All**, **Import**, and **Log workout**.



#### Expected

All header actions use the same button system (prefer MUI to match the page) with consistent size, radius, and hierarchy (primary vs secondary/outlined).

#### Actual

Mixed systems: e.g. `ExportAllWorkoutsButton` uses shadcn `@/components/ui/button`, while Import / Log workout use MUI `Button` — so only some actions match.

#### Likely location

- `src/features/workouts/pages/WorkoutListPage.tsx` (Import, Log workout)
- `src/features/workouts/components/ExportAllWorkoutsButton.tsx` (shadcn Button)



#### Acceptance criteria

- [ ] Export All, Import (when visible), and Log workout use the same button library/styles.
- [ ] Visual hierarchy is clear (e.g. Log workout primary; Export/Import secondary).
- [ ] Sizes, icons, and spacing align in the header stack.
- [ ] Dark mode remains consistent with the workouts theme.

---



### BJJ Dashboard

---



### Task 1 — Recently practiced techniques: modal content not using full width


| Field                | Value                                                                            |
| -------------------- | -------------------------------------------------------------------------------- |
| **Title**            | BJJ Dashboard: Recently practiced techniques modal squeezes text into one column |
| **Type**             | Bug                                                                              |
| **Area**             | BJJ Dashboard · Last techniques / practice history modal                         |
| **Suggested labels** | `bug`, `bjj`, `ui`                                                               |




#### Description

On the BJJ Dashboard, clicking an item in **Recently practiced techniques** opens a modal (technique practice history). The card content inside the modal renders in a single narrow column instead of using the full modal width.

#### Steps to reproduce

1. Open the BJJ Dashboard.
2. In **Recently practiced techniques**, click any technique row.
3. Observe the practice-history modal / workout cards.



#### Expected

Text and card content span the full usable width of the modal.

#### Actual

Content is laid out in one narrow column; text does not use the whole modal width.

#### Likely location

- `TechniquePracticeModal` / `WorkoutCard` — `src/features/bjj/progression/components/TechniquePracticeModal.tsx`
- Opened from the dashboard Last Techniques widget



#### Acceptance criteria

- [ ] Modal content (workout cards, goal, description) uses the full content width of the dialog.
- [ ] Layout remains readable on mobile and desktop.
- [ ] No horizontal overflow or truncated layout that looks like a single narrow column.

---



### Task 2 — Technique types: `?category=` query does not filter progression page


| Field                | Value                                                                                      |
| -------------------- | ------------------------------------------------------------------------------------------ |
| **Title**            | BJJ Dashboard: Technique type drill-down ignores `category` query on blue-belt progression |
| **Type**             | Bug                                                                                        |
| **Area**             | BJJ Dashboard · Technique types widget → Blue belt progression                             |
| **Suggested labels** | `bug`, `bjj`, `filter`                                                                     |




#### Description

On the BJJ Dashboard, clicking a technique type (legend row) navigates to `/bjj/blue-belt-progression?category=escape` (or another category), but the progression page does **not** apply that category filter.

#### Steps to reproduce

1. Open the BJJ Dashboard.
2. In **Technique types**, click a type (e.g. Escape).
3. Land on `/bjj/blue-belt-progression?category=escape` (or equivalent).
4. Observe the list / checklist — no category filter is applied.



#### Expected

Blue belt progression page reads `category` from the URL and filters techniques to that category.

#### Actual

URL includes `?category=…`, but the UI shows unfiltered (or default) content.

#### Likely location

- Drill-down link: `TechniqueTypeWidget` → `navigate('/bjj/blue-belt-progression?category={category}')`  
(`src/features/bjj/dashboard/components/TechniqueTypeWidget.tsx`)
- Consumer missing: blue-belt progression page / checklist does not read or apply `category` search param



#### Acceptance criteria

- [ ] Visiting `/bjj/blue-belt-progression?category=<key>` filters the progression view to that category.
- [ ] Clicking a technique type on the dashboard lands on a correctly filtered progression page.
- [ ] Invalid / unknown `category` values are handled gracefully (no crash; clear empty or ignore).
- [ ] Clearing or changing the filter updates the URL (or documented behavior matches product intent).

---



### Task 3 — Roll outcomes: `?outcome=` query does not filter workouts list


| Field                | Value                                                                            |
| -------------------- | -------------------------------------------------------------------------------- |
| **Title**            | BJJ Dashboard: Roll outcomes drill-down ignores `outcome` query on workouts list |
| **Type**             | Bug                                                                              |
| **Area**             | BJJ Dashboard · Roll outcomes widget → Workouts list                             |
| **Suggested labels** | `bug`, `bjj`, `filter`                                                           |




#### Description

On the BJJ Dashboard, clicking any **Roll outcomes** tile navigates to `/workouts?outcome=neutral` (or `submission` / `position_gain` / `position_loss`), but the workouts list does **not** filter by that outcome.

> Note: `OutcomesWidget` currently documents this as deferred (“workouts list will read the query and filter”). Treated as a product bug / incomplete drill-down until wired.



#### Steps to reproduce

1. Open the BJJ Dashboard.
2. In **Roll outcomes**, click any outcome tile (e.g. Neutral).
3. Land on `/workouts?outcome=neutral` (or equivalent).
4. Observe the workouts list — nothing is filtered by outcome.



#### Expected

Workouts list reads `outcome` from the URL and shows only workouts matching that roll outcome.

#### Actual

URL includes `?outcome=…`, but the list is unfiltered.

#### Likely location

- Drill-down link: `OutcomesWidget` → `/workouts?outcome={outcome}`  
(`src/features/bjj/dashboard/components/OutcomesWidget.tsx`)
- Consumer missing: workouts list page / query hooks do not read or apply `outcome` search param



#### Acceptance criteria

- [ ] Visiting `/workouts?outcome=<key>` filters the workouts list to that outcome.
- [ ] Clicking an outcomes tile on the dashboard lands on a correctly filtered workouts list.
- [ ] Supported keys: `submission`, `position_gain`, `position_loss`, `neutral`.
- [ ] Invalid / unknown `outcome` values are handled gracefully.
- [ ] Filter state is visible to the user (chip, active filter, or equivalent).

---



## Resolved

