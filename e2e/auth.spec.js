"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pages_fixture_1 = require("./fixtures/pages.fixture");
/**
 * Auth tests — run WITHOUT storage state (project: anon).
 * Tests login UI, invalid credentials, and redirect protection.
 */
pages_fixture_1.test.describe('Auth: login flow', () => {
    (0, pages_fixture_1.test)('valid credentials redirect to workouts list', async ({ loginPage, page }) => {
        await loginPage.goto();
        await loginPage.loginAndWait('athlete1@example.com', 'Password123!');
        await (0, pages_fixture_1.expect)(page).toHaveURL('/workouts');
        await (0, pages_fixture_1.expect)(page.getByRole('heading', { name: /workouts/i })).toBeVisible();
    });
    (0, pages_fixture_1.test)('invalid password shows error message', async ({ loginPage }) => {
        await loginPage.goto();
        await loginPage.login('athlete1@example.com', 'wrongpassword');
        await loginPage.expectError(/invalid/i);
    });
    (0, pages_fixture_1.test)('unauthenticated user is redirected to login from a protected route', async ({ page }) => {
        await page.goto('/workouts');
        await (0, pages_fixture_1.expect)(page).toHaveURL(/\/login/);
    });
    (0, pages_fixture_1.test)('unauthenticated user is redirected to login from /calendar', async ({ page }) => {
        await page.goto('/calendar');
        await (0, pages_fixture_1.expect)(page).toHaveURL(/\/login/);
    });
});
