import { test, expect } from './fixtures/pages.fixture'

/**
 * Auth tests — run WITHOUT storage state (project: anon).
 * Tests login UI, invalid credentials, and redirect protection.
 */

test.describe('Auth: login flow', () => {
  test('valid credentials redirect to workouts list', async ({ loginPage, page }) => {
    await loginPage.goto()
    await loginPage.loginAndWait('athlete1@example.com', 'Password123!')
    await expect(page).toHaveURL('/workouts')
    await expect(page.getByRole('heading', { name: /workouts/i })).toBeVisible()
  })

  test('invalid password shows error message', async ({ loginPage }) => {
    await loginPage.goto()
    await loginPage.login('athlete1@example.com', 'wrongpassword')
    await loginPage.expectError(/invalid/i)
  })

  test('unauthenticated user is redirected to login from a protected route', async ({ page }) => {
    await page.goto('/workouts')
    await expect(page).toHaveURL(/\/login/)
  })
})
