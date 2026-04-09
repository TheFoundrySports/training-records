import { type Page, type Locator, expect } from '@playwright/test'

export class WorkoutsPage {
  readonly page: Page
  readonly heading: Locator
  readonly logWorkoutButton: Locator
  readonly workoutLinks: Locator

  constructor(page: Page) {
    this.page = page
    this.heading = page.getByRole('heading', { name: /workouts/i })
    this.logWorkoutButton = page.getByRole('button', { name: /log workout/i }).first()
    this.workoutLinks = page.getByRole('link').filter({ hasNot: page.getByRole('button') })
  }

  async goto() {
    await this.page.goto('/workouts')
    await expect(this.heading).toBeVisible()
  }

  async clickLogWorkout() {
    await this.logWorkoutButton.click()
    await expect(this.page).toHaveURL('/workouts/new')
  }

  async expectWorkoutVisible(title: string) {
    await expect(this.page.getByText(title)).toBeVisible()
  }

  async expectWorkoutNotVisible(title: string) {
    await expect(this.page.getByText(title)).not.toBeVisible()
  }

  async openWorkoutByTitle(title: string) {
    await this.page.getByText(title).click()
  }

  async openFirstWorkout() {
    // Use the workout list aria-label to scope the locator, avoiding nav links
    const firstLink = this.page
      .getByRole('list', { name: /workout list/i })
      .getByRole('link')
      .first()
    const href = await firstLink.getAttribute('href')
    await firstLink.click()
    return href ?? ''
  }
}
