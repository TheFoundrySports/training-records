import { test, expect } from './fixtures/pages.fixture'

/**
 * BJJ Dashboard — Phase D2 part 2 (PR 6b) smoke spec.
 *
 * Asserts the 3 new widgets (RoleBalance, Outcomes, RollFlow) are
 * wired into the page and render either their real content (when the
 * seeded user has confirmed rolls in the window) or the empty-state
 * copy (brand-new account). The "either/or" pattern matches the
 * PR 6a d1 spec — see `bjj-dashboard.d1.spec.ts`.
 *
 * The RoleBalance / Outcomes / RollFlow widget shells use the REQ-BD5
 * empty copy ("Log a BJJ workout and confirm rolls...") when their
 * data arrays are empty. The widget-specific element queries below
 * cover the "has-data" branch.
 *
 * Prereqs (matches the global Playwright setup):
 *   supabase start && supabase db reset && bash scripts/seed-users.sh
 *
 * Notes:
 *  - This is a SMOKE test, not a full data assertion. It does not seed
 *    25 workouts + 12 confirmed rolls (per T6b.8); the existing d1
 *    spec covers the seeded path in CI via the auth.setup harness.
 *  - Per PR 6a lessons: smoke tests assert on the WIDGET HEADING or
 *    the empty-copy text — both prove the shell mounted.
 */
test.describe('BJJ Dashboard — PR 6b (RoleBalance + Outcomes + RollFlow)', () => {
  test('renders all 5 widget headings in the REQ-BD4 grid', async ({ page }) => {
    await page.goto('/bjj/dashboard')

    await expect(
      page.getByRole('heading', { name: 'Last Techniques', level: 2 }),
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Technique Types', level: 2 }),
    ).toBeVisible()
    // PR 6b additions:
    await expect(
      page.getByRole('heading', { name: 'Role Balance', level: 2 }),
    ).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Outcomes', level: 2 })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Roll Flow', level: 2 })).toBeVisible()
  })

  test('renders the RoleBalance widget with either the stacked bar or empty copy', async ({
    page,
  }) => {
    await page.goto('/bjj/dashboard')

    const widget = page.locator('.widget', {
      has: page.getByRole('heading', { name: 'Role Balance', level: 2 }),
    })
    const stacked = widget.locator('.role-stacked')
    const emptyCopy = widget.getByText(/log a bjj workout/i)

    const hasStacked = await stacked.isVisible().catch(() => false)
    const hasEmptyCopy = await emptyCopy.isVisible().catch(() => false)
    expect(hasStacked || hasEmptyCopy).toBe(true)
  })

  test('renders the Outcomes widget with either the 2x2 grid or empty copy', async ({
    page,
  }) => {
    await page.goto('/bjj/dashboard')

    const widget = page.locator('.widget', {
      has: page.getByRole('heading', { name: 'Outcomes', level: 2 }),
    })
    const grid = widget.locator('.outcome-grid')
    const emptyCopy = widget.getByText(/log a bjj workout/i)

    const hasGrid = await grid.isVisible().catch(() => false)
    const hasEmptyCopy = await emptyCopy.isVisible().catch(() => false)
    expect(hasGrid || hasEmptyCopy).toBe(true)
  })

  test('renders the RollFlow widget with either the flow rows or empty copy', async ({
    page,
  }) => {
    await page.goto('/bjj/dashboard')

    const widget = page.locator('.widget', {
      has: page.getByRole('heading', { name: 'Roll Flow', level: 2 }),
    })
    const flowList = widget.locator('.flow')
    const emptyCopy = widget.getByText(/log a bjj workout/i)

    const hasFlow = await flowList.isVisible().catch(() => false)
    const hasEmptyCopy = await emptyCopy.isVisible().catch(() => false)
    expect(hasFlow || hasEmptyCopy).toBe(true)
  })

  test('RoleBalance widget has span-2; Outcomes has span-4; RollFlow has span-6 (REQ-BD4)', async ({
    page,
  }) => {
    await page.goto('/bjj/dashboard')

    const span2 = page.locator('.widget.span-2', {
      has: page.getByRole('heading', { name: 'Role Balance', level: 2 }),
    })
    const span4 = page.locator('.widget.span-4', {
      has: page.getByRole('heading', { name: 'Outcomes', level: 2 }),
    })
    const span6 = page.locator('.widget.span-6', {
      has: page.getByRole('heading', { name: 'Roll Flow', level: 2 }),
    })

    await expect(span2).toBeVisible()
    await expect(span4).toBeVisible()
    await expect(span6).toBeVisible()
  })
})