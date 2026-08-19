# Proposal: BJJ Form Review Fixes

> **Change**: `bjj-form-review-fixes`
> **Parent work**: `bjj-form-open-design-parity` (Phases A–E)
> **Trigger**: Post-implementation code review before MR
> **Issue**: [#78](https://github.com/TheFoundrySports/training-records/issues/78)

---

## Intent

The Open Design parity implementation is functionally complete but **not merge-ready**: `npm run build` fails on a missing import, `npm run lint` fails on two React hook violations, and UX logic gaps (submit gating vs action-bar copy, notes length in edit mode) undermine the parity spec. This change remediates review blockers and should-fix items in a focused PR stacked on the parity feature branch—without folding hygiene fixes back into parity phases.

---

## Scope

### In Scope (P0 — blockers)

- **T-R1** Add missing `confirmRollDraft` import in `BJJSectionEditor.tsx`
- **T-R2** Remove redundant `setEditingIndices` effect in `RollReviewPanel.tsx` (lint + verify tests)
- **T-R3** Refactor `useBJJWorkoutDraft.ts` draft detection (key remount + lazy init; no `setState` in effect)
- **T-R4** Verify `npm run build` and `npm run lint` pass with 0 errors

### In Scope (P1 — should-fix)

- **T-R5** Align `canSubmit` with roll-confirmation action-bar messaging in `useBJJFormProgress.ts`
- **T-R6** Add stepper step-3 scroll test targeting `#cardRolls` in `BJJWorkoutFormPage.test.tsx`
- **T-R7** Notes length policy: raise BJJ schema to 2000 (edit-mode safe); keep UI soft warning at 500
- **T-R8** Update `docs/features/bjj-workout-form-open-design.md` matrix rows 8–14 and status
- **T-R9** Update GitHub #78 acceptance checklist to reflect implemented criteria

### Out of Scope

- Session type / gym / coach field migration (Phase D product-gated items)
- Unrelated `ci-lint-precommit` commits and Codegraph/OpenCode `.gitignore` hygiene on `main`
- RHF `watch()` react-compiler warnings (pre-existing)
- Spanish i18n, theme toggle, reminder notifications
- Committing `test-rpc-30d.sql`

---

## Capabilities

### New Capabilities

None — remediation only.

### Modified Capabilities

- `bjj-workout-form`: submit gating MUST require full roll confirmation when rolls exist; notes schema MUST accept up to 2000 chars for edit-mode compatibility; draft restore MUST not use effect-driven state sync.

---

## Approach

| Area | Fix |
|------|-----|
| Import | Add `confirmRollDraft` to `BJJSectionEditor.tsx` import (matches `BJJFormRollsCard`) |
| RollReviewPanel | Drop redundant effect; `isEditing` already derives from `editingIndices` + `hasError` |
| Draft hook | Parent `key={user?.id}` remount + lazy `useState` initializer reads localStorage once |
| canSubmit | Require `allRolls.length === 0 \|\| confirmedRolls === allRolls.length` |
| Notes | Schema 2000; UI counter stays 500 with near-limit styling |
| Tests | Mock scroll for stepper step 3; extend form-progress coverage |

**PR strategy**: Single remediation PR (~80–150 lines) on `feat/bjj-form-review-fixes` stacked on `feat/bjj-form-open-design-parity`. Parity MR remains separate (~1,500+ lines). User may combine branches if preferred.

**Assumption (auto mode)**: Notes policy B (schema 2000, UI soft cap 500) — confirm with product if OD 500 hard cap is required.

---

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/features/bjj/components/BJJSectionEditor.tsx` | Modified | Missing import fix |
| `src/features/bjj/components/RollReviewPanel.tsx` | Modified | Remove effect-driven state |
| `src/features/bjj/hooks/useBJJWorkoutDraft.ts` | Modified | Draft init without effect |
| `src/features/bjj/pages/BJJWorkoutFormPage.tsx` | Modified | Hook key remount |
| `src/features/bjj/components/form/useBJJFormProgress.ts` | Modified | Stricter `canSubmit` |
| `src/features/bjj/bjj.schema.ts` | Modified | Notes max 2000 |
| `src/features/bjj/pages/__tests__/BJJWorkoutFormPage.test.tsx` | Modified | Stepper scroll test |
| `docs/features/bjj-workout-form-open-design.md` | Modified | Matrix + status |
| GitHub #78 | Modified | Checklist update |

---

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| RollReviewPanel UX change after effect removal | Med | Run `RollReviewPanel.test.tsx`; manual QA on error→edit flow |
| Draft restore double-flash on auth timing | Low | Key remount on `userId`; test `useBJJWorkoutDraft.test.ts` |
| Stricter submit surprises users | Low | Matches action-bar copy and spec intent |
| Notes 2000 diverges from OD 500 | Med | UI keeps 500 soft warning; document in feature doc |
| Parity diff still exceeds 400-line budget | High | Keep parity and remediation as separate MRs |

---

## Rollback Plan

Revert the remediation commit(s) on `feat/bjj-form-review-fixes`. Parity branch remains intact. If stacked, reset review-fixes branch to parity base. No DB migrations involved.

---

## Dependencies

- Parity work committed on `feat/bjj-form-open-design-parity` before applying fixes
- Existing tests: `RollReviewPanel.test.tsx`, `useBJJWorkoutDraft.test.ts`, `BJJWorkoutFormPage.test.tsx`

---

## Success Criteria

- [ ] `npm run build` passes
- [ ] `npm run lint` passes (0 errors)
- [ ] All BJJ form unit tests pass
- [ ] `canSubmit` disabled when unconfirmed rolls exist and action bar shows confirm message
- [ ] Stepper step 3 scroll test covers `#cardRolls`
- [ ] Edit mode accepts workouts with notes up to 2000 chars
- [ ] Feature doc matrix rows 8–14 updated; status reflects implementation
- [ ] GitHub issue [#78](https://github.com/TheFoundrySports/training-records/issues/78) acceptance checklist updated

---

## Review workload forecast

```text
Decision needed before apply: No
Chained PRs recommended: No
400-line budget risk: Low (~80–150 lines)
```
