"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pages_fixture_1 = require("./fixtures/pages.fixture");
/**
 * Calendar E2E tests — 6 scenarios.
 * Run authenticated via .auth/athlete.json (setup by auth.setup.ts).
 *
 * Prerequisites:
 *   supabase db reset && bash scripts/seed-users.sh
 */
pages_fixture_1.test.describe.configure({ mode: 'serial' });
pages_fixture_1.test.describe('Calendar', () => {
    let seededWorkoutTitle;
    let seededWorkoutUrl;
    pages_fixture_1.test.beforeEach(async ({ page, workoutFormPage }) => {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 3); // avoid month boundary
        seededWorkoutTitle = `E2E Calendar Workout ${Date.now()}`;
        // Navigate to CrossFit workout form and create via UI
        await workoutFormPage.gotoNew();
        await workoutFormPage.fillTitle(seededWorkoutTitle);
        // Fill date in datetime-local format: YYYY-MM-DDTHH:mm
        const dateValue = futureDate.toISOString().slice(0, 16);
        await workoutFormPage.fillDate(dateValue);
        await workoutFormPage.fillDuration(45);
        await page.waitForURL(/\/workouts\/[\w-]+/, { timeout: 15000 });
        seededWorkoutUrl = page.url();
    });
    pages_fixture_1.test.afterEach(async ({ page }) => {
        // Navigate to the workout detail page and delete
        if (seededWorkoutUrl) {
            try {
                await page.goto(seededWorkoutUrl, { timeout: 5000 });
                const deleteButton = page.getByRole('button', { name: /delete/i }).first();
                await deleteButton.click({ timeout: 5000 });
                const confirmButton = page.getByRole('button', { name: /confirm|delete|yes/i });
                if (await confirmButton.isVisible({ timeout: 2000 })) {
                    await confirmButton.click();
                }
            }
            catch {
                // Cleanup errors are non-fatal
            }
        }
    });
    (0, pages_fixture_1.test)('displays the current month with correct heading and day cells', async ({ calendarPage }) => {
        await calendarPage.goto();
        await calendarPage.page.waitForLoadState('networkidle');
        await (0, pages_fixture_1.expect)(calendarPage.monthTitle).toBeVisible();
        const dayCells = calendarPage.dayCells;
        const count = await dayCells.count();
        (0, pages_fixture_1.expect)(count).toBeGreaterThanOrEqual(28);
        (0, pages_fixture_1.expect)(count).toBeLessThanOrEqual(42);
    });
    (0, pages_fixture_1.test)('clicking Previous month updates the heading', async ({ calendarPage }) => {
        await calendarPage.goto();
        await calendarPage.page.waitForLoadState('networkidle');
        const currentTitle = await calendarPage.monthTitle.textContent();
        await calendarPage.clickPrevMonth();
        const newTitle = await calendarPage.monthTitle.textContent();
        (0, pages_fixture_1.expect)(newTitle).not.toBe(currentTitle);
    });
    (0, pages_fixture_1.test)('clicking Next month updates the heading', async ({ calendarPage }) => {
        await calendarPage.goto();
        await calendarPage.page.waitForLoadState('networkidle');
        const currentTitle = await calendarPage.monthTitle.textContent();
        await calendarPage.clickNextMonth();
        const newTitle = await calendarPage.monthTitle.textContent();
        (0, pages_fixture_1.expect)(newTitle).not.toBe(currentTitle);
    });
    (0, pages_fixture_1.test)('Today button returns to current month', async ({ calendarPage }) => {
        await calendarPage.goto();
        await calendarPage.page.waitForLoadState('networkidle');
        await calendarPage.clickPrevMonth();
        await calendarPage.clickPrevMonth();
        await calendarPage.clickToday();
        const now = new Date();
        const expected = `${now.toLocaleString('en-US', { month: 'long' })} ${now.getFullYear()}`;
        await (0, pages_fixture_1.expect)(calendarPage.monthTitle).toContainText(expected);
    });
    (0, pages_fixture_1.test)('day with seeded workout shows a workout chip', async ({ calendarPage, page }) => {
        await calendarPage.goto();
        // Wait for calendar to fully load
        await calendarPage.page.waitForLoadState('networkidle');
        // Wait for loading spinners to disappear (loading state after nav)
        await page.waitForSelector('.animate-spin', { state: 'hidden', timeout: 5000 }).catch(() => { });
        // Scroll the day cells grid (not the day-of-week header) into view
        const dayCellsGrid = calendarPage.page.locator('.grid.grid-cols-7').nth(1);
        await dayCellsGrid.scrollIntoViewIfNeeded();
        // Poll for the specific workout chip to appear (React Query may need time to fetch)
        const chip = calendarPage.workoutChip(seededWorkoutTitle);
        await (0, pages_fixture_1.expect)(chip).toBeVisible({ timeout: 20000 });
    });
    (0, pages_fixture_1.test)('clicking workout chip navigates to the workout detail page', async ({ page, calendarPage }) => {
        await calendarPage.goto();
        const chip = calendarPage.workoutChip(seededWorkoutTitle);
        await chip.click();
        await (0, pages_fixture_1.expect)(page).toHaveURL(/\/workouts\/[\w-]+/);
        await (0, pages_fixture_1.expect)(page.getByText(seededWorkoutTitle)).toBeVisible();
    });
    (0, pages_fixture_1.test)('clicking empty day navigates to new workout form with date prefilled', async ({ page, calendarPage }) => {
        await calendarPage.goto();
        await calendarPage.page.waitForLoadState('networkidle');
        // Pick a future empty day (today + 7 to avoid conflicts with seeded workout)
        const emptyDate = new Date();
        emptyDate.setDate(emptyDate.getDate() + 7);
        const dateStr = emptyDate.toISOString().slice(0, 10); // YYYY-MM-DD
        await calendarPage.clickEmptyDayByLabel(emptyDate);
        await (0, pages_fixture_1.expect)(page).toHaveURL(new RegExp(`/workouts/new\\?date=${dateStr}`));
    });
});
