import { test, expect } from './fixtures/pages.fixture'

/**
 * Belt Progression E2E tests — 6 scenarios.
 * Run authenticated via .auth/athlete.json (setup by auth.setup.ts).
 *
 * Prerequisites:
 *   supabase db reset && bash scripts/seed-users.sh
 */

test.describe.configure({ mode: 'serial' })

test.describe('BJJ Blue Belt Progression', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/bjj/blue-belt-progression')
    await page.waitForLoadState('networkidle')
  })

  test('displays all 5 sections on page load', async ({ page }) => {
    // Section 1: Pilares del JiuJitsu (informational)
    await expect(page.getByText('1. Pilares del JiuJitsu')).toBeVisible()
    // Section 2: Técnicas Requeridas
    await expect(page.getByText('2. Técnicas Requeridas')).toBeVisible()
    // Section 3: Sparring Skills
    await expect(page.getByText('3. Sparring Skills')).toBeVisible()
    // Section 4: Requisitos Adicionales
    await expect(page.getByText('4. Requisitos Adicionales')).toBeVisible()
    // Section 5: Bonus
    await expect(page.getByText('5. Bonus')).toBeVisible()
  })

  test('check item persists across refresh', async ({ page }) => {
    // Find the first checkbox in the Técnicas section (skip informational Pilares)
    const sectionHeader = page.getByRole('button', { name: /2\. Técnicas/i })
    // Expand section if collapsed
    const isExpanded = await sectionHeader.getAttribute('aria-expanded')
    if (isExpanded === 'false') {
      await sectionHeader.click()
      await page.waitForTimeout(300) // wait for animation
    }

    // Find first checkbox in techniques section
    const firstCheckbox = page.locator('input[type="checkbox"]').first()
    await firstCheckbox.check()
    await expect(firstCheckbox).toBeChecked()

    // Refresh and verify persistence
    await page.reload()
    await page.waitForLoadState('networkidle')
    await expect(firstCheckbox).toBeChecked()
  })

  test('collapse section persists across refresh', async ({ page }) => {
    // Section 2 header (Técnicas) starts expanded or collapsed based on DB state
    const sectionHeader = page.getByRole('button', { name: /2\. Técnicas/i })

    // Collapse section
    const wasExpanded = (await sectionHeader.getAttribute('aria-expanded')) === 'true'
    if (wasExpanded) {
      await sectionHeader.click()
      await page.waitForTimeout(300)
    }

    // Verify collapsed
    await expect(sectionHeader).toHaveAttribute('aria-expanded', 'false')

    // Refresh and verify collapse persists
    await page.reload()
    await page.waitForLoadState('networkidle')
    await expect(sectionHeader).toHaveAttribute('aria-expanded', 'false')
  })

  test('progress calculation — 0 items checked = 0%', async ({ page }) => {
    const progressBar = page.locator('[role="progressbar"]').first()
    await expect(progressBar).toHaveAttribute('aria-valuenow', '0')
  })

  test('check 22 items → progress = 49%', async ({ page }) => {
    // Expand all sections first (they may be collapsed on first visit)
    const sectionHeaders = page.getByRole('button', { name: /^[1-5]\./ })
    for (const header of await sectionHeaders.all()) {
      const isExpanded = (await header.getAttribute('aria-expanded')) === 'false'
      if (isExpanded) {
        await header.click()
        await page.waitForTimeout(200)
      }
    }
    await page.waitForTimeout(500) // wait for all animations

    // Check 22 items (skip section 1 which is informational)
    const checkboxes = page.locator('input[type="checkbox"]')
    const count = await checkboxes.count()
    expect(count).toBeGreaterThanOrEqual(22)

    for (let i = 0; i < 22; i++) {
      await checkboxes.nth(i).check()
    }

    // Verify 49% global progress (22/45 = 0.4888 → 49%)
    const globalProgressBar = page.locator('[role="progressbar"]').first()
    await expect(globalProgressBar).toHaveAttribute('aria-valuenow', '49')
  })

  test('reset with confirmation — confirm clears all progress', async ({ page }) => {
    // Check some items first
    const checkboxes = page.locator('input[type="checkbox"]')
    await checkboxes.first().check()

    // Open reset dialog
    await page.getByRole('button', { name: /reiniciar/i }).click()
    await expect(page.getByRole('dialog')).toBeVisible()

    // Confirm reset
    await page.getByRole('button', { name: /confirmar/i }).click()

    // Verify progress is 0%
    const globalProgressBar = page.locator('[role="progressbar"]').first()
    await expect(globalProgressBar).toHaveAttribute('aria-valuenow', '0')

    // Verify no checkboxes are checked
    const checkedCount = await page.locator('input[type="checkbox"]:checked').count()
    expect(checkedCount).toBe(0)
  })

  test('reset with confirmation — cancel leaves state unchanged', async ({ page }) => {
    // Check some items
    const firstCheckbox = page.locator('input[type="checkbox"]').first()
    await firstCheckbox.check()
    await expect(firstCheckbox).toBeChecked()

    // Open reset dialog
    await page.getByRole('button', { name: /reiniciar/i }).click()
    await expect(page.getByRole('dialog')).toBeVisible()

    // Cancel
    await page.getByRole('button', { name: /cancelar/i }).click()

    // Verify dialog closed and checkbox still checked
    await expect(page.getByRole('dialog')).not.toBeVisible()
    await expect(firstCheckbox).toBeChecked()
  })
})