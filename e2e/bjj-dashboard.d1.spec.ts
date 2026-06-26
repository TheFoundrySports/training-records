import { test, expect } from './fixtures/pages.fixture'

/**
 * BJJ Dashboard shell smoke (PR 5 / T5.17).
 *
 * Asserts the route renders end-to-end with one real widget and the
 * 4 stubbed widgets, the time filter is interactive, and the AppShell
 * nav exposes the BJJ Dashboard entry.
 *
 * Prereqs (matches the global Playwright setup):
 *   supabase start && supabase db reset && bash scripts/seed-users.sh
 *
 * Notes:
 *  - This is a SMOKE test, not a full data assertion. It does not seed
 *    confirmed rolls; the empty-state copy covers that case (REQ-BD5).
 *  - If the user has prior workouts, the LastTechniques widget renders
 *    rows \u2014 either is acceptable for a smoke test.
 */

test.describe('BJJ Dashboard shell (PR 5)', () => {
  test('renders the dashboard page with header, filter, and 5 widgets', async ({ page }) => {
    await page.goto('/bjj/dashboard')

    await expect(page.getByRole('heading', { level: 1, name: /bjj evolution dashboard/i })).toBeVisible()

    // Time filter has all 4 presets
    await expect(page.getByRole('button', { name: '7d' })).toBeVisible()
    await expect(page.getByRole('button', { name: '30d' })).toBeVisible()
    await expect(page.getByRole('button', { name: '90d' })).toBeVisible()
    await expect(page.getByRole('button', { name: '10r' })).toBeVisible()

    // 5 widget cards are rendered
    const widgets = page.locator('.widget')
    await expect(widgets).toHaveCount(5)

    // Footer carries the live-data stamp
    await expect(page.getByText(/last updated/i)).toBeVisible()
  })

  test('AppShell nav exposes the BJJ Dashboard entry', async ({ page }) => {
    await page.goto('/workouts')
    const link = page.getByRole('link', { name: /bjj dashboard/i }).first()
    await expect(link).toBeVisible()
    await link.click()
    await expect(page).toHaveURL(/\/bjj\/dashboard$/)
  })

  test('switching the time window updates the active preset', async ({ page }) => {
    await page.goto('/bjj/dashboard')

    // 30d is the default
    await expect(page.getByRole('button', { name: '30d' })).toHaveAttribute('aria-pressed', 'true')

    // Click 7d
    await page.getByRole('button', { name: '7d' }).click()
    await expect(page.getByRole('button', { name: '7d' })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('button', { name: '30d' })).toHaveAttribute('aria-pressed', 'false')
  })
})