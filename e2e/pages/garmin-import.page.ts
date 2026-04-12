import { type Page, type Locator, expect } from '@playwright/test'

export class GarminImportPage {
  readonly page: Page
  readonly importButton: Locator
  readonly reImportButton: Locator
  readonly fileInput: Locator
  readonly importActionButton: Locator
  readonly metricsPanel: Locator
  readonly evaluationCard: Locator
  readonly evaluationSkeleton: Locator
  readonly replaceWarning: Locator

  constructor(page: Page) {
    this.page = page
    this.importButton = page.getByRole('button', { name: /import garmin data/i })
    this.reImportButton = page.getByRole('button', { name: /re-import garmin data/i })
    this.fileInput = page.locator('#fit-file')
    this.importActionButton = page.getByRole('button', { name: /^import$/i })
    this.metricsPanel = page.getByText('Garmin Metrics')
    this.evaluationCard = page.getByText('AI Training Evaluation')
    this.evaluationSkeleton = page.getByLabel('Loading evaluation')
    this.replaceWarning = page.getByText(/this will replace your existing garmin data/i)
  }

  async clickImport() {
    await this.importButton.click()
  }

  async clickReImport() {
    await this.reImportButton.click()
  }

  async uploadFitFile(filePath: string) {
    await this.fileInput.setInputFiles(filePath)
  }

  async confirmImport() {
    await this.importActionButton.click()
  }

  async expectMetricsPanelVisible() {
    await expect(this.metricsPanel).toBeVisible({ timeout: 15_000 })
  }

  async expectEvaluationCardVisible() {
    await expect(this.evaluationCard).toBeVisible({ timeout: 15_000 })
  }

  async expectReplaceWarningVisible() {
    await expect(this.replaceWarning).toBeVisible()
  }
}
