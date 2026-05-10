import { test, expect } from '../fixtures/pages.fixture'
import AxeBuilder from '@axe-core/playwright'

/**
 * Accessibility scan for the Calendar page.
 * Runs axe-core with wcag2aa tag filter.
 *
 * Prerequisites: auth.setup.ts must have run (storageState in .auth/athlete.json)
 */
test('a11y', async ({ page }) => {
  await page.goto('/calendar')
  await expect(page).toHaveURL(/calendar/)

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2aa'])
    .analyze()

  expect(results.violations).toHaveLength(0)
})