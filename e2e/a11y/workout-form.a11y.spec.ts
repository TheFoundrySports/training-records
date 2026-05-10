import { test, expect } from '../fixtures/pages.fixture'
import AxeBuilder from '@axe-core/playwright'

/**
 * Accessibility scan for the Workout Form page (standard).
 * Runs axe-core with wcag2aa tag filter.
 *
 * Prerequisites: auth.setup.ts must have run (storageState in .auth/athlete.json)
 */
test('a11y', async ({ workoutsPage, workoutFormPage }) => {
  await workoutsPage.goto()
  await workoutsPage.clickLogWorkout()

  await expect(workoutsPage.page).toHaveURL(/\/workouts\/new/)

  const results = await new AxeBuilder({ page: workoutFormPage.page })
    .withTags(['wcag2aa'])
    .analyze()

  expect(results.violations).toHaveLength(0)
})