import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright configuration.
 *
 * Projects:
 *   setup    — runs auth.setup.ts once to save .auth/athlete.json
 *   chromium — all specs run authenticated (depends on setup)
 *   anon     — auth.spec.ts unauthenticated tests (no storageState)
 *
 * Prerequisites:
 *   1. supabase start
 *   2. supabase db reset   (seeds exercises + public_wods)
 *   3. bash scripts/seed-users.sh
 *   4. npm run dev  (or use webServer below)
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },

  projects: [
    // ── Auth setup ─────────────────────────────────────────────────────────
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },

    // ── Authenticated tests (default) ──────────────────────────────────────
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.auth/athlete.json',
      },
      dependencies: ['setup'],
      testIgnore: /auth\.spec\.ts/,
    },

    // ── Unauthenticated tests ──────────────────────────────────────────────
    {
      name: 'anon',
      use: {
        ...devices['Desktop Chrome'],
        storageState: { cookies: [], origins: [] },
      },
      testMatch: /auth\.spec\.ts/,
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
})
