import { LoginPage } from '../pages/login.page';
import { WorkoutsPage } from '../pages/workouts.page';
import { WorkoutFormPage } from '../pages/workout-form.page';
import { WorkoutDetailPage } from '../pages/workout-detail.page';
import { GarminImportPage } from '../pages/garmin-import.page';
import { CalendarPage } from '../pages/calendar.page';
import { BeltProgressionPage } from '../pages/belt-progression.page';
type Pages = {
    loginPage: LoginPage;
    workoutsPage: WorkoutsPage;
    workoutFormPage: WorkoutFormPage;
    workoutDetailPage: WorkoutDetailPage;
    garminImportPage: GarminImportPage;
    calendarPage: CalendarPage;
    beltProgressionPage: BeltProgressionPage;
};
/**
 * Extended test with pre-instantiated Page Objects.
 * Import { test, expect } from this file instead of @playwright/test.
 */
export declare const test: import("@playwright/test").TestType<import("@playwright/test").PlaywrightTestArgs & import("@playwright/test").PlaywrightTestOptions & Pages, import("@playwright/test").PlaywrightWorkerArgs & import("@playwright/test").PlaywrightWorkerOptions>;
export { expect } from '@playwright/test';
