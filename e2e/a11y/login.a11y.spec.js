"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const pages_fixture_1 = require("../fixtures/pages.fixture");
const playwright_1 = __importDefault(require("@axe-core/playwright"));
/**
 * Accessibility scan for the Login page.
 * Runs axe-core with wcag2aa tag filter.
 */
(0, pages_fixture_1.test)('a11y', async ({ loginPage }) => {
    await loginPage.goto();
    await (0, pages_fixture_1.expect)(loginPage.page).toHaveURL(/login/);
    const results = await new playwright_1.default({ page: loginPage.page })
        .withTags(['wcag2aa'])
        .analyze();
    (0, pages_fixture_1.expect)(results.violations).toHaveLength(0);
});
