import { test as base, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

/**
 * Accessibility scan for the Calendar page.
 * Runs axe-core with wcag2aa tag filter.
 *
 * NOTE: This test runs WITHOUT the shared auth storageState because
 * calendar-a11y is not in the 'chromium' testIgnore list. It is a
 * separate project that loads .auth/athlete.json independently, so
 * it gets its own page context — no cross-pollution.
 */
const test = base.extend<{ page: Page }>({})

test('a11y', async ({ page }) => {
  await page.goto('/calendar')
  await expect(page).toHaveURL(/calendar/)

  const results = await new AxeBuilder({ page }).withTags(['wcag2aa']).analyze()

  expect(results.violations).toHaveLength(0)
})
