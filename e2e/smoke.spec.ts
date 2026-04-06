import { test, expect } from '@playwright/test'

/**
 * TR-005 — Playwright smoke spec
 *
 * Prerequisites:
 * 1. Local Supabase running: `supabase start`
 * 2. DB seeded: `supabase db reset` (applies migrations + seed.sql)
 * 3. Dev server running: `npm run dev`
 *
 * Seed credentials (from supabase/seed.sql):
 * - athlete1@example.com / Password123!
 * - athlete2@example.com / Password123!
 * - admin@example.com / Password123!
 *
 * Run manually: npx playwright test e2e/smoke.spec.ts
 * (Do NOT run in CI without a seeded Supabase environment)
 */

test.describe('Smoke: sign-in → create workout → appears in list', () => {
  test('athlete can sign in, create a workout, and see it in the list', async ({ page }) => {
    // ── Sign in ──────────────────────────────────────────────────────────
    await page.goto('/login')
    await page.getByLabel('Email').fill('athlete1@example.com')
    await page.getByLabel('Password').fill('Password123!')
    await page.getByRole('button', { name: /sign in/i }).click()

    // Should redirect to workouts list
    await expect(page).toHaveURL('/workouts')
    await expect(page.getByRole('heading', { name: /workouts/i })).toBeVisible()

    // ── Navigate to create form ────────────────────────────────────────
    await page.getByRole('button', { name: /log workout/i }).first().click()
    await expect(page).toHaveURL('/workouts/new')

    // ── Fill create form ──────────────────────────────────────────────
    const workoutTitle = `E2E Test WOD ${Date.now()}`

    await page.getByLabel('Title').fill(workoutTitle)

    // Type is pre-selected as 'crossfit' — leave it

    // Set performed_at (datetime-local)
    await page.getByLabel(/date/i).fill('2026-04-05T10:00')

    // Set duration
    const durationInput = page.getByLabel(/duration/i)
    await durationInput.fill('')
    await durationInput.fill('45')

    // Save
    await page.getByRole('button', { name: /^save$/i }).click()

    // ── Verify redirect to list ────────────────────────────────────────
    await expect(page).toHaveURL('/workouts')

    // ── Verify workout appears in the list ────────────────────────────
    await expect(page.getByText(workoutTitle)).toBeVisible()
  })

  test('athlete can edit an existing workout', async ({ page }) => {
    // Sign in
    await page.goto('/login')
    await page.getByLabel('Email').fill('athlete1@example.com')
    await page.getByLabel('Password').fill('Password123!')
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page).toHaveURL('/workouts')

    // Open the first workout
    const firstWorkoutLink = page.getByRole('link').first()
    const workoutHref = await firstWorkoutLink.getAttribute('href')
    await firstWorkoutLink.click()

    // Click Edit
    await page.getByRole('button', { name: /edit/i }).click()
    await expect(page).toHaveURL(new RegExp(`${workoutHref ?? ''}/edit`))

    // Change the title
    const titleInput = page.getByLabel('Title')
    await titleInput.fill('')
    const updatedTitle = `Edited WOD ${Date.now()}`
    await titleInput.fill(updatedTitle)
    await page.getByRole('button', { name: /^save$/i }).click()

    // Should navigate back to detail page
    await expect(page).toHaveURL(new RegExp('/workouts/[\\w-]+$'))
    await expect(page.getByText(updatedTitle)).toBeVisible()
  })

  test('athlete can delete a workout', async ({ page }) => {
    // Sign in
    await page.goto('/login')
    await page.getByLabel('Email').fill('athlete1@example.com')
    await page.getByLabel('Password').fill('Password123!')
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page).toHaveURL('/workouts')

    // Create a workout to delete
    await page.getByRole('button', { name: /log workout/i }).first().click()
    const deleteTitle = `To Delete ${Date.now()}`
    await page.getByLabel('Title').fill(deleteTitle)
    await page.getByLabel(/date/i).fill('2026-04-05T10:00')
    const durationInput = page.getByLabel(/duration/i)
    await durationInput.fill('')
    await durationInput.fill('30')
    await page.getByRole('button', { name: /^save$/i }).click()
    await expect(page).toHaveURL('/workouts')

    // Open the newly created workout
    await page.getByText(deleteTitle).click()

    // Click Delete
    await page.getByRole('button', { name: /delete/i }).click()

    // Confirm in dialog
    const confirmDialog = page.getByText(/are you sure you want to delete/i)
    await expect(confirmDialog).toBeVisible()
    await page.getByRole('button', { name: /^delete$/i }).last().click()

    // Should redirect to list and workout should be gone
    await expect(page).toHaveURL('/workouts')
    await expect(page.getByText(deleteTitle)).not.toBeVisible()
  })
})
