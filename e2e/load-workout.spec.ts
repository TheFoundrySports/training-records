import { test, expect } from './fixtures/pages.fixture'

/**
 * Load Workout flow
 *
 * Opens the PublicWodPickerModal, searches for a workout,
 * selects it and verifies the form is pre-filled with the
 * correct title, format, and movements.
 *
 * Amanda seed data (supabase/seed.sql, workout-11):
 *   title:    "CrossFit - Amanda"
 *   format:   for_time
 *   movements:
 *     [0] Ring Muscle-up  — repScheme "9-7-5"
 *     [1] Squat Snatch    — repScheme "9-7-5"
 */
test.describe('Load Workout from public library', () => {
  test('loads CrossFit - Amanda and pre-fills the form', async ({ workoutFormPage, page }) => {
    await workoutFormPage.gotoNew()

    // Open the picker modal
    const modal = await workoutFormPage.openLoadWorkoutModal()

    // Search and select Amanda
    await modal.search('Amanda')
    await modal.selectWod('CrossFit - Amanda')

    // --- Basic fields ---
    await expect(workoutFormPage.titleInput).toHaveValue('CrossFit - Amanda')

    // WodFormatSelector is a native <select> with aria-label="WOD Format"
    const formatSelect = page.getByLabel('WOD Format')
    await expect(formatSelect).toHaveValue('for_time')

    // --- Movements (rendered inside ForTimeFormSection) ---
    // Movement rows have data-testid="movement-row-{index}"
    const row0 = page.getByTestId('movement-row-0')
    const row1 = page.getByTestId('movement-row-1')

    // Wait for both rows to appear (they are rendered after form.reset)
    await expect(row0).toBeVisible()
    await expect(row1).toBeVisible()

    // Exercise names are shown in the ExercisePicker text input (aria-label="Exercise")
    // The ExercisePicker resolves the UUID → name via API call; wait for it.
    await expect(row0.getByLabel('Exercise')).toHaveValue(/ring muscle.up/i, { timeout: 10_000 })
    await expect(row1.getByLabel('Exercise')).toHaveValue(/squat snatch/i, { timeout: 10_000 })

    // Rep scheme labels: "Rep Scheme (optional, e.g. 9-7-5)"
    await expect(row0.getByLabel(/rep scheme/i)).toHaveValue('9-7-5')
    await expect(row1.getByLabel(/rep scheme/i)).toHaveValue('9-7-5')

    // Save — should navigate to /workouts on success
    await workoutFormPage.saveAndExpectSuccess()
  })

  test('can select a different workout from the modal', async ({ workoutFormPage }) => {
    await workoutFormPage.gotoNew()

    const modal = await workoutFormPage.openLoadWorkoutModal()
    await modal.search('Diane')
    await modal.selectWod('CrossFit - Diane')

    await expect(workoutFormPage.titleInput).toHaveValue('CrossFit - Diane')
  })
})
