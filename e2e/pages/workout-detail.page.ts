import { type Page, type Locator, expect } from '@playwright/test'

export class WorkoutDetailPage {
  readonly page: Page
  readonly editButton: Locator
  readonly deleteButton: Locator
  readonly confirmDeleteButton: Locator
  readonly deleteConfirmDialog: Locator

  constructor(page: Page) {
    this.page = page
    this.editButton = page.getByRole('button', { name: /edit/i })
    this.deleteButton = page.getByRole('button', { name: /delete/i }).first()
    this.deleteConfirmDialog = page.getByText(/are you sure you want to delete/i)
    this.confirmDeleteButton = page.getByRole('button', { name: /^delete$/i }).last()
  }

  async clickEdit() {
    await this.editButton.click()
  }

  async deleteWorkout() {
    await this.deleteButton.click()
    await expect(this.deleteConfirmDialog).toBeVisible()
    await this.confirmDeleteButton.click()
    await expect(this.page).toHaveURL('/workouts')
  }

  async expectTitle(title: string) {
    await expect(this.page.getByText(title)).toBeVisible()
  }
}
