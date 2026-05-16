# SDD Pivot: E2E React 19 + Playwright Checkbox Fix

**Change ID**: `e2e-react19-playwright-checkbox-fix`  
**Issue**: #41  
**Date**: 2026-05-16  
**Status**: **RESOLVED** (Pivoted from original hypothesis)

---

## Pivot Decision

**Original hypothesis** (from issue #41): React 19 rejects `label.click()` as non-genuine interaction

**Actual root cause** (confirmed via investigation): **DB state pollution between test runs**

---

## Investigation Journey

### Phase 1: Initial SDD (INIT → EXPLORE → SPEC → DESIGN → TASKS)

Based on false premise that React 19 validation was rejecting `label.click()` events.

### Phase 2: Apply Phase Discovery

**Baseline testing revealed**: Tests pass 60% of time with BOTH `label.click()` AND proposed `checkbox.check()` implementations.

**Evidence**:

- 5 runs with `label.click()`: 3/5 pass (60%)
- Proposed `checkbox.check()` with `force: true`: 2/5 pass (40%)
- **Conclusion**: Flakiness exists regardless of implementation

### Phase 3: Deep Investigation

#### Finding 1: Dual Project Execution

Tests ran in TWO projects simultaneously (`chromium` + `belt-progression`), causing race conditions in DB writes.

**Fix**: Excluded `belt-progression.spec.ts` from `chromium` project via `testIgnore`

**Result**: Still 40% pass rate → not the root cause

#### Finding 2: Auth Debugging

Added logging to confirm Supabase auth was working correctly.

**Finding**: Auth works perfectly (`hasUser: true`, no auth errors)

#### Finding 3: onChange Handler Investigation

Added logging to component `handleChange` and mutation hook.

**Discovery**: When tests FAIL, checkbox state is **opposite** of expected:

```
PASS: wasComplete: false, willBe: true  // Correct
FAIL: wasComplete: true, willBe: false  // DB already has checked state!
```

### Phase 4: Root Cause Identification

**The Real Problem**: DB state persists between test runs. Tests assume clean initial state but inherit residual data from previous runs.

**Sequence**:

1. Run 1: Marks checkbox as checked ✅
2. Run 2: Checkbox already checked (no DB reset)
3. Toggle marks it unchecked ❌
4. Test expects checked → FAILS

---

## Final Solution

### Change 1: Playwright Config

Excluded duplicate test execution:

```typescript
// playwright.config.ts
{
  name: 'chromium',
  testIgnore: [/auth\.spec\.ts/, /belt-progression\.spec\.ts/],
}
```

### Change 2: Test Reset Logic

Added explicit DB reset at test start:

```typescript
// e2e/belt-progression.spec.ts
test('check item persists across refresh', async ({ page, beltProgressionPage }) => {
  // Reset: ensure checkbox starts unchecked
  await page.getByRole('button', { name: /reiniciar/i }).click()
  await page.getByRole('button', { name: /confirmar/i }).click()
  await page.waitForTimeout(500)

  // ... rest of test
})
```

### Change 3: Page Object Method

Switched from `label.click()` to `checkbox.focus()` + `Space` key (keyboard method):

```typescript
// e2e/pages/belt-progression.page.ts
async toggleCheckboxByTestId(itemId: string): Promise<void> {
  const checkbox = this.page.locator(`input#${itemId}`)
  const wasChecked = await checkbox.isChecked()

  await checkbox.focus()
  await this.page.keyboard.press('Space')

  await this.page.waitForTimeout(1000) // Supabase mutation

  if (wasChecked) {
    await expect(checkbox).not.toBeChecked({ timeout: 5000 })
  } else {
    await expect(checkbox).toBeChecked({ timeout: 5000 })
  }
}
```

---

## Results

**Before fix**: 40-60% pass rate (flaky)  
**After fix**: 100% pass rate across 10 consecutive runs

**Test suite**: 8/8 tests pass consistently

---

## Impact on SDD Artifacts

### INIT.md

- ✅ Problem statement correct (tests failing intermittently)
- ❌ Root cause incorrect (not React 19 incompatibility)

### EXPLORE.md

- ❌ Explored wrong solution path
- Learning: Always validate baseline before implementing

### SPEC.md

- ⚠️ Acceptance criteria still valid (7/7 tests must pass)
- ⚠️ Root cause section incorrect

### DESIGN.md

- ❌ Designed solution for wrong problem
- Useful learning about Playwright checkbox APIs

### tasks.md

- ✅ Phase structure valid
- ❌ Implementation tasks based on wrong solution

---

## Lessons Learned

1. **Baseline testing is critical** — Apply phase caught incorrect assumption by running original code first
2. **Flakiness != broken feature** — 60% pass rate suggested environmental issue, not code bug
3. **Deep investigation pays off** — Required multiple pivot points to find real root cause
4. **Test isolation matters** — DB state pollution is a common E2E testing pitfall
5. **Logging is essential** — Console logging at multiple levels revealed the actual problem

---

## Issue #41 Update Strategy

**Will update issue with**:

1. ✅ Root cause: DB state pollution, NOT React 19 incompatibility
2. ✅ Solution: Test reset logic + Playwright config fix
3. ✅ Evidence: 10/10 consecutive runs pass
4. ✅ Link to PR

**Will NOT claim**:

- ❌ React 19 incompatibility (incorrect diagnosis)
- ❌ Playwright checkbox API as primary solution (keyboard method works but not the core fix)

---

## Files Changed

| File                                 | Purpose                                        | Lines Changed |
| ------------------------------------ | ---------------------------------------------- | ------------- |
| `playwright.config.ts`               | Exclude belt-progression from chromium project | +1            |
| `e2e/belt-progression.spec.ts`       | Add DB reset at test start                     | +4            |
| `e2e/pages/belt-progression.page.ts` | Use keyboard method (focus + Space)            | ~20           |

Total: ~25 lines changed

---

## Next Steps

1. ✅ Clean debugging code
2. ✅ Verify all tests pass
3. 🔄 Commit changes
4. 🔄 Update issue #41
5. 🔄 Create PR

---

## Approval

**Pivot approved by**: User (2026-05-16)

**Rationale**: Fix actual problem (DB state pollution) rather than assumed problem (React 19 incompatibility)

**Success criteria met**: 100% pass rate across 10 consecutive runs, 8/8 tests passing consistently
