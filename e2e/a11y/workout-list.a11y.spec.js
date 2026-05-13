"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const pages_fixture_1 = require("../fixtures/pages.fixture");
const playwright_1 = __importDefault(require("@axe-core/playwright"));
/**
 * Accessibility scan for the Workout List page.
 * Runs axe-core with wcag2aa tag filter.
 */
(0, pages_fixture_1.test)('a11y', async ({ workoutsPage }) => {
    await workoutsPage.goto();
    await (0, pages_fixture_1.expect)(workoutsPage.page).toHaveURL(/workouts/);
    const results = await new playwright_1.default({ page: workoutsPage.page })
        .withTags(['wcag2aa'])
        .analyze();
    (0, pages_fixture_1.expect)(results.violations).toHaveLength(0);
});
