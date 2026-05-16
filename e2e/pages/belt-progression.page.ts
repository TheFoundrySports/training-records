import { type Page, type Locator, expect } from '@playwright/test'

export class BeltProgressionPage {
  readonly page: Page

  constructor(page: Page) {
    this.page = page
  }

  async goto() {
    await this.page.goto('/bjj/blue-belt-progression')
    await this.page.waitForLoadState('networkidle')
  }

  /**
   * Get the section header button by section name pattern.
   */
  sectionHeader(namePattern: string | RegExp): Locator {
    return this.page.getByRole('button', { name: namePattern })
  }

  /**
   * All checkboxes in the progression page.
   */
  get checkboxes(): Locator {
    return this.page.locator('input[type="checkbox"]')
  }

  /**
   * Global progress bar (first one on page).
   */
  get globalProgressBar(): Locator {
    return this.page.locator('[role="progressbar"]').first()
  }

  /**
   * Reset button.
   */
  get resetButton(): Locator {
    return this.page.getByRole('button', { name: /reiniciar/i })
  }

  /**
   * Expand a section by clicking its header.
   */
  async expandSection(namePattern: string | RegExp) {
    const header = this.sectionHeader(namePattern)
    const isExpanded = (await header.getAttribute('aria-expanded')) === 'true'
    if (!isExpanded) {
      await header.click()
      await this.page.waitForTimeout(500) // wait for CSS transition
    }
  }

  /**
   * Collapse a section by clicking its header.
   */
  async collapseSection(namePattern: string | RegExp) {
    const header = this.sectionHeader(namePattern)
    const isExpanded = (await header.getAttribute('aria-expanded')) === 'true'
    if (isExpanded) {
      await header.click()
      await this.page.waitForTimeout(300)
    }
  }

  /**
   * Toggle a checkbox by keyboard interaction (focus + Space).
   * Waits for state change and Supabase mutation to complete.
   *
   * @param itemId - The checkbox item ID (e.g., 'tecnicas-comienzo-0')
   */
  async toggleCheckboxByTestId(itemId: string): Promise<void> {
    const checkbox = this.page.locator(`input#${itemId}`)

    // Capture initial state before toggling
    const wasChecked = await checkbox.isChecked()

    // Focus and press Space (keyboard method, reliable for sr-only inputs)
    await checkbox.focus()
    await this.page.keyboard.press('Space')

    // Wait for Supabase mutation to complete
    await this.page.waitForTimeout(1000)

    // Verify checkbox state after mutation completes
    if (wasChecked) {
      await expect(checkbox).not.toBeChecked({ timeout: 5000 })
    } else {
      await expect(checkbox).toBeChecked({ timeout: 5000 })
    }
  }
}
