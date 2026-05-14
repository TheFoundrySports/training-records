import { type Page, type Locator } from '@playwright/test'

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
   * Toggle a checkbox by clicking its label.
   * The label triggers the hidden checkbox via htmlFor/id association.
   */
  async toggleCheckboxByTestId(itemId: string) {
    const label = this.page.locator(`label[for="${itemId}"]`)
    await label.waitFor({ state: 'visible', timeout: 5000 })
    await label.click()
    await this.page.waitForTimeout(500) // Wait for React state + Supabase mutation
  }
}