import { test, expect } from '../fixtures/pages.fixture'
import AxeBuilder from '@axe-core/playwright'

/**
 * Accessibility scan for the Workout Detail page.
 * Runs axe-core with wcag2aa tag filter.
 *
 * Prerequisites: auth.setup.ts must have run (storageState in .auth/athlete.json)
 */
test('a11y', async ({ workoutsPage }) => {
  await workoutsPage.goto()
  await workoutsPage.openFirstWorkout()

  await expect(workoutsPage.page).toHaveURL(/\/workouts\/[\w-]+$/)

  const results = await new AxeBuilder({ page: workoutsPage.page })
    .withTags(['wcag2aa'])
    .analyze()

  expect(results.violations).toHaveLength(0)
})