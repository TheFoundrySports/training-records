# Public WODs — Spec

## Overview

The public WODs feature provides a read-only library of benchmark, hero, and reference workouts. This library is not user-created — it is seeded data managed by administrators. The primary consumer is the `PublicWodPickerModal` inside the workout create form, which lets users pre-fill a workout from a well-known template. The data is cached for 1 hour (staleTime) since it rarely changes.

## Requirements

### REQ-PWD-01: Public WOD List

The system MUST provide a `usePublicWods(filters?)` hook that fetches all public WODs from `GET /api/v1/public-wods`. The hook MUST support optional filters: `q` (name search) and `category`. Results MUST be mapped from snake_case API rows to camelCase `PublicWod` objects. The query key MUST be `['public-wods', filters]`. `staleTime` MUST be 1 hour.

#### Scenarios

- GIVEN `usePublicWods()` is called with no filters / WHEN the API responds with a list / THEN it returns mapped `PublicWod[]` with camelCase fields
- GIVEN `usePublicWods({ q: 'murph' })` is called / WHEN the hook builds the request URL / THEN `?q=murph` is appended to `/api/v1/public-wods`
- GIVEN `usePublicWods({ category: 'Hero' })` is called / WHEN the hook builds the request URL / THEN `?category=Hero` is appended to `/api/v1/public-wods`
- GIVEN the API returns an empty array / WHEN the query resolves / THEN `data` is `[]`
- GIVEN the API returns a 500 error / WHEN the query fails / THEN `isError` is `true` and `error` contains the parsed error body
- GIVEN the same filters are used twice within 1 hour / WHEN React Query checks staleTime / THEN no duplicate fetch is made (cache hit)

### REQ-PWD-02: Single Public WOD

The system MUST provide a `usePublicWod(id: string)` hook that fetches a single public WOD from `GET /api/v1/public-wods/:id`. The query MUST NOT execute when `id` is an empty string. The query key MUST be `['public-wods', id]`. `staleTime` MUST be 1 hour.

#### Scenarios

- GIVEN `usePublicWod('some-id')` is called / WHEN the API returns the WOD row / THEN it is mapped to a `PublicWod` object and returned as `data`
- GIVEN `usePublicWod('')` is called / WHEN the hook evaluates `enabled` / THEN `isPending` is `true` and `fetchStatus` is `'idle'` (query skipped)
- GIVEN `usePublicWod('some-id')` is called / WHEN the request URL is built / THEN it is `/api/v1/public-wods/some-id`
- GIVEN the WOD does not exist / WHEN the API returns 404 with `{ error: { code: 'NOT_FOUND' } }` / THEN `isError` is `true` and `error` contains the body

### REQ-PWD-03: Data Model

The `PublicWod` object MUST include: `id`, `title`, `type` (crossfit|functional), `durationMinutes` (nullable), `wodFormat` (nullable, one of the registered formats), `wodText` (nullable), `payload` (nullable JSON object), `category` (Hero|Girl|Benchmark|General|null), `createdAt`. `mapPublicWodRow` MUST convert snake_case API fields to camelCase.

#### Scenarios

- GIVEN a raw API row with `wod_format: 'for_time'` and `duration_minutes: 10` / WHEN `mapPublicWodRow` runs / THEN the output has `wodFormat: 'for_time'` and `durationMinutes: 10`
- GIVEN a raw API row with `wod_format: null` / WHEN `mapPublicWodRow` runs / THEN the output has `wodFormat: null`
- GIVEN a raw API row with `category: 'Hero'` / WHEN `mapPublicWodRow` runs / THEN the output has `category: 'Hero'`
- GIVEN a raw API row with `payload: { rounds: 1, movements: [] }` / WHEN `mapPublicWodRow` runs / THEN `payload` is preserved as-is

### REQ-PWD-04: Public WOD Form Fields

The system MUST define a `PublicWodFormFields` type that represents the subset of fields copied into `WorkoutFormPage` when a public WOD is selected: `title`, `type`, `wodFormat`, `wodText`, `payload`, `durationMinutes`. This type MUST be exported from the feature's public index.

#### Scenarios

- GIVEN a `PublicWod` is passed to `wodToFormFields` / WHEN the conversion runs / THEN a `PublicWodFormFields` object is returned with all six mapped fields
- GIVEN the selected WOD has `durationMinutes: null` / WHEN `handlePublicWodSelect` runs in `WorkoutFormPage` / THEN the form's `durationMinutes` field is NOT overwritten (conditional spread)
- GIVEN the selected WOD has a `wodFormat` and `payload` / WHEN the form is reset / THEN both `wodFormat` and `payload` are set in the form and the appropriate `FormSection` renders

### REQ-PWD-05: Category Display

The system MUST display category badges with distinct visual variants in the picker: Hero = destructive (red), Girl = secondary, Benchmark = default, General = outline.

#### Scenarios

- GIVEN a public WOD has `category: 'Hero'` / WHEN the picker renders the WOD row / THEN a badge with variant `destructive` and label "Hero" is shown
- GIVEN a public WOD has `category: 'Girl'` / WHEN the picker renders the WOD row / THEN a badge with variant `secondary` and label "Girl" is shown
- GIVEN a public WOD has `category: 'Benchmark'` / WHEN the picker renders the WOD row / THEN a badge with variant `default` and label "Benchmark" is shown
- GIVEN a public WOD has `category: null` / WHEN the picker renders the WOD row / THEN no category badge is shown
- GIVEN a public WOD has `wodFormat: 'amrap'` / WHEN the picker renders the WOD row / THEN a separate `outline` badge shows "AMRAP" (uppercase)

## Implementation Reference

| Concern          | Location                                                    |
| ---------------- | ----------------------------------------------------------- |
| Types            | `src/features/public-wods/public-wod.types.ts`              |
| Data hook        | `src/features/public-wods/hooks/usePublicWods.ts`           |
| Row mapper       | `src/features/public-wods/hooks/mapPublicWodRow.ts`         |
| Hook tests       | `src/features/public-wods/hooks/usePublicWods.test.tsx`     |
| Row mapper tests | `src/features/public-wods/hooks/mapPublicWodRow.test.ts`    |
| Public index     | `src/features/public-wods/index.ts`                         |
| Picker component | `src/features/workouts/components/PublicWodPickerModal.tsx` |
| API              | `GET /api/v1/public-wods` and `GET /api/v1/public-wods/:id` |

## Configuration

| Variable                 | Source | Purpose                                      |
| ------------------------ | ------ | -------------------------------------------- |
| `VITE_SUPABASE_URL`      | `.env` | Resolves API base URL via `src/lib/api.ts`   |
| `VITE_SUPABASE_ANON_KEY` | `.env` | Session token used in `Authorization` header |

The `public_wods` table is seeded via `supabase/seed.sql`. No write endpoint is exposed to users — inserts are admin-only through direct DB access.

## Design Decisions

- **Feature module with no pages:** The `public-wods` feature exports only hooks and types. It has no routes of its own. The picker UI lives in `src/features/workouts/components/PublicWodPickerModal.tsx` because it only exists as a helper inside the workout create flow.
- **1 hour staleTime:** Public WODs change rarely (only when an admin seeds or migrates new ones). A 1-hour cache avoids repeated fetches during a session without requiring manual invalidation.
- **Debounced search in picker:** `PublicWodPickerModal` debounces the search input by 300ms before updating the query key, avoiding a fetch on every keystroke.
- **No dedicated public WOD detail page:** The library is only exposed through the picker modal. A standalone `/public-wods/:id` route does not exist in the current router.
- **`durationMinutes` conditional spread:** When a public WOD has `durationMinutes: null` (unknown duration), the form reset skips the field to preserve the user's previously set duration.

## Changelog

- **2026-04-12** — Initial spec written from implemented code (reverse-engineered)
