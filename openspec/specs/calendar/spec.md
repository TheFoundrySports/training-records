# Training calendar

## Overview

The calendar feature provides **month**, **week**, and **day** views of the authenticated user's **workouts** stored in `public.workouts`. It lives under `src/features/calendar/` and is registered in the SPA router at **`/calendar`**. All view state (view mode and anchor date) is persisted in the URL via `?view=month|week|day&date=YYYY-MM-DD`.

## Acceptance Criteria

### REQ-CAL-01 through REQ-CAL-11 (Month View — original, preserved)

- Authenticated users can open **`/calendar`** and see a month title, previous/next/today controls, and a Monday-start week grid.
- Workouts with `performed_at` in the visible month load via TanStack Query and appear as chips on the matching day; loading shows a skeleton grid.
- Clicking a **workout chip** navigates to **`/workouts/:id`**.
- Clicking an **empty** in-month day cell navigates to **`/workouts/new?date=YYYY-MM-DD`**.

### REQ-CV-01: URL State

The system MUST encode calendar state as `?view=month|week|day` (default: `month`) and `?date=YYYY-MM-DD` (default: today). Legacy `?year` and `?month` are not read; `parseCalendarParams` in `src/features/calendar/utils/calendarParams.ts` ignores them and falls back to today when `?date` is absent or invalid.

#### Scenarios

- GIVEN a URL contains `?year=2026&month=4` with no `?view` or `?date` / WHEN CalendarPage loads / THEN the page renders month view anchored to today's date
- GIVEN the user navigates to `/calendar` with no query params / WHEN the page loads / THEN view defaults to `month` and date defaults to today's ISO date
- GIVEN `?view=week&date=2026-04-14` is in the URL / WHEN the page loads / THEN the week view renders for the week containing 2026-04-14
- GIVEN `?view=day&date=2026-04-10` is in the URL / WHEN the user reloads the page / THEN the day view renders for April 10, 2026
- GIVEN `?view=month&date=not-a-date` is in the URL / WHEN the page loads / THEN the page renders month view anchored to today

### REQ-CV-02: View Mode Switcher

The CalendarHeader MUST display a Day | Week | Month toggle. The active view MUST be visually highlighted. Clicking a mode MUST update `?view` in the URL without page reload.

#### Scenarios

- GIVEN the calendar page is displayed / WHEN CalendarHeader renders / THEN buttons for "Day", "Week", and "Month" are visible
- GIVEN `?view=week` is the current URL param / WHEN CalendarHeader renders / THEN the "Week" button is visually highlighted and the others are not
- GIVEN the user is on month view / WHEN they click "Week" / THEN the URL updates to `?view=week` (preserving `?date`) and no full page reload occurs
- GIVEN `?view=month&date=2026-04-14` is current / WHEN the user clicks "Day" / THEN the URL becomes `?view=day&date=2026-04-14`
- GIVEN no `?view` param is present / WHEN CalendarHeader renders / THEN the "Month" button is highlighted

### REQ-CV-03: Week View

The system MUST render a 7-column grid (Mon–Sun, `weekStartsOn: 1`) for the week containing the anchor date. Each column MUST show the day abbreviation and date number. Workouts MUST appear as chips under their day.

#### Scenarios

- GIVEN `?view=week&date=2026-04-14` (a Tuesday) / WHEN the week view renders / THEN 7 columns appear: Mon Apr 13 through Sun Apr 19
- GIVEN a workout with `performed_at = 2026-04-14` / WHEN the week view renders for that week / THEN a chip for that workout appears under the Tuesday column
- GIVEN a day column has no workouts / WHEN the user clicks the empty area under that day / THEN they navigate to `/workouts/new?date=YYYY-MM-DD` for that day
- GIVEN the user is viewing the week of Apr 13–19, 2026 / WHEN they click "Next" / THEN `?date` updates to Apr 20 and the grid shows Apr 20–26
- GIVEN the user is viewing a past week / WHEN they click "Today" / THEN `?date` updates to today's ISO date and the grid shows the current week
- GIVEN `?view=week&date=2026-03-31` / WHEN the header title renders / THEN it displays "31 Mar – 6 Apr 2026"

### REQ-CV-04: Day View

The system MUST render a vertical list of all workouts for the anchor date. An empty state MUST display "No workouts on this day." A "Add workout" button MUST navigate to `/workouts/new?date=YYYY-MM-DD`.

#### Scenarios

- GIVEN `?view=day&date=2026-04-10` and two workouts on that date / WHEN the day view renders / THEN both workouts are listed vertically in chronological order
- GIVEN `?view=day&date=2026-04-10` and no workouts on that date / WHEN the day view renders / THEN the text "No workouts on this day." is displayed
- GIVEN a workout is listed in day view / WHEN the user clicks it / THEN they navigate to `/workouts/{workoutId}`
- GIVEN the day view is displayed for 2026-04-10 / WHEN the user clicks "Add workout" / THEN they navigate to `/workouts/new?date=2026-04-10`
- GIVEN the user is viewing 2026-04-10 / WHEN they click "Next" / THEN `?date` updates to `2026-04-11` and the day view shows Apr 11
- GIVEN `?view=day&date=2026-12-31` (a future date) with a workout / WHEN the day view renders / THEN a **Planning mode** badge appears above the list (`DayView.tsx`)

### REQ-CV-05: Hook Generalization

The system MUST provide `useWorkoutsByDateRange(start: Date, end: Date)` as the shared data hook. Query key MUST be `['workouts', 'calendar', start.toISOString(), end.toISOString()]`. Each view MUST compute its own start/end range from the anchor date.

#### Scenarios

- GIVEN `?view=month&date=2026-04-14` / WHEN CalendarPage fetches data / THEN `useWorkoutsByDateRange` is called with start=`2026-04-01T00:00:00` and end=`2026-04-30T23:59:59`
- GIVEN `?view=week&date=2026-04-14` / WHEN CalendarPage fetches data / THEN `useWorkoutsByDateRange` is called with start=Mon Apr 13 and end=Sun Apr 19
- GIVEN `?view=day&date=2026-04-10` / WHEN CalendarPage fetches data / THEN `useWorkoutsByDateRange` is called with start and end both covering Apr 10 only
- GIVEN the week view is showing Apr 13–19 / WHEN the user navigates to the next week / THEN a new query with updated start/end keys fires and fresh data loads
- GIVEN the same week is rendered twice with the same anchor date / WHEN React Query checks the cache / THEN no duplicate fetch occurs (cache hit on the ISO-string key)

## Scope

| Area           | Location / behaviour                                                                                                                                                                                                                                                   |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Page           | `src/features/calendar/pages/CalendarPage.tsx` — reads `?view` and `?date` from URL search params (defaults: `month` / today). Conditional render: `<CalendarGrid>` / `<WeekGrid>` / `<DayView>`.                                                                      |
| URL utils      | `src/features/calendar/utils/calendarParams.ts` — `parseCalendarParams(URLSearchParams)` and `buildCalendarSearch(view, date)`.                                                                                                                                        |
| Data           | `src/features/calendar/hooks/useWorkoutsByMonth.ts` — `useWorkoutsByDateRange(start, end)` with queryKey `['workouts','calendar', start.toISOString(), end.toISOString()]`; staleTime 5 min; limit 200. `useWorkoutsByMonth` kept as thin wrapper for backward compat. |
| Grid layout    | `src/features/calendar/utils/buildCalendarDays.ts` — `buildCalendarDays` (month) + `buildWeekDays(anchorDate, workouts): CalendarDay[]` (always 7 Mon–Sun days).                                                                                                       |
| Boundary utils | `computeMonthBoundaries`, `computeWeekBoundaries`, `computeDayBoundaries` in `hooks/useWorkoutsByMonth.ts`.                                                                                                                                                            |
| UI             | `CalendarHeader.tsx` (view switcher + dynamic title), `CalendarGrid.tsx`, `CalendarCell.tsx` (`disableOutOfMonthClick?`), `WorkoutChip.tsx`, `WeekGrid.tsx` (new), `DayView.tsx` (new) under `src/features/calendar/components/`.                                      |
| Types          | `src/features/calendar/calendar.types.ts` — `CalendarDay`, `CalendarView = 'month' \| 'week' \| 'day'`.                                                                                                                                                                |
| Public API     | `src/features/calendar/index.ts` exports `CalendarPage`, `CalendarDay`, `CalendarView`, `WeekGrid`, `DayView`, `useWorkoutsByDateRange`, `parseCalendarParams`, `buildCalendarSearch`.                                                                                 |
| Routing / nav  | `src/app/router.tsx` (child route `calendar`); `src/app/AppShell.tsx` nav link **Calendar** → `/calendar`.                                                                                                                                                             |
| Tests          | Colocated `*.test.ts` / `*.test.tsx` under `src/features/calendar/` (11 files). Filter with `npm test -- --run src/features/calendar` per `package.json` scripts.                                                                                                      |

## Configuration

No feature-specific environment variables. Uses the shared Supabase client from `src/lib/supabase.ts` and inherits workout RLS like other workout reads.

## Design Decisions

- **Unified anchor model:** Single `anchorDate: Date` + `view: CalendarView` drive all three views. All navigation, title computation, and range queries derive from these two values. This replaces the previous `?year&month` model.
- **Additive refactor:** `CalendarGrid` and `WorkoutChip` stay focused on month/week chip UI; `CalendarCell` gains optional `disableOutOfMonthClick` for week columns. New components `WeekGrid` and `DayView` sit alongside. `CalendarPage` orchestrates view + range + header.
- **`disableOutOfMonthClick` prop on CalendarCell:** `CalendarCell` gains an optional `disableOutOfMonthClick?: boolean` (default `true`) to preserve month-view behavior while allowing week-view cells to fire click events on all days regardless of month membership.
- **`useWorkoutsByMonth` kept as wrapper:** The old hook is preserved to avoid breaking any consumer that hasn't migrated. It delegates to `useWorkoutsByDateRange` internally. Can be deleted in a follow-up.
- **`buildWeekDays` separate from `buildCalendarDays`:** The month builder is month-coupled (empty cells, 5–6 row grid). Adding a `view` branch would violate SRP. A ~8 LOC `buildWeekDays` function reuses `groupByDay` and is the right tool.
- **No new dependencies:** All date math uses `date-fns` (already in `package.json`).
- **Direct PostgREST reads:** Fetches align with the MVP pattern — the SPA queries `workouts` via the Supabase JS client (not Edge Function).

## Changelog

- **2026-04-12** — Doc pass: `PRODUCT.md` / `ARCHITECTURE.md` summaries aligned with week/day views; spec fixes for legacy URL params, future-day badge copy (**Planning mode**), test file count (11), and `CalendarCell` / additive-refactor wording.
- **2026-04-12** — Added Week view, Day view, and View Mode Switcher (REQ-CV-01 through REQ-CV-05). URL state migrated from `?year&month` to `?view&date`. New components: `WeekGrid`, `DayView`. New utilities: `calendarParams.ts`, `buildWeekDays`, `computeWeekBoundaries`, `computeDayBoundaries`. New hook: `useWorkoutsByDateRange`. Closes issues #3, #4, #5.
- **2026-04-12** — Initial spec added to match the `src/features/calendar/` month-view implementation and routing/nav updates.
