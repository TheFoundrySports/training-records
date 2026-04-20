import { test as base, expect } from '@playwright/test'

/**
 * BJJ Admin Techniques CRUD — T5.7
 *
 * Tests admin CRUD for /admin/bjj-techniques.
 * Admin login is done inline (no separate setup project needed since
 * the existing Playwright config only has athlete.json for general auth).
 *
 * The "non-admin redirect" test uses the chromium project storageState
 * (athlete1) and verifies access is denied.
 *
 * Prerequisites:
 *   supabase db reset && bash scripts/seed-users.sh
 *   (admin@example.com / Password123! must exist with role=admin)
 */

// Admin test — logs in as admin inline (no shared storageState)
const adminTest = base.extend({})

adminTest.describe('Admin: BJJ Techniques CRUD', () => {
  adminTest.beforeEach(async ({ page }) => {
    // Log in as admin
    await page.goto('/login')
    await page.getByLabel('Email').fill('admin@example.com')
    await page.getByLabel('Password').fill('Password123!')
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page).toHaveURL('/workouts')
  })

  adminTest('admin can navigate to BJJ techniques list', async ({ page }) => {
    await page.goto('/admin/bjj-techniques')
    await expect(page.getByRole('heading', { name: /bjj techniques/i })).toBeVisible()
  })

  adminTest('admin can create a new technique', async ({ page }) => {
    await page.goto('/admin/bjj-techniques/new')

    const techniqueName = `E2E Technique ${Date.now()}`

    await page.getByLabel('Name').fill(techniqueName)

    // Save
    await page.getByRole('button', { name: /save/i }).click()

    // Should navigate back to list
    await expect(page).toHaveURL('/admin/bjj-techniques')

    // Technique should appear in the list
    await expect(page.getByText(techniqueName)).toBeVisible()
  })

  adminTest('admin can edit an existing technique', async ({ page }) => {
    // Create one first
    await page.goto('/admin/bjj-techniques/new')
    const originalName = `Edit Me ${Date.now()}`
    await page.getByLabel('Name').fill(originalName)
    await page.getByRole('button', { name: /save/i }).click()
    await expect(page).toHaveURL('/admin/bjj-techniques')
    await expect(page.getByText(originalName)).toBeVisible()

    // Click Edit for that technique
    const row = page.getByRole('row').filter({ hasText: originalName })
    await row.getByRole('link', { name: /edit/i }).click()

    // Should be on the edit form
    await expect(page).toHaveURL(/\/admin\/bjj-techniques\/.+\/edit/)

    const updatedName = `Edited ${Date.now()}`
    const nameInput = page.getByLabel('Name')
    await nameInput.fill('')
    await nameInput.fill(updatedName)
    await page.getByRole('button', { name: /save/i }).click()

    // Back on list
    await expect(page).toHaveURL('/admin/bjj-techniques')
    await expect(page.getByText(updatedName)).toBeVisible()
  })

  adminTest('admin can delete a technique', async ({ page }) => {
    // Create one first
    await page.goto('/admin/bjj-techniques/new')
    const techniqueName = `Delete Me ${Date.now()}`
    await page.getByLabel('Name').fill(techniqueName)
    await page.getByRole('button', { name: /save/i }).click()
    await expect(page).toHaveURL('/admin/bjj-techniques')
    await expect(page.getByText(techniqueName)).toBeVisible()

    // Click Delete for that technique
    const row = page.getByRole('row').filter({ hasText: techniqueName })
    await row.getByRole('button', { name: /delete/i }).click()

    // Confirmation dialog appears
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByText(/are you sure/i)).toBeVisible()

    // Confirm delete
    await page
      .getByRole('button', { name: /^delete$/i })
      .last()
      .click()

    // Technique should be gone
    await expect(page.getByText(techniqueName)).not.toBeVisible()
  })
})

// Non-admin redirect test — runs with athlete storageState (chromium project)
import { test, expect as _expect } from './fixtures/pages.fixture'

test.describe('Admin route: non-admin redirect', () => {
  test('regular athlete navigating to /admin/bjj-techniques is redirected to /', async ({
    page,
  }) => {
    await page.goto('/admin/bjj-techniques')

    // AdminRoute redirects to "/" for non-admin users
    await expect(page).toHaveURL('/')
  })
})
