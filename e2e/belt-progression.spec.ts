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

  test('check item persists across refresh', async ({ page, beltProgressionPage }) => {
    // Expand the Técnicas section
    await beltProgressionPage.expandSection(/2\. Técnicas/i)

    // Toggle checkbox via data-testid
    await beltProgressionPage.toggleCheckboxByTestId('tecnicas-comienzo-0')
    await page.waitForTimeout(100) // Wait for React state update
    
    // Verify checkbox is checked
    const firstCheckbox = page.locator('input#tecnicas-comienzo-0')
    await expect(firstCheckbox).toBeChecked()

    // Refresh and verify persistence
    await page.reload()
    await page.waitForLoadState('networkidle')
    
    // Re-expand section after reload (sections default to collapsed)
    await beltProgressionPage.expandSection(/2\. Técnicas/i)
    
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
    // Reset progress first to ensure clean state
    await page.getByRole('button', { name: /reiniciar/i }).click()
    await page.getByRole('button', { name: /confirmar/i }).click()
    await page.waitForTimeout(200)

    const progressBar = page.locator('[role="progressbar"]').first()
    await expect(progressBar).toHaveAttribute('aria-valuenow', '0')
  })

  test('check 22 items → progress = 51%', async ({ page, beltProgressionPage }) => {
    // Expand Section 2 (Técnicas Requeridas)
    await beltProgressionPage.expandSection(/2\. Técnicas/i)

    // Check first 22 items via data-testid (4+5+8+5 from Section 2)
    const itemIds = [
      // 2.1 Comienzo (4)
      'tecnicas-comienzo-0', 'tecnicas-comienzo-1', 'tecnicas-comienzo-2', 'tecnicas-comienzo-3',
      // 2.2 Pasados (5)
      'tecnicas-pasados-0', 'tecnicas-pasados-1', 'tecnicas-pasados-2', 'tecnicas-pasados-3', 'tecnicas-pasados-4',
      // 2.3 Guardia (8)
      'tecnicas-guardia-0', 'tecnicas-guardia-1', 'tecnicas-guardia-2', 'tecnicas-guardia-3',
      'tecnicas-guardia-4', 'tecnicas-guardia-5', 'tecnicas-guardia-6', 'tecnicas-guardia-7',
      // 2.4 Sumisiones (5 of 7)
      'tecnicas-sumisiones-0', 'tecnicas-sumisiones-1', 'tecnicas-sumisiones-2', 'tecnicas-sumisiones-3', 'tecnicas-sumisiones-4',
    ]

    for (const id of itemIds) {
      await beltProgressionPage.toggleCheckboxByTestId(id)
    }
    
    await page.waitForTimeout(200) // Wait for all optimistic updates

    // Verify 51% global progress (22/43 = 0.5116 → 51%)
    const globalProgressBar = page.locator('[role="progressbar"]').first()
    await expect(globalProgressBar).toHaveAttribute('aria-valuenow', '51')
  })

  test('reset with confirmation — confirm clears all progress', async ({ page, beltProgressionPage }) => {
    // Expand Section 2 and check some items first
    await beltProgressionPage.expandSection(/2\. Técnicas/i)
    await beltProgressionPage.toggleCheckboxByTestId('tecnicas-comienzo-0')
    await page.waitForTimeout(100)

    // Open reset dialog
    await page.getByRole('button', { name: /reiniciar/i }).click()
    await expect(page.getByRole('dialog')).toBeVisible()

    // Confirm reset
    await page.getByRole('button', { name: /confirmar/i }).click()
    await page.waitForTimeout(200) // Wait for reset mutation

    // Verify progress is 0%
    const globalProgressBar = page.locator('[role="progressbar"]').first()
    await expect(globalProgressBar).toHaveAttribute('aria-valuenow', '0')

    // Verify first checkbox is unchecked
    const firstCheckbox = page.locator('input#tecnicas-comienzo-0')
    await expect(firstCheckbox).not.toBeChecked()
  })

  test('reset with confirmation — cancel leaves state unchanged', async ({ page, beltProgressionPage }) => {
    // Expand Section 2 and check some items
    await beltProgressionPage.expandSection(/2\. Técnicas/i)
    await beltProgressionPage.toggleCheckboxByTestId('tecnicas-comienzo-0')
    await page.waitForTimeout(100)

    // Verify checkbox is checked
    const firstCheckbox = page.locator('input#tecnicas-comienzo-0')
    await expect(firstCheckbox).toBeChecked()

    // Open reset dialog
    await page.getByRole('button', { name: /reiniciar/i }).click()
    await expect(page.getByRole('dialog')).toBeVisible()

    // Cancel reset
    await page.getByRole('button', { name: /cancelar/i }).click()

    // Verify dialog is closed
    await expect(page.getByRole('dialog')).not.toBeVisible()

    // Verify checkbox is still checked
    await expect(firstCheckbox).toBeChecked()
  })
})