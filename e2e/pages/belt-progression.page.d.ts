import { type Page, type Locator } from '@playwright/test';
export declare class BeltProgressionPage {
    readonly page: Page;
    constructor(page: Page);
    goto(): Promise<void>;
    /**
     * Get the section header button by section name pattern.
     */
    sectionHeader(namePattern: string | RegExp): Locator;
    /**
     * All checkboxes in the progression page.
     */
    get checkboxes(): Locator;
    /**
     * Global progress bar (first one on page).
     */
    get globalProgressBar(): Locator;
    /**
     * Reset button.
     */
    get resetButton(): Locator;
    /**
     * Expand a section by clicking its header.
     */
    expandSection(namePattern: string | RegExp): Promise<void>;
    /**
     * Collapse a section by clicking its header.
     */
    collapseSection(namePattern: string | RegExp): Promise<void>;
    /**
     * Check a checkbox by index.
     */
    checkCheckbox(index: number): Promise<void>;
    /**
     * Uncheck a checkbox by index.
     */
    uncheckCheckbox(index: number): Promise<void>;
}
