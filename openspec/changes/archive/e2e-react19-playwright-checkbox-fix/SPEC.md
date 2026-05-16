# SDD Spec: E2E React 19 + Playwright Checkbox Fix

**Change ID**: `e2e-react19-playwright-checkbox-fix`  
**Issue**: #41  
**Phase**: spec  
**Date**: 2026-05-16

---

## Problem Statement

E2E tests for BJJ Blue Belt Progression fail because Playwright's `label.click()` does not trigger React 19 `onChange` handlers on controlled checkboxes. React 19 requires genuine user interactions, which the native checkbox API (`check()`, `uncheck()`) provides.

**Root cause**: React 19's stricter synthetic event validation rejects programmatic clicks/dispatches as non-genuine.

**Evidence**: 2/7 tests fail (5 skip in serial mode), all 466 unit tests pass, feature works in manual testing.

---

## Goals

1. **Fix Page Object method** to use Playwright's native checkbox API
2. **All 7 E2E tests pass** without flakiness
3. **Maintain backward compatibility** in Page Object interface
4. **Preserve accessibility** (no component changes)
5. **Document solution** for future reference

---

## Non-Goals

- ❌ Component changes (component is correct, has stable IDs)
- ❌ Unit test changes (unit tests already pass)
- ❌ Other E2E test refactoring (only belt-progression affected)
- ❌ Bulk operation helpers (defer to future)
- ❌ Wait timeout optimization (keep existing 500ms for Supabase)

---

## Acceptance Criteria

### AC1: Page Object Method Implementation

**File**: `e2e/pages/belt-progression.page.ts`

**Method**: `toggleCheckboxByTestId(itemId: string)`

**Specification**:

```typescript
/**
 * Toggle a checkbox by its item ID.
 * Uses Playwright's native checkbox API to trigger React 19 onChange handlers.
 *
 * @param itemId - The checkbox item ID (e.g., 'tecnicas-comienzo-0')
 * @throws {Error} If checkbox is not found within 5 seconds
 * @throws {Error} If checkbox is not attached to DOM
 */
async toggleCheckboxByTestId(itemId: string): Promise<void> {
  const checkbox = this.page.locator(`input#${itemId}`)

  // Wait for checkbox to be attached (not necessarily visible due to sr-only)
  await checkbox.waitFor({ state: 'attached', timeout: 5000 })

  // Check current state and toggle
  const isChecked = await checkbox.isChecked()
  if (isChecked) {
    await checkbox.uncheck()
  } else {
    await checkbox.check()
  }

  // Wait for Supabase mutation to complete
  await this.page.waitForTimeout(500)
}
```

**Rationale for design decisions**:

- **Keep toggle behavior**: Backward compatible with existing test code (no test refactoring needed)
- **Use `attached` state**: `sr-only` inputs are not visible but are attached to DOM
- **Explicit if/else**: More readable than `setChecked(!(await checkbox.isChecked()))`
- **Keep 500ms wait**: Existing wait for Supabase persistence, not React state
- **5 second timeout**: Standard Playwright timeout for element operations

**Alternative considered and rejected**:

```typescript
// Split into checkItem() / uncheckItem() — rejected for backward compatibility
async checkItem(itemId: string) { ... }
async uncheckItem(itemId: string) { ... }
```

### AC2: Test Scenario Validation

All 7 tests in `e2e/belt-progression.spec.ts` must pass:

#### Test 1: `displays all 5 sections on page load`

**Expected**: ✅ No changes (doesn't use checkboxes)  
**Status**: Already passing

#### Test 2: `check item persists across refresh`

**Scenario**:

1. Expand Técnicas section
2. Toggle checkbox `tecnicas-comienzo-0`
3. Verify checkbox is checked
4. Refresh page
5. Re-expand section
6. Verify checkbox still checked

**Expected**: ✅ Checkbox checked after toggle, persists after refresh  
**Current**: ❌ Checkbox remains unchecked after toggle

#### Test 3: `collapse section persists across refresh`

**Expected**: ✅ No changes (doesn't use checkboxes)  
**Status**: Already passing

#### Test 4: `progress calculation — 0 items checked = 0%`

**Expected**: ✅ No changes (reset uses button, not checkbox toggle)  
**Status**: Already passing

#### Test 5: `check 22 items → progress = 51%`

**Scenario**:

1. Expand Técnicas section
2. Toggle 22 checkboxes (4+5+8+5 from subsections)
3. Verify global progress bar shows 51%

**Expected**: ✅ All 22 checkboxes checked, progress = 51%  
**Current**: ❌ Checkboxes don't check, progress = 0%

#### Test 6: `reset with confirmation — confirm clears all progress`

**Scenario**:

1. Expand Técnicas section
2. Toggle checkbox `tecnicas-comienzo-0`
3. Open reset dialog
4. Confirm reset
5. Verify progress = 0% and checkbox unchecked

**Expected**: ✅ Checkbox checked before reset, unchecked after  
**Current**: ❌ Checkbox never checks in step 2

#### Test 7: `reset with confirmation — cancel leaves state unchanged`

**Scenario**:

1. Expand Técnicas section
2. Toggle checkbox `tecnicas-comienzo-0`
3. Verify checkbox is checked
4. Open reset dialog
5. Cancel reset
6. Verify checkbox still checked

**Expected**: ✅ Checkbox remains checked after cancel  
**Current**: ❌ Checkbox never checks in step 2

**Summary**: Tests 2, 5, 6, 7 fail due to checkbox toggle. Fix will make all 7 pass.

### AC3: Error Handling

**Timeout scenarios**:

1. **Checkbox not found**:

   ```typescript
   // Should throw clear error after 5 seconds
   Error: Timeout 5000ms exceeded waiting for locator('input#invalid-id')
   ```

2. **Checkbox not attached**:
   ```typescript
   // Should throw if checkbox is removed from DOM
   Error: Element is not attached to the DOM
   ```

**No new error handling needed** — Playwright's native errors are clear and actionable.

### AC4: Performance Criteria

**Baseline** (from current test runs):

- Single toggle: ~500ms (wait for Supabase)
- Test with 22 toggles: ~11 seconds (22 × 500ms)
- Full 7-test suite: ~30-40 seconds

**Acceptance**:

- Single toggle: ≤600ms (allow 100ms overhead)
- Test with 22 toggles: ≤13 seconds (allow tolerance)
- Full 7-test suite: ≤45 seconds (allow serial mode overhead)

**No performance regression expected** — API change is internal to Playwright.

### AC5: Stability Criteria

**Flakiness acceptance**: 0 failures in 10 consecutive runs

**Validation**:

```bash
# Run 10 times to verify no flakiness
for i in {1..10}; do npm run test:e2e -- belt-progression.spec.ts; done
```

**Expected**: All runs pass (70/70 tests total across 10 runs)

### AC6: Accessibility Preservation

**No component changes** → No accessibility impact

**Verification** (manual):

1. ✅ Keyboard navigation: Tab to checkbox, Space to toggle
2. ✅ Screen reader: Announces "checkbox, [label], checked/unchecked"
3. ✅ Focus visible: Yellow ring on focus
4. ✅ Semantic HTML: `<input type="checkbox">` unchanged

**WCAG 2.2 compliance maintained** (see EXPLORE.md section 6).

---

## Edge Cases

### Edge Case 1: Checkbox in Collapsed Section

**Scenario**: Test tries to toggle checkbox in collapsed section

**Expected behavior**: Playwright throws error (element not visible/actionable)

**Mitigation**: Tests already call `expandSection()` before toggling (no change needed)

**Test coverage**: All existing tests expand sections first ✅

### Edge Case 2: Rapid Multiple Toggles

**Scenario**: Test toggles same checkbox multiple times quickly

**Expected behavior**: Idempotency — `check()` on checked = no-op, `uncheck()` on unchecked = no-op

**Mitigation**: None needed (Playwright API handles this)

**Test coverage**: No current test does this (not a regression risk)

### Edge Case 3: Database State Pollution

**Scenario**: Previous test leaves checkboxes in checked state

**Expected behavior**: Tests run in serial mode, reset test clears state

**Mitigation**: Existing `test.describe.configure({ mode: 'serial' })` + reset test

**Test coverage**: Test 4 (`progress calculation — 0 items checked`) runs reset first ✅

### Edge Case 4: Input Element Removed During Toggle

**Scenario**: React removes checkbox while test is toggling (race condition)

**Expected behavior**: Playwright throws "Element is not attached to DOM"

**Mitigation**: None needed (test should fail if component behavior changes)

**Test coverage**: No current scenario causes this (not expected)

### Edge Case 5: Multiple Checkboxes with Same Pattern

**Scenario**: Test toggles 22 different checkboxes in one test

**Expected behavior**: Each toggle succeeds independently

**Mitigation**: Stable IDs (`tecnicas-comienzo-0`, `tecnicas-pasados-1`, etc.)

**Test coverage**: Test 5 (`check 22 items → progress = 51%`) validates this ✅

---

## Implementation Plan

### Step 1: Update Page Object Method

**File**: `e2e/pages/belt-progression.page.ts`  
**Lines**: 60-65  
**Action**: Replace `label.click()` with `checkbox.check()`/`checkbox.uncheck()`

### Step 2: Run E2E Tests

**Command**: `npm run test:e2e -- belt-progression.spec.ts`  
**Expected**: 7/7 tests pass

### Step 3: Validate Stability

**Command**: Run tests 10 times  
**Expected**: 0 failures across 70 total test runs

### Step 4: Update Documentation

**File**: Issue #41  
**Action**: Add comment with solution summary and link to PR

---

## Success Metrics

| Metric            | Current        | Target         | How to Measure                       |
| ----------------- | -------------- | -------------- | ------------------------------------ |
| Passing E2E tests | 5/7 (71%)      | 7/7 (100%)     | `npm run test:e2e`                   |
| Unit tests        | 466/466 (100%) | 466/466 (100%) | `npm test` (no regression)           |
| Flakiness rate    | N/A            | 0/10 (0%)      | Run suite 10 times                   |
| Test duration     | ~30s           | ≤45s           | Playwright reporter                  |
| Files changed     | 0              | 1              | `e2e/pages/belt-progression.page.ts` |
| Lines changed     | 0              | ~10            | Single method update                 |

---

## Risks & Mitigations

| Risk                            | Impact | Likelihood | Mitigation                                       | Residual Risk |
| ------------------------------- | ------ | ---------- | ------------------------------------------------ | ------------- |
| `check()` doesn't fire onChange | High   | Low        | Documented in project skills as React-compatible | 🟢 Low        |
| Tests still flaky               | Medium | Low        | Idempotency + existing waits                     | 🟢 Low        |
| Regression in other tests       | Low    | Low        | Only belt-progression uses checkboxes            | 🟢 Low        |
| Accessibility broken            | High   | Very Low   | No component changes                             | 🟢 Low        |

**Overall Risk**: 🟢 **LOW**

---

## Open Questions

### Q1: Should we split toggle into check/uncheck methods?

**Answer**: No — keep toggle for backward compatibility (no test refactoring needed)

### Q2: Should we add explicit error messages?

**Answer**: No — Playwright's native errors are already clear and actionable

### Q3: Should we reduce wait timeouts?

**Answer**: No — 500ms is for Supabase mutation, not React state (optimizing would be premature)

### Q4: Should we add bulk operation helper?

**Answer**: Defer to future — not in scope for this fix

---

## Dependencies

**Blocked by**: None

**Blocks**: None (this is a bugfix, not a feature dependency)

**External dependencies**: None (Playwright 1.59.1 already installed)

---

## Rollback Plan

**If fix fails**:

1. Revert `e2e/pages/belt-progression.page.ts` to use `label.click()`
2. Skip failing E2E tests with `.skip`
3. Re-evaluate solution (e.g., Option 1 from issue #41: React Testing Library)

**Risk of rollback**: Low — change is isolated to one method

---

## Related Documentation

- **Issue**: #41
- **Init report**: `openspec/changes/e2e-react19-playwright-checkbox-fix/INIT.md`
- **Explore report**: `openspec/changes/e2e-react19-playwright-checkbox-fix/EXPLORE.md`
- **Project skills**: `.agents/skills/playwright-best-practices/testing-patterns/forms-validation.md`

---

## Approval Criteria

✅ **Spec approved when**:

1. All acceptance criteria are clear and testable
2. Edge cases are documented with mitigation strategies
3. Performance and stability criteria are defined
4. No open questions remain unanswered
5. User/stakeholder review (if required)

**Approved by**: (Pending user confirmation)

**Next phase**: `design` → Define implementation details for the Page Object method update
