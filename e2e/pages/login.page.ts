import { type Page, type Locator, expect } from '@playwright/test'

export class LoginPage {
  readonly page: Page
  readonly emailInput: Locator
  readonly passwordInput: Locator
  readonly submitButton: Locator
  readonly errorAlert: Locator

  constructor(page: Page) {
    this.page = page
    this.emailInput = page.getByLabel('Email')
    this.passwordInput = page.getByLabel('Password')
    this.submitButton = page.getByRole('button', { name: /sign in/i })
    this.errorAlert = page.getByRole('alert')
  }

  async goto() {
    await this.page.goto('/login')
    await expect(this.submitButton).toBeVisible()
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email)
    await this.passwordInput.fill(password)
    await this.submitButton.click()
  }

  async loginAndWait(email: string, password: string) {
    await this.login(email, password)
    await expect(this.page).toHaveURL('/workouts')
  }

  async expectError(message: string | RegExp) {
    await expect(this.errorAlert).toContainText(message)
  }
}
