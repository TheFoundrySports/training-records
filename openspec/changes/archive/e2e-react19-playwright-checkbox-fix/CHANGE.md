# Fix E2E Tests: React 19 + Playwright Checkbox Incompatibility

**Issue**: #41  
**Status**: initialized  
**Created**: 2026-05-16  
**Phase**: init

## Summary

E2E tests for BJJ Blue Belt Progression fail because Playwright's `label.click()` does not trigger React 19 `onChange` handlers on controlled checkboxes. The feature works perfectly in manual browser testing, but automated tests fail with timeout waiting for checkbox state to update.

## Context

- **Affected Tests**: 7 E2E tests in `e2e/belt-progression.spec.ts`
- **Root Cause**: React 19 has stricter synthetic event validation requiring genuine user interactions. Programmatic clicks via Playwright's standard click methods don't trigger React `onChange` handlers.
- **Evidence**:
  - All 466 unit tests pass
  - Feature works in manual testing
  - Console logs in `handleChange` never appear during E2E tests
  - HTML shows checkbox as `checked` but React state doesn't update, causing visual revert to unchecked

## Attempted Solutions (All Failed)

1. `page.evaluate()` + `element.click()` — No React event fired
2. `page.evaluate()` + `input.click()` — No React event fired
3. `page.evaluate()` + `dispatchEvent` (change/input) — React ignores synthetic events
4. `label.click({force: true})` — Doesn't fire React onChange
5. `page.mouse.click()` on label bounding box — Doesn't fire React onChange
6. Click on visual div with onClick handler — onClick never fires

## Proposed Solution

Use Playwright's native checkbox API (`check()`, `uncheck()`, or `setChecked()`) which properly simulates user interactions that React 19 recognizes, instead of clicking labels.

## Acceptance Criteria

- [ ] All 7 E2E tests pass consistently
- [ ] Checkbox clicks trigger React onChange handlers
- [ ] Tests remain stable (no flakiness)
- [ ] Solution documented for future reference

## Files Affected

- `e2e/belt-progression.spec.ts` — 7 tests
- `e2e/pages/belt-progression.page.ts` — Page Object with `toggleCheckboxByTestId()` method
- `src/features/bjj/progression/components/ProgressionChecklistItem.tsx` — checkbox component (may need data-testid on input if not present)
