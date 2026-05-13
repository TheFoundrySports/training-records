# Tasks: BJJ Blue Belt Progression Tracker

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1,400–1,600 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | Feature Branch Chain (3 PRs) |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | DB migration + TypeScript types | PR 1 → feature/belt-progression | Foundation; no dependents |
| 2 | Section constants + progress calculation + unit tests | PR 1 → feature/belt-progression | Tests travel with implementation |
| 3 | TanStack Query hooks (useBeltProgression + useBeltProgressionUIState) | PR 2 → PR 1 branch | Depends on PR 1 types |
| 4 | UI primitives (ProgressBar + ResetButton/Dialog) | PR 2 → PR 1 branch | Depends on PR 1 types |
| 5 | Core UI (ProgressionChecklistItem + ProgressionSection) | PR 3 → PR 2 branch | Depends on hooks + UI primitives |
| 6 | BeltProgressionPage + routing + navigation link | PR 3 → PR 2 branch | Depends on core UI |
| 7 | E2E tests (Playwright — check, collapse, progress, reset) | PR 3 → PR 2 branch | Travels with implementation |
| 8 | Accessibility audit (axe-core + keyboard nav verification) | PR 3 → PR 2 branch | Can run after PR 6 |

## Phase 1: Foundation

- [x] 1.1 Create `supabase/migrations/20260513000001_belt_progression.sql` — two tables (`belt_progression`, `belt_progression_ui_state`), RLS policies, triggers, indexes per design §1
- [x] 1.2 Create `src/features/bjj/progression/types/belt-progression.types.ts` — TypeScript interfaces: `BeltProgressionItem`, `BeltProgressionUIState`, `ProgressionSection`, `ProgressionItem` per design §4
- [x] 1.3 Add `BeltProgressionItem` and `BeltProgressionUIState` Supabase table types to `src/lib/supabase.ts`
- [x] 1.4 Add Zod schemas for belt progression to `src/features/bjj/bjj.schema.ts` (REQ-BP7)

## Phase 2: Data Layer

- [x] 2.1 Create `src/features/bjj/progression/utils/belt-progression-sections.ts` — 45 items as `PROGRESSION_SECTIONS` constant array across 5 sections per PRD §6.1 and spec REQ-BP2; Section 1 is `isInformational: true`
- [x] 2.2 Create `src/features/bjj/progression/utils/calculateProgress.ts` — `calculateProgress(checked, total)` and `calculateSectionProgress(sectionId, checked, total)` per spec REQ-BP3; round to nearest integer
- [x] 2.3 Create `src/features/bjj/progression/utils/__tests__/calculateProgress.test.ts` — vitest unit tests: 0/45=0%, 22/45=49%, 45/45=100%, informational section → 100%, section with checked/total per design §9.2

## Phase 3: TanStack Query Hooks

- [x] 3.1 Create `src/features/bjj/progression/hooks/useBeltProgression.ts` — query + toggle mutation (optimistic) + reset mutation; `queryKey: ['belt-progression']`; `staleTime: 60_000`; rollback on error per design §3
- [x] 3.2 Create `src/features/bjj/progression/hooks/useBeltProgressionUIState.ts` — query + toggle section collapse mutation (optimistic); `queryKey: ['belt-progression-ui-state']`; rollback on error per design §3

## Phase 4: UI Components

- [x] 4.1 Create `src/features/bjj/progression/components/ProgressionProgressBar.tsx` — custom progress bar: amber-400 fill on gray-700 bg, `role="progressbar"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, `aria-label`; label prop for "12/45" text; transition duration-300 per design §2 and spec §REQ-BP3
- [x] 4.2 Create `src/features/bjj/progression/components/ProgressionResetButton.tsx` — shadcn/ui Dialog with confirmation; "Reiniciar Progreso" button; Cancel/Confirm footer; disabled state while pending per design §2 and spec REQ-BP6
- [x] 4.3 Create `src/features/bjj/progression/components/ProgressionChecklistItem.tsx` — checkbox with `aria-checked`, visually hidden input + custom checkbox div; `onChange` calls `toggleItem(sectionId, item.id, !isComplete)` per spec keyboard scenario and design §7 accessibility
- [x] 4.4 Create `src/features/bjj/progression/components/ProgressionSection.tsx` — collapsible section: button header with `aria-expanded`, `aria-controls`; controlled div with max-h transition; renders `ProgressionChecklistItem` list + `ProgressionProgressBar` per design §2 and spec REQ-BP5

## Phase 5: Page + Routing

- [x] 5.1 Create `src/features/bjj/progression/pages/BeltProgressionPage.tsx` — parallel fetch via hooks; build `checkedMap` and `expandedMap` memos; client-side default collapsed state; global `ProgressionProgressBar`; render all 5 sections; render `ProgressionResetButton`; `aria-live="polite"` on progress per design §6 data flow
- [x] 5.2 Register route `/bjj/blue-belt-progression` in `src/app/router.tsx` — import `BeltProgressionPage`, add route under protected/AppShell per spec REQ-BP8
- [x] 5.3 Add navigation link to AppShell BJJ section — link to `/bjj/blue-belt-progression` labeled "Progreso Azul" or similar
- [x] 5.4 Create `src/features/bjj/progression/index.ts` — barrel export: all components, hooks, `PROGRESSION_SECTIONS`, types per design §5

## Phase 6: Testing

- [x] 6.1 Create `e2e/belt-progression.spec.ts` — Playwright tests: check item persists across refresh, collapse section persists, progress calculation 0%=0/45, check 22 items→49%, reset confirm flow, reset cancel flow per design §9.1 scenarios
- [x] 6.2 Create `e2e/a11y/belt-progression.a11y.spec.ts` — axe-core scan at `/bjj/blue-belt-progression` with `wcag2aa` tag; assert 0 critical violations per spec scenario "axe-core — no critical violations"
- [x] 6.3 Verify keyboard navigation: Tab→checkbox→Space toggles, Tab→section header→Enter collapses/expands per spec keyboard scenarios

## Phase 7: Integration Verification

- [ ] 7.1 Run `supabase db reset` + `bash scripts/seed-users.sh` + migrate, then visit page and verify all 5 sections render
- [ ] 7.2 Test persistence: check item → refresh → verify checkbox still checked
- [ ] 7.3 Test global progress: check 22 items → verify progress bar shows 49%
- [ ] 7.4 Test section collapse: expand section → refresh → verify remains collapsed
- [ ] 7.5 Test reset: check items → click reset → confirm → verify 0% and empty DB
- [ ] 7.6 Run axe-core and verify 0 critical violations