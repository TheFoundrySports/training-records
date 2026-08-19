# Exploration: BJJ Form Review Fixes

> **Change**: `bjj-form-review-fixes`
> **Parent work**: `bjj-form-open-design-parity` (Phases A–E, uncommitted on `main`)
> **Trigger**: Post-implementation code review before MR
> **Delivery strategy**: single-pr (~400-line budget for remediation only)

---

## Executive summary

The Open Design parity implementation (Phases A–E) is functionally complete in the working tree but **not merge-ready**: `npm run build` fails on a missing `confirmRollDraft` import, and `npm run lint` fails on two `react-hooks/set-state-in-effect` violations. Additional UX inconsistencies (`canSubmit` vs action-bar copy, notes length in edit mode) and a missing stepper scroll test should ship in the same remediation PR. **Recommend a separate SDD change `bjj-form-review-fixes`** applied on top of the parity work—not folded back into parity phases—because parity artifacts are feature delivery while this change is CI/hygiene remediation before MR.

---

## Current state

### Build & lint (verified)

| Check | Result | Root cause |
|-------|--------|------------|
| `npm run build` | **FAIL** | `BJJSectionEditor.tsx:100` calls `confirmRollDraft` but import line 8 only includes `confirmRollDrafts, proposalToDraft` |
| `npx tsc --noEmit` | Pass | Uses different project refs than `tsc -b` build |
| `npm run lint` | **FAIL (2 errors)** | `RollReviewPanel.tsx:70` — `setEditingIndices` in `useEffect`; `useBJJWorkoutDraft.ts:115` — `setPendingRestore` in `useEffect` |
| `npm run lint` | 2 warnings | RHF `watch()` incompatible-library (pre-existing pattern; not blockers) |

### Working tree hygiene

- Branch: `main`, **4 commits ahead** of `origin/main` (includes unrelated `ci-lint-precommit` openspec + `.gitignore` for Codegraph/OpenCode).
- **All parity work is uncommitted**: ~1,007 insertions / 486 deletions across 13 modified files, plus ~551 lines in 5 new untracked BJJ files and openspec/docs artifacts.
- `test-rpc-30d.sql` is untracked ad-hoc SQL — **must not be committed** (add to `.gitignore` or leave untracked).

### Feature completeness vs tracking

- **Issue [#78](https://github.com/TheFoundrySports/training-records/issues/78)** acceptance checklist is stale (all items unchecked) despite substantial implementation in the working tree.
- **`docs/features/bjj-workout-form-open-design.md`** feature matrix rows 8–14 still show ❌/⚠️ for items now implemented (e.g. `#cardRolls`, preferences, save draft); status header still says "Planning".

### UX logic gaps (confirmed in code)

**`canSubmit` vs action message mismatch** (`useBJJFormProgress.ts`):

```typescript
// actionMessage (lines 101–107): warns when unconfirmed rolls exist
actionMessage = `Confirm ${allRolls.length - confirmedRolls} roll(s) before saving.`

// canSubmit (line 124): does NOT require roll confirmation
canSubmit: sessionOk && techniquesOk && rollsOk && !formError
// rollsOk only checks validation_error === 0
```

Save button stays **enabled** while action bar says "Confirm N rolls before saving."

**Notes max 500 vs shared workout schema 2000**:

| Layer | Limit | File |
|-------|-------|------|
| BJJ form schema + UI counter | 500 (`BJJ_SESSION_NOTES_MAX`) | `bjj.schema.ts`, `BJJWorkoutFormPage.tsx` |
| Shared workout schema | 2000 | `workout.schema.ts` |
| DB column | `text` (unbounded) | `workouts.notes` migration |
| OD spec | 500 | `bjj-form-open-design-parity` spec |

Edit mode loads `existingWorkout.notes` via `useWorkout` (lines 93–97). Workouts saved with 501–2000 char notes (valid under general workout schema) will **fail Zod on submit** in the BJJ form without UI warning.

**Missing test**: `BJJFormStepper` calls `scrollToFormSection(step.targetId)` and step 3 targets `cardRolls`, but `BJJWorkoutFormPage.test.tsx` only asserts DOM presence—not scroll behavior (T-A1 acceptance in `tasks.md`).

---

## Affected files

### Blockers (must fix before MR)

| File | Issue |
|------|-------|
| `src/features/bjj/components/BJJSectionEditor.tsx` | Missing `confirmRollDraft` import (TS2552) |
| `src/features/bjj/components/RollReviewPanel.tsx` | Lint: `setEditingIndices` in `useEffect` (line 69–77) |
| `src/features/bjj/hooks/useBJJWorkoutDraft.ts` | Lint: `setPendingRestore` in `useEffect` (line 109–117) |

### Should-fix (same remediation PR)

| File | Issue |
|------|-------|
| `src/features/bjj/components/form/useBJJFormProgress.ts` | Align `canSubmit` with roll confirmation messaging |
| `src/features/bjj/pages/__tests__/BJJWorkoutFormPage.test.tsx` | Add stepper step-3 scroll test for `#cardRolls` |
| `src/features/bjj/bjj.schema.ts` | Notes length policy vs edit-mode compatibility (see approaches) |
| `docs/features/bjj-workout-form-open-design.md` | Update feature matrix + status (hygiene) |
| GitHub issue #78 | Check off completed acceptance items |

### Branch / commit hygiene (process, not code)

| Item | Action |
|------|--------|
| Uncommitted parity on `main` | Create feature branch; commit parity work under `bjj-form-open-design-parity` |
| 4 local commits on `main` | Rebase or split: BJJ commits vs `ci-lint-precommit` / ignore commits |
| `test-rpc-30d.sql` | Exclude from all commits |
| Review budget | Parity ~1,500+ lines exceeds 400; remediation ~80–150 lines fits single PR |

### Reference / no change needed

| File | Notes |
|------|-------|
| `src/features/bjj/components/form/BJJFormRollsCard.tsx` | Correctly imports `confirmRollDraft` |
| `src/features/bjj/bjj.schema.ts` | Defines `confirmRollDraft` at line 82 |
| `src/features/bjj/components/form/BJJFormStepper.tsx` | Scroll wiring already correct |

---

## Approaches

### 1. Missing import (blocker)

| Approach | Pros | Cons | Effort |
|----------|------|------|--------|
| **A. Add `confirmRollDraft` to import** | One-line fix; matches `BJJFormRollsCard` | — | Low |
| B. Inline `confirmRollDrafts([item])[0]` | Avoids import | Ugly, inconsistent | Low |

**Recommendation**: A.

### 2. RollReviewPanel lint (blocker)

| Approach | Pros | Cons | Effort |
|----------|------|------|--------|
| **A. Remove redundant `useEffect`** | `isEditing` already equals `editingIndices.has(index) \|\| hasError` (line 148); effect duplicates error handling | Must verify Done-edit UX after error fix | Low |
| B. Derive error indices in render via `useMemo` | Explicit | Extra state merge logic | Med |
| C. `eslint-disable-next-line` with comment | Fast | Project has pattern in react-bits but review flagged as hygiene fail | Low |

**Recommendation**: A — the effect is redundant given existing `hasError` branch in `isEditing`.

### 3. useBJJWorkoutDraft lint (blocker)

| Approach | Pros | Cons | Effort |
|----------|------|------|--------|
| **A. Key hook remount + lazy `useState` init** | Parent passes `key={user?.id}`; initializer reads localStorage once when `enabled && userId` | Small page change | Low–Med |
| B. Lift draft read to `BJJWorkoutFormPage` after auth | Hook stays pure; no effect | More props | Med |
| C. `eslint-disable-next-line` | Matches react-bits precedent | Review explicitly flagged | Low |

**Recommendation**: A — aligns with React "you might not need an effect" guidance.

### 4. canSubmit vs roll confirmation (should-fix)

| Approach | Pros | Cons | Effort |
|----------|------|------|--------|
| **A. Extend `canSubmit`**: require `allRolls.length === 0 \|\| confirmedRolls === allRolls.length`** | Matches action-bar copy; prevents saving unconfirmed rolls | Stricter than current behavior | Low |
| B. Soften action message to informational only | No submit block | Rolls may save unconfirmed to dashboard | Low |

**Recommendation**: A — spec intent is confirmed rolls feed metrics.

### 5. Notes 500 vs 2000 (should-fix / product)

| Approach | Pros | Cons | Effort |
|----------|------|------|--------|
| A. Keep 500 (OD parity) + truncate on edit load with banner | Preserves OD UX | Data loss for legacy long notes | Med |
| **B. Raise schema to 2000, keep UI soft warning at 500** | Edit-mode safe; DB already unbounded | Diverges from OD hard cap | Low |
| C. Raise to 2000 everywhere including counter | Full alignment with workout schema | Breaks OD 500 spec | Low |

**Recommendation**: B as default (minimal edit-mode breakage); confirm with product if OD 500 is hard requirement.

### 6. Change boundary: parity vs review-fixes

| Approach | Pros | Cons | Effort |
|----------|------|------|--------|
| **A. New change `bjj-form-review-fixes`** | Clear MR scope; fits single-pr remediation; parity artifacts stay feature-focused | Two SDD folders | Low |
| B. Phase F under `bjj-form-open-design-parity` | Single change name | Blurs feature vs fix; parity tasks already marked phased | Med |

**Recommendation**: A — user-named change matches review-remediation scope.

---

## Recommended fix tasks

### P0 — Blockers (ship first)

- [ ] **T-R1** Add `confirmRollDraft` to `BJJSectionEditor.tsx` import from `../bjj.schema`
- [ ] **T-R2** Remove redundant `useEffect` in `RollReviewPanel.tsx` (or refactor per approach 2A); run `RollReviewPanel.test.tsx`
- [ ] **T-R3** Refactor `useBJJWorkoutDraft.ts` draft detection to avoid `setState` in effect (key remount + lazy init); run `useBJJWorkoutDraft.test.ts`
- [ ] **T-R4** Verify `npm run build` and `npm run lint` pass (0 errors)

### P1 — Should-fix (same PR, ~80–150 lines)

- [ ] **T-R5** Update `canSubmit` in `useBJJFormProgress.ts` to require full roll confirmation when rolls exist; add unit/page test
- [ ] **T-R6** Add test: stepper step 3 click calls scroll targeting `#cardRolls` (mock `scrollTo` / `getBoundingClientRect`)
- [ ] **T-R7** Resolve notes length policy (recommend schema 2000 + UI counter stays 500 with near-limit styling, or document truncation)
- [ ] **T-R8** Update `docs/features/bjj-workout-form-open-design.md` matrix rows 8–14 and status
- [ ] **T-R9** Update GitHub #78 checklist to reflect implemented acceptance criteria

### P2 — Branch hygiene (before/at MR)

- [ ] **T-R10** Create feature branch from appropriate base; commit parity work (exclude `test-rpc-30d.sql`)
- [ ] **T-R11** Separate or rebase unrelated commits (`ci-lint-precommit`, codegraph gitignore) from BJJ form MR
- [ ] **T-R12** Apply review-fixes commit(s) on top; keep total remediation diff under 400 lines

### P3 — Defer

- [ ] RHF `watch()` react-compiler warnings (pre-existing; not introduced by parity)
- [ ] Session type / gym / coach fields (Phase D product-gated items)
- [ ] Spanish i18n / theme toggle

---

## Review workload forecast (remediation only)

| Field | Value |
|-------|-------|
| Estimated changed lines | ~80–150 (blockers + should-fix) |
| 400-line budget risk | **Low** |
| Chained PRs recommended | **No** (single remediation PR on feature branch) |
| Parent parity diff | ~1,500+ lines — separate MR or stacked branch |

```text
Decision needed before apply: No
Chained PRs recommended: No
400-line budget risk: Low
```

---

## Risks

1. **Removing RollReviewPanel effect** may change edit-mode persistence after fixing validation errors — needs manual QA + existing tests.
2. **Draft restore refactor** depends on auth `userId` timing; key remount must not flash restore banner twice.
3. **Stricter `canSubmit`** may surprise users who relied on saving with unconfirmed rolls (likely intentional per spec).
4. **Notes policy** without product call may either break edit for legacy data (keep 500) or diverge from OD (raise to 2000).
5. **Commit hygiene**: mixing `ci-lint-precommit` with BJJ form in one MR increases review noise and CI scope.
6. **Parity diff size** still exceeds 400-line budget even after fixes — MR strategy must split parity delivery from remediation or accept exception.

---

## Ready for proposal

**Yes** — scope is clear, root causes confirmed in running build/lint, fixes are localized. Next: `sdd-propose` for `bjj-form-review-fixes` with P0/P1 tasks, then apply after parity work is committed to a feature branch.
