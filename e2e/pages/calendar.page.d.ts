import { type Page, type Locator } from '@playwright/test';
export declare class CalendarPage {
    readonly page: Page;
    readonly monthTitle: Locator;
    readonly prevButton: Locator;
    readonly nextButton: Locator;
    readonly todayButton: Locator;
    constructor(page: Page);
    goto(): Promise<void>;
    clickPrevMonth(): Promise<void>;
    clickNextMonth(): Promise<void>;
    clickToday(): Promise<void>;
    /**
     * All day cells in the calendar grid.
     * CalendarGrid uses div.grid (not a list), so we locate the grid by its
     * grid-cols-7 class and get its direct child divs (the CalendarCell components).
     */
    get dayCells(): Locator;
    /**
     * Locator for a specific day cell by its date number (1-31).
     * The day number is in a span inside each cell.
     */
    dayCell(date: number): Locator;
    /**
     * Locator for a workout chip with specific title.
     */
    workoutChip(workoutTitle: string): Locator;
    /**
     * Click an empty day cell (no workout).
     */
    clickEmptyDay(date: number): Promise<void>;
    /**
     * Click a day cell that contains a workout chip.
     */
    clickDayWithWorkout(date: number, workoutTitle: string): Promise<void>;
    /**
     * Click an empty day cell (no workout) — navigates to /workouts/new?date=YYYY-MM-DD
     * The cell has aria-label="Add workout on {date}"
     */
    clickEmptyDayByLabel(date: Date): Promise<void>;
}
