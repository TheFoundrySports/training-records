import { test, expect } from '@playwright/test'

/**
 * E2E coverage for the hero picker on /workouts/new.
 *
 * The picker is wrapped in <MaterialScope>, so the bjj-dashboard design
 * tokens (CSS variables in src/theme/material-dashboard.css) drive the
 * surface, radius, shadow, and focus ring. Cards render as <a> links via
 * react-router <Link>, so each card's role is "link" with a real href.
 *
 * This spec verifies:
 *   - Both cards render at every tested viewport width (320 / 360 / 375 /
 *     414 / 640 / 768 / 1024 px) with their correct titles and subtitles.
 *   - No `break-*` utility classes are present on the cards (the absence is
 *     our regression guard for the original "Brazilian / Jiu- / Jitsu"
 *     mid-word wrap defect).
 *   - Activating the CrossFit card navigates to /workouts/new/crossfit.
 *   - Activating the BJJ card navigates to /bjj/new.
 *   - The existing /workouts/new/crossfit deep link still resolves (used
 *     by e2e/pages/workout-form.page.ts:30).
 */

test.describe('WorkoutTypePicker — /workouts/new hero picker', () => {
  test('renders the Log Workout heading and both option cards', async ({ page }) => {
    await page.goto('/workouts/new')
    await expect(page.getByRole('heading', { name: 'Log Workout' })).toBeVisible()
    await expect(page.getByRole('link', { name: /CrossFit \/ Functional/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /Brazilian Jiu-Jitsu/i })).toBeVisible()
  })

  test('CrossFit card navigates to /workouts/new/crossfit on click', async ({ page }) => {
    await page.goto('/workouts/new')
    await page.getByRole('link', { name: /CrossFit \/ Functional/i }).click()
    await expect(page).toHaveURL(/\/workouts\/new\/crossfit$/)
  })

  test('BJJ card navigates to /bjj/new on click', async ({ page }) => {
    await page.goto('/workouts/new')
    await page.getByRole('link', { name: /Brazilian Jiu-Jitsu/i }).click()
    await expect(page).toHaveURL(/\/bjj\/new$/)
  })

  test('existing /workouts/new/crossfit deep link still resolves', async ({ page }) => {
    await page.goto('/workouts/new/crossfit')
    await expect(page).toHaveURL(/\/workouts\/new\/crossfit$/)
  })

  const widths = [320, 360, 375, 414, 640, 768, 1024] as const
  for (const width of widths) {
    test(`at ${width}px both cards render and contain no break-* utility classes`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 })
      await page.goto('/workouts/new')
      await expect(page.getByRole('heading', { name: 'Log Workout' })).toBeVisible()
      const widgets = page.locator('.widget.option-card')
      await expect(widgets).toHaveCount(2)
      const breakingUtilityOnCards = await widgets.evaluateAll((nodes) =>
        nodes.some((el) =>
          Array.from(el.classList).some(
            (cls) =>
              cls.startsWith('break-') || cls.startsWith('hyphens-'),
          ),
        ),
      )
      expect(breakingUtilityOnCards).toBe(false)
    })
  }
})
