# Tasks: BJJ Workout Form — Open Design Parity

**Change**: `bjj-form-open-design-parity`
**Spec**: `openspec/changes/bjj-form-open-design-parity/specs/bjj-workout-form/spec.md`
**Design**: `openspec/changes/bjj-form-open-design-parity/design.md`
**Test runner**: `pnpm exec vitest run src/features/bjj`

---

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1,350 (250 + 300 + 200 + 250 + 350 across phases) |
| 400-line budget risk | **High** if combined |
| Chained PRs recommended | **Yes** |
| Suggested split | PR-A → PR-B → PR-C → PR-D → PR-E |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |

```text
Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High
```

---

## Phase A — Roll card anchor (~250 lines)

**REQs**: REQ-WF1 (partial), REQ-WF4

### T-A1 — Add `#cardRolls` section to form page

**Files**: `src/features/bjj/pages/BJJWorkoutFormPage.tsx`

- [ ] Render `<section className="card" id="cardRolls">` after `#cardSections`
- [ ] Aggregate rolls from `useWatch({ name: 'sections' })` with section index + goal
- [ ] Empty state when `totalRolls === 0`
- [ ] Banner copy aligned with OD roll review intro

**Acceptance**: Stepper step 3 scrolls to existing DOM node; `BJJWorkoutFormPage.test.tsx` asserts `#cardRolls` present when rolls exist

---

### T-A2 — Wire aggregated `RollReviewPanel`

**Files**: `src/features/bjj/components/RollReviewPanel.tsx`, `BJJSectionEditor.tsx`

- [ ] Panel accepts aggregated rows + callbacks to patch `sections[i].rolls[j]`
- [ ] Add `hideRollReview` on section editor; hide inline panel when page shows `#cardRolls`
- [ ] Preserve AI enhance flow in section editor

**Acceptance**: Editing roll in `#cardRolls` updates RHF state; save still works

---

### T-A3 — Progress + summary roll counts

**Files**: `src/features/bjj/components/form/useBJJFormProgress.ts`, `BJJFormSummarySidebar.tsx`

- [ ] Track `confirmedRolls` from draft `confirmed` flag (default unconfirmed)
- [ ] Summary shows `M of N confirmed` when N > 0
- [ ] Export `confirmedRolls` on `FormProgress`

**Acceptance**: Unit test or page test for count updates on confirm

---

## Phase B — Per-roll interaction (~300 lines)

**REQs**: REQ-WF5

### T-B1 — Read/edit toggle per roll

**Files**: `src/features/bjj/components/RollReviewPanel.tsx`, `src/features/bjj/bjj.types.ts`

- [ ] Add optional `confirmed?: boolean` to roll draft type
- [ ] Read view: role, outcome, `.flow-read` from position labels
- [ ] Edit view: existing selects; Confirm / Edit / Discard buttons

**Acceptance**: `RollReviewPanel.test.tsx` covers confirm toggle and discard

---

### T-B2 — Flow read helper

**Files**: `src/features/bjj/components/RollReviewPanel.tsx` (or small util)

- [ ] Build arrow chain from position key → display label map
- [ ] No free-text position input

**Acceptance**: Read mode shows labels not raw keys

---

### T-B3 — Demote batch confirm

**Files**: `RollReviewPanel.tsx`

- [ ] Keep "Confirm all" as secondary or remove when all rows support individual confirm
- [ ] Option A gate unchanged

**Acceptance**: Invalid rolls still block `canSubmit`

---

## Phase C — Technique picker (~200 lines)

**REQs**: REQ-WF7

### T-C1 — Category chip filters

**Files**: `src/features/bjj/components/TechniqueSearch.tsx`, `src/theme/material-dashboard.css`

- [x] Chip row from catalog categories
- [x] Filter pick list by active chip + search query
- [x] CSS: `.chip-filters`, `.chip-filter`

**Acceptance**: Selecting chip reduces list; clear restores

---

### T-C2 — Empty state + a11y

**Files**: `TechniqueSearch.tsx`

- [x] `.empty-note` when zero results
- [x] `aria-live="polite"` for selection feedback

**Acceptance**: Empty search shows message, not blank panel

---

## Phase D — Session polish (~250 lines)

**REQs**: REQ-WF2 (partial), REQ-WF8

### T-D1 — Notes card with counter

**Files**: `BJJWorkoutFormPage.tsx`, `material-dashboard.css`

- [x] Move or duplicate notes to `#cardReview` or `#cardNotes`
- [x] 500 char counter (`.field-foot`, `.count`)

**Acceptance**: Counter updates on input; schema max respected

---

### T-D2 — Intensity range slider (optional UX)

**Files**: `BJJWorkoutFormPage.tsx`, CSS `.range-head`, `.range-scale`

- [x] Map range 1–10 to existing `rpe` field
- [x] Verbal labels at 1, 5, 10

**Acceptance**: Slider and number stay in sync if both shown

---

### T-D3 — Session type (product-gated)

**Files**: migration, `bjj.schema.ts`, `BJJWorkoutFormPage.tsx`

- [ ] **Block until product approves** optional `session_type` column
- [ ] `.seg-radio` segmented control

**Acceptance**: Migration + form field + RPC pass-through

---

## Phase E — Draft + preferences (~350 lines)

**REQs**: REQ-WF9

### T-E1 — Save draft hook

**Files**: `src/features/bjj/hooks/useBJJWorkoutDraft.ts`, `BJJFormActionBar.tsx`

- [x] localStorage key `bjj-workout-draft:{userId}`
- [x] Save draft button in action bar
- [x] Restore prompt on `/bjj/workouts/new`

**Acceptance**: Unit tests with mocked storage; restore repopulates form

---

### T-E2 — Preferences sidebar stubs

**Files**: `BJJFormSummarySidebar.tsx`, CSS `.pref-list`, `.switch`

- [x] Second card with toggles (UI-only initially)
- [x] Document deferred wiring in feature doc

**Acceptance**: Renders without breaking summary layout

---

## Verification gates

| Gate | Command |
|------|---------|
| Per PR | `pnpm exec vitest run src/features/bjj` |
| Per PR | `pnpm run lint` (changed files clean) |
| Per PR | `pnpm run build` |
| End of change | `sdd-verify` against `bjj-workout-form` spec |

---

## PR chain map

| PR | Tasks | ~Lines |
|----|-------|--------|
| PR-A | T-A1, T-A2, T-A3 | ~250 |
| PR-B | T-B1, T-B2, T-B3 | ~300 |
| PR-C | T-C1, T-C2 | ~200 |
| PR-D | T-D1, T-D2, (T-D3 if approved) | ~250 |
| PR-E | T-E1, T-E2 | ~350 |
