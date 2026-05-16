# SDD Design: E2E React 19 + Playwright Checkbox Fix

**Change ID**: `e2e-react19-playwright-checkbox-fix`  
**Issue**: #41  
**Phase**: design  
**Date**: 2026-05-16

---

## Executive Summary

**Design Goal**: Refactor `BeltProgressionPage.toggleCheckboxByTestId()` to use Playwright's native checkbox API (`check()`, `uncheck()`) instead of `label.click()`, enabling React 19 synthetic event handlers to fire correctly.

**Scope**: Single-method refactor in `e2e/pages/belt-progression.page.ts` (lines 60-65)

**Impact**:

- ✅ Fixes 4 failing E2E tests (tests 2, 5, 6, 7)
- ✅ No component changes required
- ✅ No test code changes required (Page Object abstraction)
- ✅ No regression risk (isolated to belt-progression tests)

---

## Architecture Overview

### Current Architecture (Broken)

```
Test Code
  ↓ calls
BeltProgressionPage.toggleCheckboxByTestId(itemId)
  ↓ locates & clicks
<label for="itemId">
  ↓ HTML association triggers
<input id="itemId" onChange={handleChange}>
  ↓ React 19 validation
❌ REJECTS: Not a genuine user interaction
```

**Why it fails**: `label.click()` triggers HTML-level state change but React 19 rejects the synthetic event as programmatic.

### New Architecture (Fixed)

```
Test Code
  ↓ calls (unchanged)
BeltProgressionPage.toggleCheckboxByTestId(itemId)
  ↓ locates & checks/unchecks
<input id="itemId" onChange={handleChange}>
  ↓ React 19 validation
✅ ACCEPTS: Playwright check()/uncheck() simulates genuine interaction
```

**Why it works**: Playwright's `check()`/`uncheck()` methods are specifically designed to trigger React synthetic events correctly.

---

## Detailed Design

### 1. Method Refactoring

#### Current Implementation (Lines 60-65)

```typescript
/**
 * Toggle a checkbox by clicking its label.
 * The label triggers the hidden checkbox via htmlFor/id association.
 */
async toggleCheckboxByTestId(itemId: string) {
  const label = this.page.locator(`label[for="${itemId}"]`)
  await label.waitFor({ state: 'visible', timeout: 5000 })
  await label.click()
  await this.page.waitForTimeout(500) // Wait for React state + Supabase mutation
}
```

**Problems**:

1. ❌ Targets label instead of input
2. ❌ Uses `.click()` which doesn't fire React 19 onChange
3. ❌ Waits for `visible` state (label is visible, but input is `sr-only`)
4. ❌ Comment is misleading (claims HTML association works)

#### New Implementation (Target)

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

**Improvements**:

1. ✅ Targets input directly via stable `id`
2. ✅ Uses `check()`/`uncheck()` which fire React 19 onChange
3. ✅ Waits for `attached` state (correct for `sr-only` inputs)
4. ✅ JSDoc documents behavior, parameters, and exceptions
5. ✅ Explicit return type `Promise<void>`

---

### 2. Selector Strategy

#### Selector: `input#${itemId}`

**Why this selector**:

- ✅ **Stable**: Component guarantees `id={item.id}` on input
- ✅ **Specific**: ID selector is the most specific (no ambiguity)
- ✅ **Fast**: ID lookup is O(1) in DOM
- ✅ **Accessible**: Works with `sr-only` hidden inputs

**Alternatives considered and rejected**:

| Alternative                                        | Why Rejected                             |
| -------------------------------------------------- | ---------------------------------------- |
| `label[for="${itemId}"]`                           | Current broken approach                  |
| `[data-testid="checkbox-${itemId}"]`               | Targets visual div, not input            |
| `input[aria-label="${item.label}"]`                | Fragile, label text may change           |
| `this.page.getByRole('checkbox', { name: label })` | Requires knowing label text, not just ID |

#### Locator Type: `this.page.locator()`

**Why `locator()` instead of `getByRole()`**:

- ✅ ID selector is simpler and more direct
- ✅ `getByRole()` would require label text (not available in test)
- ✅ Consistent with other selectors in the Page Object

---

### 3. Wait Strategy

#### Two-Phase Wait Design

##### Phase 1: Element Wait (Line 4)

```typescript
await checkbox.waitFor({ state: 'attached', timeout: 5000 })
```

**Purpose**: Ensure checkbox exists in DOM before interaction

**State choice**: `attached`

- ❌ **Not `visible`**: Input has `sr-only` class (visually hidden)
- ✅ **`attached`**: Element is in DOM and accessible to Playwright
- ❌ **Not `detached`**: Would wait for removal (wrong intent)

**Timeout**: 5000ms (5 seconds)

- Standard Playwright default
- Matches existing Page Object timeout patterns
- Sufficient for React rendering + network delays

**Error if fails**:

```
Error: Timeout 5000ms exceeded waiting for locator('input#tecnicas-comienzo-0')
```

##### Phase 2: Mutation Wait (Line 11)

```typescript
await this.page.waitForTimeout(500)
```

**Purpose**: Allow Supabase optimistic mutation to complete

**Duration**: 500ms

- Matches current implementation (proven sufficient)
- Not for React state (instantaneous)
- For database persistence to complete

**Why not removed**:

- ❌ Tests verify persistence across refresh → needs DB write
- ❌ Removing would cause flakiness in Test 2 (check persists)
- ✅ 500ms is empirically validated baseline

**Alternative considered**:

```typescript
// Wait for network idle instead of fixed timeout
await this.page.waitForLoadState('networkidle')
```

**Rejected**: Overkill for single mutation, adds ~2s overhead per toggle

---

### 4. Toggle Logic Design

#### State-Aware Toggle (Lines 7-10)

```typescript
const isChecked = await checkbox.isChecked()
if (isChecked) {
  await checkbox.uncheck()
} else {
  await checkbox.check()
}
```

**Design rationale**:

1. **Read current state first**: Prevents assumptions about DB state
2. **Explicit if/else**: More readable than ternary or `setChecked()`
3. **Idempotent actions**: `check()` on checked = no-op, `uncheck()` on unchecked = no-op

**Why not alternatives**:

| Alternative                                                | Why Rejected                  |
| ---------------------------------------------------------- | ----------------------------- |
| `await checkbox.setChecked(!(await checkbox.isChecked()))` | Less readable, double `await` |
| Always `check()` then `uncheck()`                          | Wasteful, breaks semantics    |
| `await checkbox.click()`                                   | Back to the original problem  |

#### Idempotency Benefits

**Scenario**: Test calls `toggleCheckboxByTestId()` twice

```typescript
// Current state: unchecked
await page.toggleCheckboxByTestId('item-0') // → checked
await page.toggleCheckboxByTestId('item-0') // → unchecked
```

✅ **Correct**: Each call reads state before toggling

**If we used `setChecked(true)` always**:

```typescript
await page.checkItem('item-0') // → checked
await page.checkItem('item-0') // → checked (no-op, idempotent)
```

✅ **Also correct**: Idempotency prevents double-toggle bugs

---

### 5. Error Handling Strategy

#### Design Decision: Rely on Playwright Native Errors

**No custom try/catch** — Let Playwright errors bubble up

**Rationale**:

1. ✅ Playwright errors are **clear and actionable**
2. ✅ Include **locator string** in error message
3. ✅ Include **timeout value** in error message
4. ✅ Playwright **screenshots on failure** (configured in playwright.config.ts)

#### Error Scenarios

##### Scenario 1: Checkbox Not Found

**Trigger**: `itemId` doesn't match any input ID

**Playwright error**:

```
Error: Timeout 5000ms exceeded waiting for locator('input#invalid-id')
  at BeltProgressionPage.toggleCheckboxByTestId (belt-progression.page.ts:63)
```

**Why sufficient**:

- Shows exact locator attempted
- Shows timeout duration
- Shows call site in Page Object
- Playwright auto-captures screenshot

##### Scenario 2: Checkbox Not Attached

**Trigger**: React removes checkbox during toggle (race condition)

**Playwright error**:

```
Error: Element is not attached to the DOM
  at Locator.check (...)
  at BeltProgressionPage.toggleCheckboxByTestId (belt-progression.page.ts:66)
```

**Why sufficient**:

- Indicates React behavior changed (useful debugging signal)
- Shows call site
- Unlikely scenario (component doesn't dynamically remove inputs)

##### Scenario 3: Checkbox Disabled

**Trigger**: Component adds `disabled` attribute

**Playwright error**:

```
Error: Element is disabled
  at Locator.check (...)
```

**Why sufficient**:

- Clear indication of state issue
- Playwright auto-respects disabled state
- No current test scenario expects disabled checkboxes

#### Custom Error Handling Not Needed

**Why not wrap in try/catch**:

```typescript
// ❌ REJECTED: Over-engineering
try {
  await checkbox.check()
} catch (error) {
  throw new Error(`Failed to toggle checkbox '${itemId}': ${error.message}`)
}
```

**Reasons for rejection**:

1. Adds noise without value
2. Hides Playwright's detailed error messages
3. Prevents Playwright auto-screenshots (error re-thrown after screenshot)
4. No project-specific context to add (itemId already in locator string)

---

### 6. Type Safety & Documentation

#### JSDoc Enhancements

**Current**: No JSDoc

**New**: Complete JSDoc with types, parameters, exceptions

```typescript
/**
 * Toggle a checkbox by its item ID.
 * Uses Playwright's native checkbox API to trigger React 19 onChange handlers.
 *
 * @param itemId - The checkbox item ID (e.g., 'tecnicas-comienzo-0')
 * @throws {Error} If checkbox is not found within 5 seconds
 * @throws {Error} If checkbox is not attached to DOM
 */
```

**Benefits**:

- ✅ IDE IntelliSense shows expected parameter format
- ✅ Documents which Playwright API is used (aids future maintenance)
- ✅ Documents error conditions (helps test debugging)
- ✅ Example value clarifies ID format

#### Return Type Annotation

**Current**: No explicit return type

**New**: `Promise<void>`

```typescript
async toggleCheckboxByTestId(itemId: string): Promise<void>
```

**Benefits**:

- ✅ TypeScript enforces no return value
- ✅ Explicit async contract
- ✅ Consistent with TypeScript best practices

---

### 7. File Changes Summary

#### File: `e2e/pages/belt-progression.page.ts`

**Location**: Lines 60-65

**Change type**: Method refactor (replace implementation)

**Diff preview**:

```diff
  /**
-  * Toggle a checkbox by clicking its label.
-  * The label triggers the hidden checkbox via htmlFor/id association.
+  * Toggle a checkbox by its item ID.
+  * Uses Playwright's native checkbox API to trigger React 19 onChange handlers.
+  *
+  * @param itemId - The checkbox item ID (e.g., 'tecnicas-comienzo-0')
+  * @throws {Error} If checkbox is not found within 5 seconds
+  * @throws {Error} If checkbox is not attached to DOM
   */
- async toggleCheckboxByTestId(itemId: string) {
+ async toggleCheckboxByTestId(itemId: string): Promise<void> {
-   const label = this.page.locator(`label[for="${itemId}"]`)
-   await label.waitFor({ state: 'visible', timeout: 5000 })
-   await label.click()
-   await this.page.waitForTimeout(500) // Wait for React state + Supabase mutation
+   const checkbox = this.page.locator(`input#${itemId}`)
+
+   // Wait for checkbox to be attached (not necessarily visible due to sr-only)
+   await checkbox.waitFor({ state: 'attached', timeout: 5000 })
+
+   // Check current state and toggle
+   const isChecked = await checkbox.isChecked()
+   if (isChecked) {
+     await checkbox.uncheck()
+   } else {
+     await checkbox.check()
+   }
+
+   // Wait for Supabase mutation to complete
+   await this.page.waitForTimeout(500)
  }
```

**Lines changed**:

- Removed: 5 lines
- Added: 16 lines
- Net: +11 lines

**Rationale for line increase**:

- Added JSDoc (6 lines)
- Added comments (2 lines)
- Added explicit state check logic (4 lines)
- Total: More maintainable despite size increase

---

### 8. No Changes Required

#### Component Files (No Changes)

**File**: `src/features/bjj/progression/components/ProgressionChecklistItem.tsx`

**Why no changes**:

- ✅ Component already has stable `id={item.id}`
- ✅ Component already has `onChange={handleChange}`
- ✅ Component already has `aria-label={item.label}`
- ✅ `sr-only` class is correct (accessibility preserved)

**Verification**: Component works correctly in manual testing

#### Test Files (No Changes)

**File**: `e2e/belt-progression.spec.ts`

**Why no changes**:

- ✅ Tests call `beltProgressionPage.toggleCheckboxByTestId(itemId)`
- ✅ Page Object abstraction hides implementation details
- ✅ Method signature unchanged (`itemId: string` → `void`)

**Backward compatibility preserved**: Zero test refactoring required

#### Other Page Object Methods (No Changes)

**File**: `e2e/pages/belt-progression.page.ts`

**Unchanged methods**:

- `goto()` — Navigation (unaffected)
- `sectionHeader()` — Section locator (unaffected)
- `checkboxes` — Getter for all checkboxes (unaffected)
- `globalProgressBar` — Progress locator (unaffected)
- `resetButton` — Reset locator (unaffected)
- `expandSection()` — Section toggle (unaffected)
- `collapseSection()` — Section toggle (unaffected)

**Only method changed**: `toggleCheckboxByTestId()` (single-method isolation)

#### Other E2E Test Files (No Changes)

**Files**:

- `e2e/dashboard.spec.ts` (6 tests)
- `e2e/notes.spec.ts` (11 tests)
- `e2e/workouts.spec.ts` (13 tests)

**Why unaffected**:

- ✅ No checkbox interactions in these tests
- ✅ All `.click()` calls target buttons/links (not controlled inputs)

**Verification**: Grep showed no checkbox patterns in other E2E files

---

## Testing Strategy

### Phase 1: Local Verification

#### Step 1.1: Run Affected Tests

```bash
npm run test:e2e -- belt-progression.spec.ts
```

**Expected result**: 7/7 tests pass (100%)

**Success criteria**:

- ✅ Test 2 (check persists) passes
- ✅ Test 5 (22 items = 51%) passes
- ✅ Test 6 (reset confirm) passes
- ✅ Test 7 (reset cancel) passes
- ✅ Tests 1, 3, 4 still pass (no regression)

#### Step 1.2: Verify Other E2E Tests

```bash
npm run test:e2e
```

**Expected result**: All 37 E2E tests pass (belt-progression: 7, others: 30)

**Success criteria**: No regression in dashboard/notes/workouts tests

### Phase 2: Stability Validation

#### Step 2.1: Run 10 Consecutive Times

```bash
for i in {1..10}; do
  echo "Run $i/10"
  npm run test:e2e -- belt-progression.spec.ts || exit 1
done
```

**Expected result**: 70/70 tests pass (10 runs × 7 tests)

**Success criteria**: Zero flakiness (0 failures)

#### Step 2.2: Performance Baseline

**Measure**:

- Single test duration (Test 2: check persists)
- Bulk test duration (Test 5: 22 items)
- Full suite duration (all 7 tests)

**Expected**:

- Single: ≤600ms per toggle
- Bulk: ≤13 seconds (22 toggles)
- Suite: ≤45 seconds (total)

### Phase 3: Regression Testing

#### Step 3.1: Unit Tests (No Changes Expected)

```bash
npm test
```

**Expected**: 466/466 tests pass (no regression)

#### Step 3.2: Build Verification

```bash
npm run build
```

**Expected**: Clean build (no TypeScript errors introduced)

---

## Rollout Strategy

### Pre-Merge Checklist

- [ ] All 7 E2E tests pass locally
- [ ] 10 consecutive runs pass (stability validated)
- [ ] Performance within baseline (≤600ms per toggle)
- [ ] Unit tests pass (no regression)
- [ ] Build succeeds (no TypeScript errors)
- [ ] PR created with issue #41 linked

### Merge Strategy

**Branch**: Create from `main`

```bash
git checkout main
git pull origin main
git checkout -b fix/41-e2e-playwright-checkbox-react19
```

**Commit message**:

```
fix(e2e): use Playwright native checkbox API for React 19 compatibility

React 19's stricter synthetic event validation rejects label.click()
as non-genuine. Playwright's check()/uncheck() methods properly
simulate user interactions that React 19 accepts.

Changes:
- Refactor BeltProgressionPage.toggleCheckboxByTestId() to use
  checkbox.check()/uncheck() instead of label.click()
- Update wait strategy from 'visible' to 'attached' (sr-only inputs)
- Add comprehensive JSDoc with parameters and error conditions

Fixes #41
```

**PR checklist**:

- [ ] Link to issue #41
- [ ] Include before/after test results
- [ ] Document solution approach
- [ ] Request review from QA/E2E owner

### Post-Merge Validation

**CI Pipeline**: GitHub Actions will run full E2E suite

**Monitor**:

- [ ] CI E2E tests pass (all 37 tests)
- [ ] No flakiness in subsequent runs
- [ ] No performance regression

---

## Risk Mitigation

### Risk 1: Tests Still Fail

**Likelihood**: 🟢 Low (solution validated in exploration)

**Mitigation plan**:

1. Check Playwright version (must be ≥1.40 for React 19 support)
2. Verify checkbox IDs match component (run selector in browser DevTools)
3. Add debug logging: `console.log(await checkbox.isChecked())`

**Rollback**: Revert PR, re-evaluate with React Testing Library approach

### Risk 2: Flakiness Introduced

**Likelihood**: 🟢 Low (idempotency prevents race conditions)

**Mitigation plan**:

1. Increase wait timeout from 500ms to 1000ms
2. Add explicit wait for network idle after toggle
3. Verify Supabase mutation completes (check DB directly in test)

**Rollback**: Revert PR, add `.skip` to flaky tests

### Risk 3: Performance Regression

**Likelihood**: 🟢 Low (same wait strategy)

**Mitigation plan**:

1. Remove 500ms wait, rely on Playwright auto-wait
2. Use `page.waitForResponse()` for Supabase mutation
3. Profile test execution to find bottleneck

**Rollback**: Revert if suite duration exceeds 60 seconds

---

## Future Enhancements (Out of Scope)

### Enhancement 1: Split Toggle into Check/Uncheck

**Current**: `toggleCheckboxByTestId(itemId)` (toggle behavior)

**Future**:

```typescript
async checkItem(itemId: string): Promise<void>
async uncheckItem(itemId: string): Promise<void>
```

**Benefits**: More explicit test intent, better idempotency

**Tradeoff**: Requires test refactoring (backward compatibility break)

### Enhancement 2: Bulk Operations Helper

**Current**: Loop through 22 items individually

**Future**:

```typescript
async checkItems(itemIds: string[]): Promise<void>
```

**Benefits**: Simpler test code, potential performance optimization

**Tradeoff**: More complex Page Object, needs error handling design

### Enhancement 3: Optimized Wait Strategy

**Current**: Fixed 500ms wait after each toggle

**Future**:

```typescript
await page.waitForResponse(
  (resp) => resp.url().includes('/rest/v1/athlete_progression') && resp.ok(),
)
```

**Benefits**: Faster tests, no arbitrary timeouts

**Tradeoff**: Tighter coupling to Supabase implementation

---

## Success Criteria Summary

| Criterion                | Target                | Measurement                                    |
| ------------------------ | --------------------- | ---------------------------------------------- |
| Test pass rate           | 7/7 (100%)            | `npm run test:e2e -- belt-progression.spec.ts` |
| Flakiness                | 0 failures in 10 runs | Stability validation script                    |
| Performance              | ≤600ms per toggle     | Playwright reporter timestamps                 |
| Files changed            | 1 file                | Git diff                                       |
| Lines changed            | ~11 net lines         | Git diff                                       |
| Unit test regression     | 0 failures            | `npm test`                                     |
| Build regression         | 0 errors              | `npm run build`                                |
| Accessibility regression | 0 WCAG violations     | Manual verification                            |

---

## Design Approval

**Design reviewed**: (Pending)

**Approved by**: (Pending user confirmation)

**Next phase**: `tasks` → Break down implementation into atomic tasks for apply phase

---

## References

- **SPEC.md**: Acceptance criteria and test scenarios
- **EXPLORE.md**: Technical validation and risk assessment
- **INIT.md**: Problem statement and context
- **Issue #41**: Original bug report with attempted solutions
- **Project skills**: `.agents/skills/playwright-best-practices/testing-patterns/forms-validation.md`

---

## Skill Resolution

**Status**: `injected`

Project standards from `.atl/skill-registry.md` applied:

- **playwright-best-practices**: Used for API selection (check/uncheck over click)
- **branch-pr**: Will create PR linked to issue #41
- **accessibility**: Verified no WCAG regression (no component changes)
