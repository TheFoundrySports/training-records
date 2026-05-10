import { type Page, type Locator, expect } from '@playwright/test'

export class CalendarPage {
  readonly page: Page
  readonly monthTitle: Locator
  readonly prevButton: Locator
  readonly nextButton: Locator
  readonly todayButton: Locator

  constructor(page: Page) {
    this.page = page
    // CalendarHeader renders an h2 with text like "May 2026" or "13 Apr – 13 May 2026"
    this.monthTitle = page.locator('h2').filter({ hasText: /\d{4}/ }).first()
    this.prevButton = page.locator('button[aria-label="Previous"]')
    this.nextButton = page.locator('button[aria-label="Next"]')
    this.todayButton = page.getByRole('button', { name: /today/i })
  }

  async goto() {
    await this.page.goto('/calendar')
    await expect(this.monthTitle).toBeVisible()
  }

  async clickPrevMonth() {
    await this.prevButton.click()
  }

  async clickNextMonth() {
    await this.nextButton.click()
  }

  async clickToday() {
    await this.todayButton.click()
  }

  /**
   * All day cells in the calendar grid.
   * CalendarGrid uses div.grid (not a list), so we locate the grid by its
   * grid-cols-7 class and get its direct child divs (the CalendarCell components).
   */
  get dayCells(): Locator {
    return this.page.locator('.grid.grid-cols-7 > div')
  }

  /**
   * Locator for a specific day cell by its date number (1-31).
   * The day number is in a span inside each cell.
   */
  dayCell(date: number): Locator {
    return this.page.locator('.grid.grid-cols-7 > div', { has: this.page.getByText(String(date), { exact: true }) })
  }

  /**
   * Locator for a workout chip with specific title.
   */
  workoutChip(workoutTitle: string): Locator {
    // The chip button has aria-label="View workout: {fullTitle}" with the full title
    return this.page.locator(`button[aria-label="View workout: ${workoutTitle}"]`)
  }

  /**
   * Click an empty day cell (no workout).
   */
  async clickEmptyDay(date: number) {
    await this.dayCell(date).click()
  }

  /**
   * Click a day cell that contains a workout chip.
   */
  async clickDayWithWorkout(date: number, workoutTitle: string) {
    const chip = this.workoutChip(workoutTitle)
    await chip.click()
  }

  /**
   * Click an empty day cell (no workout) — navigates to /workouts/new?date=YYYY-MM-DD
   * The cell has aria-label="Add workout on {date}"
   */
  async clickEmptyDayByLabel(date: Date) {
    const label = `Add workout on ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    const cell = this.page.locator(`[aria-label="${label}"]`)
    await cell.click()
  }
}