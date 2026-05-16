# SDD Apply Progress: E2E React 19 + Playwright Checkbox Fix

**Change ID**: `e2e-react19-playwright-checkbox-fix`  
**Issue**: #41  
**Phase**: apply  
**Date**: 2026-05-16  
**Status**: **BLOCKED**

---

## Executive Summary

Apply phase blocked due to contradictory evidence about issue #41. Tests exhibit flakiness with **both** the original implementation (`label.click()`) and the proposed fix (`checkbox.check()`/`uncheck()`). The root cause appears to be test flakiness/race conditions rather than a React 19 incompatibility.

---

## Tasks Completed

### ✅ Phase 1: Pre-Implementation (Tasks 1.1-1.3)

| Task                        | Status        | Evidence                                                |
| --------------------------- | ------------- | ------------------------------------------------------- |
| 1.1 Verify clean state      | ✅ PASS       | Target file clean, on main branch                       |
| 1.2 Create feature branch   | ✅ PASS       | Branch `fix/41-e2e-playwright-checkbox-react19` created |
| 1.3 Baseline test execution | ⚠️ UNEXPECTED | **15/15 tests PASS** (expected 4 failures per tasks.md) |

**Deviation**: Baseline showed all tests passing with current `label.click()` implementation, contradicting issue #41 description and SDD artifacts that assumed tests were failing.

### ✅ Phase 2: Implementation (Tasks 2.1-2.2)

| Task                 | Status  | Evidence                                                |
| -------------------- | ------- | ------------------------------------------------------- |
| 2.1 Refactor method  | ✅ PASS | Method refactored to use `checkbox.check()`/`uncheck()` |
| 2.2 Verify isolation | ✅ PASS | Only `belt-progression.spec.ts` uses method             |

**Implementation attempts**:

1. **Attempt 1**: `checkbox.check()` / `checkbox.uncheck()` without force
   - Result: ❌ FAIL - Timeout, overlaying elements block clicks
2. **Attempt 2**: `checkbox.check({ force: true })` / `checkbox.uncheck({ force: true })`
   - Result: ❌ FAIL - Same timeout error
3. **Attempt 3**: `checkbox.setChecked(!isChecked, { force: true })`
   - Result: ❌ FAIL - Same timeout error

### ❌ Phase 3: Local Testing (Tasks 3.1-3.4)

| Task                           | Status     | Evidence                          |
| ------------------------------ | ---------- | --------------------------------- |
| 3.1 Run belt-progression tests | ❌ FAIL    | 2/15 tests fail with proposed fix |
| 3.2 Run full E2E suite         | ⏸️ BLOCKED | Blocked by Task 3.1 failure       |
| 3.3 Run unit tests             | ⏸️ BLOCKED | Blocked by Task 3.1 failure       |
| 3.4 Verify build               | ⏸️ BLOCKED | Blocked by Task 3.1 failure       |

**Test results with proposed fix**:

- ❌ 2/15 tests FAIL (tests 2, 5)
- ⏭️ 10/15 tests SKIP (serial mode stops after first failure)
- ✅ 3/15 tests PASS (tests 1, 3, 4)

---

## Critical Findings

### Finding 1: Test Flakiness with BOTH Implementations

Tests are **inconsistent** with both original and proposed implementations:

| Implementation              | Run 1    | Run 2   | Run 3    | Run 4   |
| --------------------------- | -------- | ------- | -------- | ------- |
| Original `label.click()`    | 15/15 ✅ | 2/15 ❌ | 15/15 ✅ | 2/15 ❌ |
| Proposed `checkbox.check()` | N/A      | 2/15 ❌ | 2/15 ❌  | 2/15 ❌ |

**Pattern**: Tests are flaky regardless of implementation. The original approach sometimes works, the proposed approach consistently fails.

### Finding 2: Playwright Checkbox API Incompatibility

All native Playwright checkbox methods fail with same error:

```
Error: locator.uncheck: Test timeout of 30000ms exceeded.
Call log:
  - locator resolved to <input checked type="checkbox" ... id="tecnicas-comienzo-0"/>
  - attempting click action
  - <div class="relative flex shrink-0">…</div> intercepts pointer events
```

**Root cause**: The `sr-only` checkbox has overlaying elements that block Playwright's actionability checks, even with `force: true`.

### Finding 3: Issue Description Contradicts Observed Behavior

| Issue #41 claims                                                                 | Observed reality                                                   |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| "7 E2E tests fail because checkbox clicks don't trigger React onChange handlers" | Tests sometimes pass with `label.click()`                          |
| "React 19 has stricter synthetic event validation"                               | Both React 19-compatible and legacy approaches fail intermittently |
| "All 466 unit tests pass — issue is E2E-specific"                                | Confirmed ✅                                                       |
| "Feature works perfectly in manual testing"                                      | Confirmed ✅                                                       |

---

## Root Cause Analysis

The actual issue is **not** React 19 incompatibility, but rather:

1. **Test flakiness** due to:
   - Race conditions in database state
   - Timing dependencies in component rendering
   - Inconsistent Supabase mutation completion

2. **Component structure** issue:
   - Overlaying `<div>` elements block direct checkbox clicks
   - `sr-only` inputs are not directly clickable via Playwright's standard actions
   - `label.click()` works _sometimes_ because HTML label association bypasses overlays

---

## Proposed Solutions

### Option 1: Fix Test Flakiness (Recommended)

**Keep** `label.click()` implementation but **add** proper waits:

```typescript
async toggleCheckboxByTestId(itemId: string) {
  const label = this.page.locator(`label[for="${itemId}"]`)
  const checkbox = this.page.locator(`input#${itemId}`)

  await label.waitFor({ state: 'visible', timeout: 5000 })

  // Capture initial state
  const wasChecked = await checkbox.isChecked()

  // Click label
  await label.click()

  // Wait for state change
  await checkbox.waitFor({
    state: wasChecked ? 'unchecked' : 'checked',
    timeout: 5000
  })

  // Wait for Supabase mutation
  await this.page.waitForTimeout(500)
}
```

**Pros**:

- Uses proven working approach (`label.click()`)
- Adds explicit waits for state changes
- Reduces flakiness

**Cons**:

- Doesn't use Playwright's "best practice" checkbox API

### Option 2: Fix Component Structure

Modify `ProgressionChecklistItem.tsx` to remove overlaying elements:

```tsx
<label htmlFor={item.id} className="relative flex shrink-0 cursor-pointer">
  <input
    type="checkbox"
    id={item.id}
    checked={isComplete}
    onChange={handleChange}
    className="peer sr-only"
  />
  <div
    data-testid={`checkbox-${item.id}`}
    className="... pointer-events-none" // Already has pointer-events-none
  />
</label>
```

**Pros**:

- Enables Playwright checkbox API
- Cleaner component structure

**Cons**:

- Requires component changes
- May affect styling/layout

### Option 3: Close Issue as "Cannot Reproduce"

**Rationale**:

- Tests pass intermittently with current implementation
- Issue description doesn't match observed behavior
- Root cause is test flakiness, not React 19 incompatibility

**Action**:

- Document flakiness findings in issue #41
- Recommend Option 1 (add proper waits) as separate issue
- Close #41 as stale/cannot reproduce

---

## Rollback Status

✅ **Reverted** to original implementation (`label.click()`)

Branch `fix/41-e2e-playwright-checkbox-react19` exists but has no commits.

---

## Blocked Tasks

### Phase 4: Stability Validation (Tasks 4.1-4.2) — ⏸️ BLOCKED

- Cannot validate stability when tests fail

### Phase 5: Commit & Document (Tasks 5.1-5.4) — ⏸️ BLOCKED

- No working fix to commit

### Phase 6: Ready for Review (Tasks 6.1-6.2) — ⏸️ BLOCKED

- No PR to prepare

---

## Decision Needed

**Question**: How should we proceed?

1. **Implement Option 1** (add waits to `label.click()` approach)?
2. **Implement Option 2** (fix component structure)?
3. **Abort SDD** and close issue #41 as "cannot reproduce"?
4. **Investigate further** to understand flakiness root cause?

**Recommendation**: **Option 1** — Add explicit waits to stabilize existing working approach. This:

- Fixes the actual problem (flakiness)
- Requires minimal changes (1 Page Object method)
- Doesn't require component refactoring
- Uses proven HTML label association pattern

---

## Files Changed

| File                                 | Status      | Changes              |
| ------------------------------------ | ----------- | -------------------- |
| `e2e/pages/belt-progression.page.ts` | ⏮️ Reverted | No changes committed |

---

## Next Steps

**If proceeding with Option 1**:

1. Update `toggleCheckboxByTestId()` with explicit state-change waits
2. Run stability validation (10 consecutive runs)
3. If stable, proceed with commit/PR phases

**If aborting**:

1. Delete feature branch
2. Update issue #41 with findings
3. Create new issue for test flakiness fix (if needed)

---

## Skill Resolution

**Status**: `injected` — Project standards were provided but implementation was blocked before full application.
