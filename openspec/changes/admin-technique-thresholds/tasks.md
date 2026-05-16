# Tasks: admin-technique-thresholds

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~380–460 |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: stacked-to-main
400-line budget risk: Medium

## Phase 1: Foundation — Types & Hooks

- [x] 1.1 Create `src/features/admin/technique-thresholds/hooks/useTechniqueThresholds.ts` — fetch hook: `bjj_techniques LEFT JOIN technique_learning_thresholds`, returns `TechniqueWithThreshold[]` sorted by category then name, `staleTime: 60_000`, default threshold 10 for null rows
- [x] 1.2 Create `src/features/admin/technique-thresholds/hooks/useUpdateTechniqueThreshold.ts` — upsert mutation hook calling `supabase.from('technique_learning_thresholds').upsert({ technique_id, required_practices }, { onConflict: 'technique_id' })`, `onSuccess` invalidates `['technique-learning-status']` query cache
- [x] 1.3 Write tests: `src/features/admin/technique-thresholds/hooks/useTechniqueThresholds.test.ts` — verify sort order (category → name), default threshold of 10 for null rows, `staleTime`
- [x] 1.4 Write tests: `src/features/admin/technique-thresholds/hooks/useUpdateTechniqueThreshold.test.ts` — verify upsert payload, error handling, cache invalidation on success

## Phase 2: Core Implementation — UI Components

- [x] 2.1 Create `src/features/admin/technique-thresholds/components/ThresholdRow.tsx` — table row component: technique name, category (nullable display as "—"), numeric `min={1}` input, Save button with loading state, displays current saved value after success
- [x] 2.2 Create `src/features/admin/technique-thresholds/pages/TechniqueThresholdsPage.tsx` — admin page: skeleton loading state (`role="status"` `aria-label="Loading techniques"`), shadcn `animate-pulse` rows, table with columns: Name / Category / Threshold (input) / Actions, wraps with `AdminRoute`
- [x] 2.3 Write tests: `src/features/admin/technique-thresholds/components/ThresholdRow.test.tsx` — render with technique data, Save button calls mutation, input resets to saved value on success, shows loading state during mutation
- [x] 2.4 Write tests: `src/features/admin/technique-thresholds/pages/TechniqueThresholdsPage.test.tsx` — renders skeleton while loading, table rows appear after load, threshold validation (min=1) inline error

## Phase 3: Router Wiring

- [x] 3.1 Modify `src/app/router.tsx` — add route `admin/technique-thresholds` with `AdminRoute` wrapper, import `TechniqueThresholdsPage`

## Phase 4: Integration Verification

- [x] 4.1 Run `npm test -- --run` — all unit tests pass
- [x] 4.2 Run `npm run build` — no build errors