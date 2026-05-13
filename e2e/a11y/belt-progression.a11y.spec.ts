import { test, expect } from '../fixtures/pages.fixture'
import AxeBuilder from '@axe-core/playwright'

/**
 * Accessibility scan for the Belt Progression page.
 * Runs axe-core with wcag2aa tag filter.
 *
 * Prerequisites: auth.setup.ts must have run (storageState in .auth/athlete.json)
 */
test('a11y - no critical violations at /bjj/blue-belt-progression', async ({ page }) => {
  await page.goto('/bjj/blue-belt-progression')
  await expect(page).toHaveURL(/bjj\/blue-belt-progression/)

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2aa'])
    .analyze()

  expect(results.violations).toHaveLength(0)
})