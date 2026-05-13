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
   * Toggle a checkbox by dispatching change event directly on the input.
   * Works around collapsible animations that block normal Playwright clicks.
   */
  async toggleCheckboxByLabel(labelText: string) {
    await this.page.evaluate((text) => {
      const labels = Array.from(document.querySelectorAll('label'))
      const label = labels.find((l) => l.textContent?.trim() === text)
      if (!label) {
        throw new Error(`Label not found: ${text}`)
      }
      const inputId = label.getAttribute('for')
      if (!inputId) {
        throw new Error(`Label has no 'for' attribute: ${text}`)
      }
      const input = document.getElementById(inputId) as HTMLInputElement
      if (!input) {
        throw new Error(`Input not found for id: ${inputId}`)
      }
      // Toggle the checkbox and dispatch both change and click events
      input.checked = !input.checked
      input.dispatchEvent(new Event('change', { bubbles: true }))
      input.dispatchEvent(new Event('click', { bubbles: true }))
    }, labelText)
  }
}