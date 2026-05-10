import { test, expect } from '../fixtures/pages.fixture'
import AxeBuilder from '@axe-core/playwright'

/**
 * Accessibility scan for the Workout List page.
 * Runs axe-core with wcag2aa tag filter.
 */
test('a11y', async ({ workoutsPage }) => {
  await workoutsPage.goto()
  await expect(workoutsPage.page).toHaveURL(/workouts/)

  const results = await new AxeBuilder({ page: workoutsPage.page })
    .withTags(['wcag2aa'])
    .analyze()

  expect(results.violations).toHaveLength(0)
})