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

    // Type the exact exercise name char by char to trigger React's onChange.
    // The ExercisePicker calls onChange(id, name) when it finds an exact match.
    const exerciseInput = row0.getByTestId('exercise-picker-input')
    await exerciseInput.pressSequentially('Deadlift', { delay: 50 })

    // Wait for the API search + exact-match resolution to set exerciseId in the form
    await expect(exerciseInput).toHaveValue('Deadlift')
    // Give the component time to resolve the UUID from the datalist match
    await page.waitForTimeout(300)

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

    // Should NOT navigate away — Zod validation requires at least 1 movement
    await expect(page).toHaveURL('/workouts/new')
  })
})
