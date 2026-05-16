import { test as setup, expect } from '@playwright/test'
import path from 'path'

/**
 * Auth setup — runs once before the test suite.
 * Logs in as athlete1 and saves session to .auth/athlete.json.
 * All tests in the "chromium" project load this state automatically.
 */

const authFile = path.join('.auth', 'athlete.json')

setup('authenticate as athlete1', async ({ page }) => {
  await page.goto('/login')

  await page.getByLabel('Email').fill('athlete1@example.com')
  await page.getByLabel('Password').fill('Password123!')
  await page.getByRole('button', { name: /sign in/i }).click()

  // Wait until we're on the workouts list — confirms auth succeeded
  await expect(page).toHaveURL('/workouts')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

  await page.context().storageState({ path: authFile })
})
