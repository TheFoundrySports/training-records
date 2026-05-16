# SDD Tasks: E2E React 19 + Playwright Checkbox Fix

**Change ID**: `e2e-react19-playwright-checkbox-fix`  
**Issue**: #41  
**Phase**: tasks  
**Date**: 2026-05-16

---

## Review Workload Forecast

| Field                   | Value                                                     |
| ----------------------- | --------------------------------------------------------- |
| Estimated changed lines | 11 (−5 deletions, +16 additions)                          |
| 400-line budget risk    | Low                                                       |
| Chained PRs recommended | No                                                        |
| Suggested split         | Single PR                                                 |
| Delivery strategy       | single-pr                                                 |
| Chain strategy          | size-exception (under 100 lines, well within safe budget) |

**Rationale**: This is a focused, single-method refactor in one Page Object file. No component changes, no test changes, no cross-cutting concerns. Total impact is ~11 lines in one method. Well under the 400-line review budget and safe for single PR delivery.

---

## Guard Lines for Automation

```text
Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low
```

---

## Task Breakdown

### Phase 1: Pre-Implementation

#### Task 1.1: Verify Clean Working State

**Objective**: Ensure working directory is clean before starting implementation

**Steps**:

1. Run `git status`
2. Verify no uncommitted changes in `e2e/pages/` directory
3. Verify current branch is `main` and up to date

**Commands**:

```bash
git status
git branch --show-current
git fetch origin
git status -sb  # Should show "## main...origin/main"
```

**Expected outcome**:

- Working directory clean or only unrelated staged changes
- On `main` branch
- Synced with `origin/main`

**Acceptance criteria**:

- ✅ No changes in `e2e/pages/belt-progression.page.ts`
- ✅ Branch is `main` or clean feature branch

**Blockers**: Uncommitted changes in target file → stash or commit first

**Dependencies**: None

---

#### Task 1.2: Create Feature Branch

**Objective**: Create isolated branch for checkbox fix implementation

**Steps**:

1. Ensure on `main` branch
2. Pull latest changes
3. Create feature branch following project naming convention

**Commands**:

```bash
git checkout main
git pull origin main
git checkout -b fix/41-e2e-playwright-checkbox-react19
```

**Expected outcome**: New branch created and checked out

**Acceptance criteria**:

- ✅ Branch name follows `fix/41-*` convention
- ✅ Based on latest `main`
- ✅ Branch is clean (no changes yet)

**Blockers**: Branch already exists → delete and recreate, or use different name

**Dependencies**: Task 1.1 (clean state verified)

---

#### Task 1.3: Baseline Test Execution

**Objective**: Record current test failure state before fix

**Steps**:

1. Run belt-progression E2E tests
2. Document which tests fail and why
3. Capture failure output for comparison

**Commands**:

```bash
npm run test:e2e -- belt-progression.spec.ts 2>&1 | tee /tmp/e2e-before-fix.log
```

**Expected outcome**:

- Tests 2, 5, 6, 7 fail (checkbox toggle doesn't work)
- Tests 1, 3, 4 pass (no checkbox interaction)
- Failure logs captured

**Acceptance criteria**:

- ✅ 4 tests fail with checkbox-related timeouts
- ✅ 3 tests pass (sections, progress reset)
- ✅ Failure pattern matches issue #41 description

**Blockers**: Unexpected failures → investigate before proceeding

**Dependencies**: Task 1.2 (feature branch created)

---

### Phase 2: Implementation

#### Task 2.1: Refactor toggleCheckboxByTestId Method

**Objective**: Replace `label.click()` with Playwright's native checkbox API

**Target file**: `e2e/pages/belt-progression.page.ts`

**Target lines**: 60-68 (current method)

**Steps**:

1. Open `e2e/pages/belt-progression.page.ts`
2. Locate `toggleCheckboxByTestId()` method (lines 60-68)
3. Replace implementation with new design from DESIGN.md
4. Save file

**Exact change**:

**Remove** (lines 60-68):

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

**Add** (replacement):

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

**Expected outcome**: Method refactored, file saved

**Acceptance criteria**:

- ✅ JSDoc updated with correct description and `@param`/`@throws` tags
- ✅ Method signature includes explicit `Promise<void>` return type
- ✅ Selector changed from `label[for="${itemId}"]` to `input#${itemId}`
- ✅ Wait state changed from `'visible'` to `'attached'`
- ✅ Uses `check()`/`uncheck()` instead of `click()`
- ✅ Preserves 500ms wait for Supabase mutation
- ✅ No syntax errors (TypeScript validates)

**Verification**:

```bash
# Verify syntax
npx tsc --noEmit

# Verify change applied
git diff e2e/pages/belt-progression.page.ts
```

**Blockers**: TypeScript errors → review syntax, ensure correct API usage

**Dependencies**: Task 1.3 (baseline captured)

---

#### Task 2.2: Verify No Other Changes Needed

**Objective**: Confirm no other files require modification

**Steps**:

1. Review test file `e2e/belt-progression.spec.ts`
2. Verify tests still call `beltProgressionPage.toggleCheckboxByTestId(itemId)`
3. Confirm component has stable IDs (no component inspection needed)

**Commands**:

```bash
# Check test file calls Page Object method correctly
grep -n "toggleCheckboxByTestId" e2e/belt-progression.spec.ts

# Verify no other E2E files use the method
grep -r "toggleCheckboxByTestId" e2e/*.spec.ts
```

**Expected outcome**:

- Only `belt-progression.spec.ts` calls the method
- No component changes needed (already validated in EXPLORE phase)

**Acceptance criteria**:

- ✅ Test file unchanged
- ✅ Component file unchanged
- ✅ Only Page Object method modified

**Blockers**: Unexpected method usage in other files → expand scope or split change

**Dependencies**: Task 2.1 (method refactored)

---

### Phase 3: Local Testing

#### Task 3.1: Run Belt Progression E2E Tests

**Objective**: Verify fix resolves failing tests

**Steps**:

1. Run belt-progression E2E test suite
2. Verify all 7 tests pass
3. Compare with baseline (Task 1.3)

**Commands**:

```bash
npm run test:e2e -- belt-progression.spec.ts 2>&1 | tee /tmp/e2e-after-fix.log
```

**Expected outcome**:

- ✅ Test 1: `displays all 5 sections` — PASS (no change)
- ✅ Test 2: `check item persists` — PASS (was FAIL)
- ✅ Test 3: `collapse section persists` — PASS (no change)
- ✅ Test 4: `progress 0%` — PASS (no change)
- ✅ Test 5: `check 22 items = 51%` — PASS (was FAIL)
- ✅ Test 6: `reset confirm` — PASS (was FAIL)
- ✅ Test 7: `reset cancel` — PASS (was FAIL)

**Acceptance criteria**:

- ✅ 7/7 tests pass (100%)
- ✅ Previously failing tests (2, 5, 6, 7) now pass
- ✅ No new failures introduced
- ✅ Test duration ≤45 seconds

**Blockers**:

- Tests still fail → review implementation, check selector matches component IDs
- New failures → regression introduced, investigate

**Recovery**:

```bash
# If tests fail, revert and investigate
git checkout e2e/pages/belt-progression.page.ts
# Review DESIGN.md implementation again
```

**Dependencies**: Task 2.2 (implementation complete)

---

#### Task 3.2: Run Full E2E Test Suite

**Objective**: Verify no regression in other E2E tests

**Steps**:

1. Run complete E2E suite (all test files)
2. Verify dashboard, notes, and workouts tests still pass
3. Confirm total test count is 37 (7 belt + 30 others)

**Commands**:

```bash
npm run test:e2e
```

**Expected outcome**:

- 37/37 E2E tests pass
- No regressions in dashboard/notes/workouts tests

**Acceptance criteria**:

- ✅ All 37 tests pass
- ✅ `dashboard.spec.ts`: 6/6 pass
- ✅ `notes.spec.ts`: 11/11 pass
- ✅ `workouts.spec.ts`: 13/13 pass
- ✅ `belt-progression.spec.ts`: 7/7 pass

**Blockers**:

- Regression in other tests → isolate cause, verify change didn't affect shared fixtures

**Dependencies**: Task 3.1 (belt-progression tests pass)

---

#### Task 3.3: Run Unit Test Suite

**Objective**: Verify no regression in unit tests

**Steps**:

1. Run full unit test suite
2. Verify 466 tests still pass
3. Confirm no TypeScript build errors

**Commands**:

```bash
npm test
```

**Expected outcome**: 466/466 unit tests pass (no change from baseline)

**Acceptance criteria**:

- ✅ All 466 unit tests pass
- ✅ No new test failures
- ✅ No TypeScript errors
- ✅ Test duration unchanged (~expected baseline)

**Blockers**: Unit test failures → unexpected, investigate root cause (E2E change shouldn't affect unit tests)

**Dependencies**: Task 3.2 (full E2E suite passes)

---

#### Task 3.4: Verify Build Success

**Objective**: Confirm no TypeScript compilation errors

**Steps**:

1. Run production build
2. Verify clean build output
3. Confirm no type errors

**Commands**:

```bash
npm run build
```

**Expected outcome**: Clean build with no errors

**Acceptance criteria**:

- ✅ Build completes successfully
- ✅ No TypeScript errors
- ✅ No ESLint errors
- ✅ Build artifacts generated

**Blockers**: Build errors → review TypeScript syntax in refactored method

**Dependencies**: Task 3.3 (unit tests pass)

---

### Phase 4: Stability Validation

#### Task 4.1: Run 10 Consecutive Test Executions

**Objective**: Verify no flakiness introduced by fix

**Steps**:

1. Run belt-progression tests 10 times consecutively
2. Track pass/fail for each run
3. Verify 0 failures across 70 total tests (10 runs × 7 tests)

**Commands**:

```bash
# Run 10 times and exit on first failure
for i in {1..10}; do
  echo "=== Run $i/10 ==="
  npm run test:e2e -- belt-progression.spec.ts || exit 1
done
echo "✅ All 10 runs passed (70/70 tests)"
```

**Expected outcome**: 70/70 tests pass (0% flakiness)

**Acceptance criteria**:

- ✅ 10/10 runs complete without failure
- ✅ Each run shows 7/7 tests passing
- ✅ No timeout errors
- ✅ No "element not attached" errors

**Blockers**:

- Flakiness detected → increase wait timeouts, investigate race conditions
- Intermittent failures → review wait strategy, consider network idle waits

**Recovery options**:

1. Increase `waitForTimeout(500)` to `waitForTimeout(1000)`
2. Add explicit network wait: `await this.page.waitForLoadState('networkidle')`
3. Add wait for Supabase response: `await this.page.waitForResponse(/* ... */)`

**Dependencies**: Task 3.4 (build succeeds)

---

#### Task 4.2: Performance Baseline Verification

**Objective**: Confirm no performance regression

**Steps**:

1. Review Playwright test reporter output
2. Measure individual test durations
3. Compare against SPEC.md performance criteria

**Commands**:

```bash
# Run with reporter to capture timings
npm run test:e2e -- belt-progression.spec.ts --reporter=html
# Open playwright-report/index.html to review timings
```

**Expected outcome**:

- Single toggle: ≤600ms
- Test 5 (22 toggles): ≤13 seconds
- Full suite: ≤45 seconds

**Acceptance criteria**:

- ✅ Test 2 (check persists): ≤3 seconds
- ✅ Test 5 (22 items): ≤13 seconds
- ✅ Full suite: ≤45 seconds
- ✅ No individual test exceeds 2× baseline

**Blockers**:

- Performance regression → profile test execution, optimize waits

**Dependencies**: Task 4.1 (stability validated)

---

### Phase 5: Commit and Document

#### Task 5.1: Stage Changes

**Objective**: Stage refactored file for commit

**Steps**:

1. Review diff one final time
2. Stage only the Page Object file
3. Verify no unintended changes staged

**Commands**:

```bash
# Review changes
git diff e2e/pages/belt-progression.page.ts

# Stage file
git add e2e/pages/belt-progression.page.ts

# Verify staged changes
git diff --staged
```

**Expected outcome**: Only `belt-progression.page.ts` staged with method refactor

**Acceptance criteria**:

- ✅ Only one file staged
- ✅ Diff shows −5 deletions, +16 additions (~11 net lines)
- ✅ No unintended whitespace or formatting changes

**Blockers**: Unintended changes → review and unstage, fix issues

**Dependencies**: Task 4.2 (performance validated)

---

#### Task 5.2: Commit with Conventional Message

**Objective**: Create clean commit linking to issue #41

**Steps**:

1. Write conventional commit message
2. Include issue reference
3. Summarize change and rationale

**Commands**:

```bash
git commit -m "fix(e2e): use Playwright native checkbox API for React 19 compatibility

React 19's stricter synthetic event validation rejects label.click()
as non-genuine. Playwright's check()/uncheck() methods properly
simulate user interactions that React 19 accepts.

Changes:
- Refactor BeltProgressionPage.toggleCheckboxByTestId() to use
  checkbox.check()/uncheck() instead of label.click()
- Update wait strategy from 'visible' to 'attached' (sr-only inputs)
- Add comprehensive JSDoc with parameters and error conditions

Fixes #41"
```

**Expected outcome**: Clean commit created on feature branch

**Acceptance criteria**:

- ✅ Commit message follows conventional commits format
- ✅ Includes `Fixes #41` footer
- ✅ Body explains what, why, and key changes
- ✅ Commit is on `fix/41-e2e-playwright-checkbox-react19` branch

**Blockers**: None (can amend commit message if needed)

**Dependencies**: Task 5.1 (changes staged)

---

#### Task 5.3: Push Feature Branch

**Objective**: Push branch to remote for PR creation

**Steps**:

1. Push branch to origin
2. Verify branch visible in remote
3. Note branch URL for PR creation

**Commands**:

```bash
git push origin fix/41-e2e-playwright-checkbox-react19

# Verify push
git branch -vv
```

**Expected outcome**: Branch pushed to `origin`

**Acceptance criteria**:

- ✅ Branch exists on remote
- ✅ Commit SHA matches local
- ✅ Ready for PR creation

**Blockers**: Push access denied → verify Git credentials, repository permissions

**Dependencies**: Task 5.2 (commit created)

---

#### Task 5.4: Update Issue #41 with Solution Summary

**Objective**: Document solution approach before PR review

**Steps**:

1. Open issue #41 in GitHub
2. Add comment summarizing fix
3. Link to branch/commit for context

**Comment template**:

```markdown
## ✅ Solution Implemented

Fixed by refactoring `BeltProgressionPage.toggleCheckboxByTestId()` to use Playwright's native checkbox API (`check()`/`uncheck()`) instead of `label.click()`.

### Root Cause

React 19's stricter synthetic event validation rejects programmatic clicks (like `label.click()`) as non-genuine interactions. Playwright's `check()`/`uncheck()` methods properly simulate user interactions that React 19 recognizes.

### Changes

- **File**: `e2e/pages/belt-progression.page.ts` (lines 60-68)
- **Diff**: +16 lines, −5 lines (~11 net)
- **Selector**: `input#${itemId}` (direct input targeting)
- **Wait strategy**: `attached` state (works with `sr-only` inputs)
- **API**: `checkbox.check()` / `checkbox.uncheck()`

### Validation

- ✅ All 7 E2E tests pass (was 5/7)
- ✅ 0 flakiness in 10 consecutive runs (70/70 tests)
- ✅ No regression in 466 unit tests
- ✅ No regression in 30 other E2E tests
- ✅ Build succeeds with no TypeScript errors

### Next Steps

Opening PR for review.

Branch: `fix/41-e2e-playwright-checkbox-react19`
```

**Commands**:

```bash
gh issue comment 41 --body "$(cat /tmp/issue-41-solution-comment.md)"
# OR manually via GitHub web UI
```

**Expected outcome**: Issue #41 updated with solution summary

**Acceptance criteria**:

- ✅ Comment added to issue #41
- ✅ Solution approach documented
- ✅ Validation results included
- ✅ Branch name referenced

**Blockers**: GitHub CLI unavailable → use web UI

**Dependencies**: Task 5.3 (branch pushed)

---

### Phase 6: Ready for Review

#### Task 6.1: Pre-PR Checklist Verification

**Objective**: Confirm all pre-merge criteria met

**Checklist** (from DESIGN.md):

- [ ] All 7 E2E tests pass locally (Task 3.1)
- [ ] 10 consecutive runs pass (Task 4.1)
- [ ] Performance within baseline (Task 4.2)
- [ ] Unit tests pass (Task 3.3)
- [ ] Build succeeds (Task 3.4)
- [ ] Branch pushed (Task 5.3)
- [ ] Issue #41 updated (Task 5.4)

**Steps**:

1. Review checklist items
2. Verify all tasks completed
3. Confirm ready for PR creation

**Expected outcome**: All checklist items ✅

**Acceptance criteria**:

- ✅ All Phase 3 tests passed
- ✅ All Phase 4 validations passed
- ✅ All Phase 5 commits/docs complete
- ✅ No blockers remaining

**Blockers**: Incomplete tasks → complete before PR

**Dependencies**: Tasks 5.4 (all prior tasks complete)

---

#### Task 6.2: Prepare PR Description

**Objective**: Draft comprehensive PR description for reviewers

**Template**:

```markdown
## 🐛 Fix E2E Tests: React 19 + Playwright Checkbox Incompatibility

Fixes #41

## Problem

E2E tests for BJJ Blue Belt Progression failed because Playwright's `label.click()` doesn't trigger React 19 `onChange` handlers. React 19 requires genuine user interactions, which programmatic clicks don't provide.

## Root Cause

React 19's stricter synthetic event validation rejects `label.click()` and `dispatchEvent()` as non-genuine interactions.

## Solution

Refactor `BeltProgressionPage.toggleCheckboxByTestId()` to use Playwright's native checkbox API (`check()`/`uncheck()`), which properly simulates user interactions that React 19 accepts.

## Changes

- **File**: `e2e/pages/belt-progression.page.ts` (1 file, ~11 lines)
- **Selector**: Changed from `label[for="${itemId}"]` to `input#${itemId}`
- **Wait state**: Changed from `'visible'` to `'attached'` (works with sr-only inputs)
- **Action**: Replaced `label.click()` with `checkbox.check()`/`checkbox.uncheck()`
- **Docs**: Added comprehensive JSDoc with `@param` and `@throws`

## Testing

✅ **Before**: 5/7 tests pass (tests 2, 5, 6, 7 fail)  
✅ **After**: 7/7 tests pass (100%)

### Validation

- ✅ All 7 E2E tests pass
- ✅ 10 consecutive runs pass (0% flakiness)
- ✅ 466 unit tests pass (no regression)
- ✅ 37 total E2E tests pass (no regression in dashboard/notes/workouts)
- ✅ Build succeeds (no TypeScript errors)
- ✅ Performance baseline met (≤45s suite duration)

## Review Focus

- [ ] Verify selector `input#${itemId}` matches component IDs
- [ ] Confirm wait strategy (`attached` + 500ms) is appropriate
- [ ] Check JSDoc clarity and completeness
- [ ] Validate backward compatibility (no test changes needed)

## References

- Issue: #41
- SDD artifacts: `openspec/changes/e2e-react19-playwright-checkbox-fix/`
- Playwright docs: [check() method](https://playwright.dev/docs/api/class-locator#locator-check)
- Project skills: `.agents/skills/playwright-best-practices/testing-patterns/forms-validation.md`
```

**Expected outcome**: PR description ready for copy/paste

**Acceptance criteria**:

- ✅ Links to issue #41
- ✅ Explains problem, root cause, solution
- ✅ Includes before/after test results
- ✅ Lists all validation checks performed
- ✅ Guides reviewer focus

**Blockers**: None

**Dependencies**: Task 6.1 (checklist verified)

---

## Rollback Plan

**If any Phase 3-4 task fails**:

1. **Revert changes**:

   ```bash
   git checkout e2e/pages/belt-progression.page.ts
   git status  # Verify reverted
   ```

2. **Re-run baseline tests**:

   ```bash
   npm run test:e2e -- belt-progression.spec.ts
   # Should show original failures (5/7 pass)
   ```

3. **Investigate failure**:
   - Review DESIGN.md implementation details
   - Check component IDs match selector: `input#${itemId}`
   - Verify Playwright version ≥1.40
   - Add debug logging: `console.log(await checkbox.isChecked())`

4. **Alternative approaches** (from SPEC.md):
   - Option 1: Increase wait timeout to 1000ms
   - Option 2: Use `setChecked()` instead of if/else logic
   - Option 3: React Testing Library (larger refactor)

**Revert commit** (if already committed):

```bash
git reset --soft HEAD~1  # Undo commit, keep changes
# OR
git revert HEAD  # Create revert commit
```

---

## Summary

**Total tasks**: 17 across 6 phases

**Estimated time**: 1-2 hours (including 10-run stability check)

**Critical path**:

1. Pre-implementation (Tasks 1.1-1.3): 10 minutes
2. Implementation (Tasks 2.1-2.2): 15 minutes
3. Local testing (Tasks 3.1-3.4): 20 minutes
4. Stability validation (Tasks 4.1-4.2): 30 minutes (10 runs)
5. Commit/document (Tasks 5.1-5.4): 15 minutes
6. PR preparation (Tasks 6.1-6.2): 10 minutes

**Key success criteria**:

- ✅ 7/7 E2E tests pass (was 5/7)
- ✅ 0 flakiness in 10 runs
- ✅ No regression in unit tests or other E2E tests
- ✅ Single file changed (~11 lines)
- ✅ Clean commit with issue link

**Risk level**: 🟢 **LOW** (isolated change, proven approach, comprehensive validation)
