"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const pages_fixture_1 = require("../fixtures/pages.fixture");
const playwright_1 = __importDefault(require("@axe-core/playwright"));
/**
 * Accessibility scan for the Calendar page.
 * Runs axe-core with wcag2aa tag filter.
 *
 * Prerequisites: auth.setup.ts must have run (storageState in .auth/athlete.json)
 */
(0, pages_fixture_1.test)('a11y', async ({ page }) => {
    await page.goto('/calendar');
    await (0, pages_fixture_1.expect)(page).toHaveURL(/calendar/);
    const results = await new playwright_1.default({ page })
        .withTags(['wcag2aa'])
        .analyze();
    (0, pages_fixture_1.expect)(results.violations).toHaveLength(0);
});
