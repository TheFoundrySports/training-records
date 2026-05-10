"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.expect = exports.test = void 0;
const test_1 = require("@playwright/test");
const login_page_1 = require("../pages/login.page");
const workouts_page_1 = require("../pages/workouts.page");
const workout_form_page_1 = require("../pages/workout-form.page");
const workout_detail_page_1 = require("../pages/workout-detail.page");
const garmin_import_page_1 = require("../pages/garmin-import.page");
const calendar_page_1 = require("../pages/calendar.page");
/**
 * Extended test with pre-instantiated Page Objects.
 * Import { test, expect } from this file instead of @playwright/test.
 */
exports.test = test_1.test.extend({
    loginPage: async ({ page }, use) => {
        await use(new login_page_1.LoginPage(page));
    },
    workoutsPage: async ({ page }, use) => {
        await use(new workouts_page_1.WorkoutsPage(page));
    },
    workoutFormPage: async ({ page }, use) => {
        await use(new workout_form_page_1.WorkoutFormPage(page));
    },
    workoutDetailPage: async ({ page }, use) => {
        await use(new workout_detail_page_1.WorkoutDetailPage(page));
    },
    garminImportPage: async ({ page }, use) => {
        await use(new garmin_import_page_1.GarminImportPage(page));
    },
    calendarPage: async ({ page }, use) => {
        await use(new calendar_page_1.CalendarPage(page));
    },
});
var test_2 = require("@playwright/test");
Object.defineProperty(exports, "expect", { enumerable: true, get: function () { return test_2.expect; } });
