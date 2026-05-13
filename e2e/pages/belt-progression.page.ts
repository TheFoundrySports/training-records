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
    const isExpanded = (await header.getAttribute('aria-expanded')) === 'false'
    if (isExpanded) {
      await header.click()
      await this.page.waitForTimeout(300) // wait for CSS transition
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
   * Check a checkbox by index.
   */
  async checkCheckbox(index: number) {
    await this.checkboxes.nth(index).check()
  }

  /**
   * Uncheck a checkbox by index.
   */
  async uncheckCheckbox(index: number) {
    await this.checkboxes.nth(index).uncheck()
  }
}