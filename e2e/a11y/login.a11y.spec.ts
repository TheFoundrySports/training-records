import { test, expect } from '../fixtures/pages.fixture'
import AxeBuilder from '@axe-core/playwright'

/**
 * Accessibility scan for the Login page.
 * Runs axe-core with wcag2aa tag filter.
 */
test('a11y', async ({ loginPage }) => {
  await loginPage.goto()
  await expect(loginPage.page).toHaveURL(/login/)

  const results = await new AxeBuilder({ page: loginPage.page })
    .withTags(['wcag2aa'])
    .analyze()

  expect(results.violations).toHaveLength(0)
})