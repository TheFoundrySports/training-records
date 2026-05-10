import { type Page, type Locator, expect } from '@playwright/test'

export class WorkoutFormPage {
  readonly page: Page
  readonly titleInput: Locator
  readonly dateInput: Locator
  readonly durationInput: Locator
  readonly notesInput: Locator
  readonly wodFormatSelect: Locator
  readonly saveButton: Locator
  readonly cancelButton: Locator
  readonly loadWorkoutButton: Locator
  readonly rootError: Locator

  constructor(page: Page) {
    this.page = page
    this.titleInput = page.getByLabel('Title')
    this.dateInput = page.getByLabel(/date/i)
    this.durationInput = page.getByLabel(/duration/i)
    this.notesInput = page.getByLabel('Notes')
    this.wodFormatSelect = page.getByLabel('Workout type')
    this.saveButton = page.getByText('Save')
    this.cancelButton = page.getByRole('button', { name: /cancel/i })
    this.loadWorkoutButton = page.getByRole('button', { name: /load workout/i })
    this.rootError = page.getByRole('alert')
  }

  async gotoNew() {
    // /workouts/new shows WorkoutTypePicker; the actual CrossFit form is at /workouts/new/crossfit
    await this.page.goto('/workouts/new/crossfit')
    await this.page.waitForLoadState('domcontentloaded')
    await expect(this.saveButton).toBeVisible({ timeout: 15000 })
  }

  async fillTitle(title: string) {
    await this.titleInput.fill(title)
  }

  async fillDate(datetime: string) {
    await this.dateInput.fill(datetime)
  }

  async fillDuration(minutes: number) {
    await this.durationInput.fill('')
    await this.durationInput.fill(String(minutes))
  }

  async selectWodFormat(format: 'for_time' | 'amrap' | 'emom') {
    // The WodFormatSelector renders buttons/tabs, not a native select
    await this.page.getByRole('button', { name: new RegExp(format.replace('_', ' '), 'i') }).click()
  }

  async save() {
    await this.saveButton.click()
  }

  async saveAndExpectSuccess() {
    await this.saveButton.click()
    await expect(this.page).toHaveURL('/workouts')
  }

  async openLoadWorkoutModal() {
    await this.loadWorkoutButton.click()
    // Wait for modal to appear
    await expect(this.page.getByRole('dialog')).toBeVisible()
    return new PublicWodPickerModal(this.page)
  }

  async expectNoRootError() {
    await expect(this.rootError).not.toBeVisible()
  }

  async expectRootError(message: string | RegExp) {
    await expect(this.rootError).toContainText(message)
  }
}

export class PublicWodPickerModal {
  readonly page: Page
  readonly dialog: Locator
  readonly searchInput: Locator

  constructor(page: Page) {
    this.page = page
    this.dialog = page.getByRole('dialog')
    this.searchInput = this.dialog.getByPlaceholder('Search workouts...')
  }

  async search(query: string) {
    await this.searchInput.fill(query)
    // Debounce in the component is 300ms
    await this.page.waitForTimeout(400)
  }

  async selectWod(title: string) {
    await this.dialog.getByRole('button', { name: new RegExp(title, 'i') }).click()
    // Modal closes after selection
    await expect(this.dialog).not.toBeVisible()
  }
}
