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

/**
 * BJJ Dashboard \u2014 Technique Types widget (PR 6a / T6a.5).
 *
 * Asserts the second widget (Technique Types, REQ-BD4 row 1, span-3)
 * is wired into the grid and renders either the donut chart (when the
 * user has confirmed rolls) or the empty-state copy (brand-new account).
 * If a legend row is visible, clicking it MUST navigate to the
 * progression page with the `?category={key}` query param (REQ-BD6).
 */
test.describe('BJJ Dashboard \u2014 Technique Types widget (PR 6a)', () => {
  test('renders the Technique Types widget heading on the dashboard', async ({ page }) => {
    await page.goto('/bjj/dashboard')

    // Heading is in the second widget card (the first is Last Techniques).
    // Use a scoped locator to disambiguate from the page H1.
    const techniqueTypesHeading = page.locator('.widget', {
      has: page.getByRole('heading', { name: 'Technique Types', level: 2 }),
    })
    await expect(techniqueTypesHeading).toBeVisible()
  })

  test('renders either the donut chart or the empty-state copy', async ({ page }) => {
    await page.goto('/bjj/dashboard')

    const techniqueTypesWidget = page.locator('.widget', {
      has: page.getByRole('heading', { name: 'Technique Types', level: 2 }),
    })

    // The donut is present when segments exist (cumulative technique distribution).
    // Otherwise the empty-state copy renders. Either is acceptable per the
    // smoke-test contract (REQ-BD5).
    const donut = techniqueTypesWidget.locator('.donut')
    const emptyCopy = techniqueTypesWidget.getByText(/log a bjj workout/i)

    const hasDonut = await donut.isVisible().catch(() => false)
    const hasEmptyCopy = await emptyCopy.isVisible().catch(() => false)

    expect(hasDonut || hasEmptyCopy).toBe(true)
  })

  test('clicking a legend row navigates to /bjj/blue-belt-progression?category={key} (REQ-BD6)', async ({
    page,
  }) => {
    await page.goto('/bjj/dashboard')

    // Only meaningful if the donut is rendered (i.e. the user has data).
    // Otherwise skip \u2014 the smoke contract accepts either state.
    const firstLegendRow = page.locator('.widget .legend-row').first()
    const isVisible = await firstLegendRow.isVisible().catch(() => false)
    test.skip(!isVisible, 'No legend rows to click \u2014 user has no confirmed rolls in window')

    // The accessible name pattern is "{Category}, {pct}%", e.g.
    // "Submissions, 40%". Click the first one and verify navigation.
    await firstLegendRow.click()
    await expect(page).toHaveURL(/\/bjj\/blue-belt-progression\?category=[a-z_]+$/)
  })
})
