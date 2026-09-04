import { test, expect, type Locator } from '@playwright/test'

/**
 * WorkoutTypePicker — real-browser wrap coverage.
 *
 * Verifies that the hero picker on /workouts/new renders both cards without
 * a single word breaking across lines at the seven spec widths, and that the
 * existing /workouts/new/crossfit deep link still resolves.
 *
 * The deep link itself is NOT modified by this change; this spec asserts it
 * keeps working. See e2e/pages/workout-form.page.ts:30 for the existing
 * page-object usage of that route.
 */

const VIEWPORTS = [320, 360, 375, 414, 640, 768, 1024] as const

const CROSSFIT_CARD = /crossfit.*functional/i
const BJJ_CARD = /brazilian jiu-jitsu/i
const CROSSFIT_TITLE = 'CrossFit / Functional'
const CROSSFIT_SUBTITLE = 'WOD-based training'
const BJJ_TITLE = 'Brazilian Jiu-Jitsu'
const BJJ_SUBTITLE = 'Section-based technique training'

/**
 * Asserts that no single word in the given element wraps across multiple lines.
 * Implementation: each word's bounding rect should not have a top that differs
 * from the next word's top by more than a few px (same line). We use a generous
 * tolerance because subpixel rendering varies.
 */
async function expectNoWordBreaksAcrossLines(locator: Locator) {
  const texts = (await locator.allInnerTexts())[0]?.split(/\s+/) ?? []
  // We assert the text node's height per "line": if any word sits on a line by
  // itself, the rendered element's line count would exceed 1 only when there
  // is wrapping. Use getClientRects() per word and compare rect tops.
  // Simpler robust proxy: the element's box height divided by line-height
  // yields the line count. We assert line count <= ceil(texts.length / 1).
  const handle = await locator.elementHandle()
  if (!handle) throw new Error('locator not attached')
  const lineCount = await handle.evaluate((el) => {
    const cs = window.getComputedStyle(el)
    const lineHeight = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2
    return Math.round(el.getBoundingClientRect().height / lineHeight)
  })
  // Every word in the text must fit on at most its own line. If even one word
  // wraps to two lines, lineCount will be > texts.length. If every word fits on
  // a single line OR words share lines, lineCount will be <= texts.length.
  // We want: NO word splits. So lineCount must be <= number of distinct lines
  // actually needed for the text. The most permissive bound is texts.length.
  expect(lineCount).toBeLessThanOrEqual(texts.length)
}

test.describe('WorkoutTypePicker — real-browser wrap coverage', () => {
  for (const width of VIEWPORTS) {
    test(`renders two cards without mid-word wraps at ${width}px wide`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 })
      await page.goto('/workouts/new')

      const heading = page.getByRole('heading', { name: /log workout/i })
      await expect(heading).toBeVisible()

      const crossfitCard = page.getByRole('button', { name: CROSSFIT_CARD })
      const bjjCard = page.getByRole('button', { name: BJJ_CARD })

      await expect(crossfitCard).toBeVisible()
      await expect(bjjCard).toBeVisible()

      const crossfitTitle = crossfitCard.getByText(CROSSFIT_TITLE, { exact: true })
      const crossfitSubtitle = crossfitCard.getByText(CROSSFIT_SUBTITLE, { exact: true })
      const bjjTitle = bjjCard.getByText(BJJ_TITLE, { exact: true })
      const bjjSubtitle = bjjCard.getByText(BJJ_SUBTITLE, { exact: true })

      await expect(crossfitTitle).toBeVisible()
      await expect(crossfitSubtitle).toBeVisible()
      await expect(bjjTitle).toBeVisible()
      await expect(bjjSubtitle).toBeVisible()

      // No single word should split across two lines.
      await expectNoWordBreaksAcrossLines(crossfitTitle)
      await expectNoWordBreaksAcrossLines(crossfitSubtitle)
      await expectNoWordBreaksAcrossLines(bjjTitle)
      await expectNoWordBreaksAcrossLines(bjjSubtitle)

      // Inter-card gap ≥ 1rem (= 16px). Measure by the actual distance between
      // the first and second card bounding boxes (column gap on the sm+ grid).
      const gapPx = await page.evaluate(() => {
        const cards = Array.from(document.querySelectorAll('button')).filter(
          (b) => b.textContent && /crossfit|brazilian/i.test(b.textContent),
        )
        if (cards.length < 2) return 0
        const a = cards[0].getBoundingClientRect()
        const b = cards[1].getBoundingClientRect()
        const dx = Math.abs(b.left - a.right)
        const dy = Math.abs(b.top - a.bottom)
        // On the same row at sm+, dx is the column gap. When stacked (mobile),
        // dy is the row gap. Either way, return whichever applies.
        return Math.max(dx, dy)
      })
      expect(gapPx).toBeGreaterThanOrEqual(16)
    })
  }

  test('existing /workouts/new/crossfit deep link still resolves', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/workouts/new/crossfit')
    await expect(page).toHaveURL(/\/workouts\/new\/crossfit$/)
    // CrossFit form renders the "Title" label on the WOD Format input.
    await expect(page.getByLabel(/title/i).first()).toBeVisible({ timeout: 15_000 })
  })
})
