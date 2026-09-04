import { test, expect } from './fixtures/pages.fixture'

/**
 * Workout With Format
 *
 * Creates a workout with the "For Time" WOD format and adds a
 * movement manually via the ExercisePicker + repScheme field.
 *
 * ExercisePicker exposes data-testid="exercise-picker-input" so we can
 * target it precisely within a movement-row and use pressSequentially()
 * to trigger React's onChange char-by-char, which populates the datalist
 * and fires onChange(id, name) on exact match.
 */
test.describe('Workout with WOD format', () => {
  test('selects "For Time" format and movement section appears', async ({
    workoutFormPage,
    page,
  }) => {
    await workoutFormPage.gotoNew()

    // Select "For Time" format from the native WodFormatSelector <select>
    await page.getByLabel('WOD Format').selectOption('for_time')

    // The ForTimeFormSection should now be visible
    await expect(page.getByTestId('wod-form-section-for-time-payload')).toBeVisible()

    // "Add movement" button should be visible
    await expect(page.getByRole('button', { name: /add movement/i })).toBeVisible()

    // Click it — movement row 0 should appear
    await page.getByRole('button', { name: /add movement/i }).click()
    const row0 = page.getByTestId('movement-row-0')
    await expect(row0).toBeVisible()

    // Exercise picker is targetable via data-testid
    await expect(row0.getByTestId('exercise-picker-input')).toBeVisible()

    // Fill rep scheme
    await row0.getByLabel(/rep scheme/i).fill('21-15-9')
    await expect(row0.getByLabel(/rep scheme/i)).toHaveValue('21-15-9')
  })

  test('creates a for-time workout with one movement and saves', async ({
    workoutFormPage,
    page,
  }) => {
    await workoutFormPage.gotoNew()

    await workoutFormPage.fillTitle('Test For Time Workout')

    // Select "For Time" format
    await page.getByLabel('WOD Format').selectOption('for_time')
    await expect(page.getByTestId('wod-form-section-for-time-payload')).toBeVisible()

    // Add a movement row
    await page.getByRole('button', { name: /add movement/i }).click()
    const row0 = page.getByTestId('movement-row-0')
    await expect(row0).toBeVisible()

    // Type into the ExercisePicker to trigger the API search (setSearchQuery).
    const exerciseInput = row0.getByTestId('exercise-picker-input')
    await exerciseInput.fill('Deadlift')

    // Wait for the datalist to be populated — means the API returned results.
    await expect(page.locator('#exercise-options option[value="Deadlift"]')).toBeAttached({
      timeout: 10_000,
    })

    // Now dispatch a native input event so React's onInput handler fires and
    // picks up the exact match, setting exerciseId in the form store.
    await exerciseInput.dispatchEvent('input')

    // Confirm the hidden exerciseId has been set to a UUID.
    await expect(row0.locator('[data-testid="exercise-id-0"]')).toHaveValue(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      { timeout: 5_000 },
    )

    // Rep scheme
    await row0.getByLabel(/rep scheme/i).fill('21-15-9')

    // Save — exerciseId should be resolved; expect navigation to /workouts
    await workoutFormPage.saveAndExpectSuccess()
  })

  test('shows validation error if movements list is empty when format is set', async ({
    workoutFormPage,
    page,
  }) => {
    await workoutFormPage.gotoNew()

    await workoutFormPage.fillTitle('Empty Movements Test')

    // Select for_time but add NO movements
    await page.getByLabel('WOD Format').selectOption('for_time')

    // Attempt to save
    await workoutFormPage.save()

    // Should NOT navigate away — Zod validation requires at least 1 movement.
    // WorkoutFormPage.gotoNew() lands on /workouts/new/crossfit, not the picker route.
    await expect(page).toHaveURL('/workouts/new/crossfit')
  })
})
