import { test as base } from '@playwright/test'
import { LoginPage } from '../pages/login.page'
import { WorkoutsPage } from '../pages/workouts.page'
import { WorkoutFormPage } from '../pages/workout-form.page'
import { WorkoutDetailPage } from '../pages/workout-detail.page'
import { GarminImportPage } from '../pages/garmin-import.page'

type Pages = {
  loginPage: LoginPage
  workoutsPage: WorkoutsPage
  workoutFormPage: WorkoutFormPage
  workoutDetailPage: WorkoutDetailPage
  garminImportPage: GarminImportPage
}

/**
 * Extended test with pre-instantiated Page Objects.
 * Import { test, expect } from this file instead of @playwright/test.
 */
export const test = base.extend<Pages>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page))
  },
  workoutsPage: async ({ page }, use) => {
    await use(new WorkoutsPage(page))
  },
  workoutFormPage: async ({ page }, use) => {
    await use(new WorkoutFormPage(page))
  },
  workoutDetailPage: async ({ page }, use) => {
    await use(new WorkoutDetailPage(page))
  },
  garminImportPage: async ({ page }, use) => {
    await use(new GarminImportPage(page))
  },
})

export { expect } from '@playwright/test'
