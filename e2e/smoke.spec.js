"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pages_fixture_1 = require("./fixtures/pages.fixture");
/**
 * Smoke tests — core workout CRUD flows.
 * Run authenticated via .auth/athlete.json (setup by auth.setup.ts).
 *
 * Prerequisites:
 *   supabase db reset && bash scripts/seed-users.sh
 */
pages_fixture_1.test.describe('Smoke: workout CRUD', () => {
    (0, pages_fixture_1.test)('athlete can create a workout and see it in the list', async ({ workoutsPage, workoutFormPage, }) => {
        await workoutsPage.goto();
        await workoutsPage.clickLogWorkout();
        const title = `E2E Test WOD ${Date.now()}`;
        await workoutFormPage.fillTitle(title);
        await workoutFormPage.fillDate('2026-04-05T10:00');
        await workoutFormPage.fillDuration(45);
        await workoutFormPage.saveAndExpectSuccess();
        await workoutsPage.expectWorkoutVisible(title);
    });
    (0, pages_fixture_1.test)('athlete can edit an existing workout', async ({ workoutsPage, workoutDetailPage, workoutFormPage, page, }) => {
        await workoutsPage.goto();
        const href = await workoutsPage.openFirstWorkout();
        await workoutDetailPage.clickEdit();
        await (0, pages_fixture_1.expect)(page).toHaveURL(new RegExp(`${href}/edit`));
        const updatedTitle = `Edited WOD ${Date.now()}`;
        await workoutFormPage.fillTitle(updatedTitle);
        await workoutFormPage.save();
        await (0, pages_fixture_1.expect)(page).toHaveURL(new RegExp('/workouts/[\\w-]+$'));
        await workoutDetailPage.expectTitle(updatedTitle);
    });
    (0, pages_fixture_1.test)('athlete can delete a workout', async ({ workoutsPage, workoutFormPage, workoutDetailPage, }) => {
        // Create a workout to delete
        await workoutsPage.goto();
        await workoutsPage.clickLogWorkout();
        const title = `To Delete ${Date.now()}`;
        await workoutFormPage.fillTitle(title);
        await workoutFormPage.fillDate('2026-04-05T10:00');
        await workoutFormPage.fillDuration(30);
        await workoutFormPage.saveAndExpectSuccess();
        // Open and delete it
        await workoutsPage.openWorkoutByTitle(title);
        await workoutDetailPage.deleteWorkout();
        await workoutsPage.expectWorkoutNotVisible(title);
    });
});
