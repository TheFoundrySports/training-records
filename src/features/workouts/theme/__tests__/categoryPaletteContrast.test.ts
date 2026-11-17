import { describe, it, expect } from 'vitest'
import { palettes } from '../material-tokens'

/** WCAG 2.x relative luminance. */
function relativeLuminance(hex: string): number {
  const value = hex.replace('#', '')
  const channels = [0, 2, 4].map((offset) => parseInt(value.slice(offset, offset + 2), 16) / 255)
  const [r, g, b] = channels.map((channel) =>
    channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  )
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrastRatio(foreground: string, background: string): number {
  const foregroundLuminance = relativeLuminance(foreground)
  const backgroundLuminance = relativeLuminance(background)
  const lighter = Math.max(foregroundLuminance, backgroundLuminance)
  const darker = Math.min(foregroundLuminance, backgroundLuminance)
  return (lighter + 0.05) / (darker + 0.05)
}

const CATEGORIES = ['crossfit', 'functional', 'bjj'] as const
const MODES = ['light', 'dark'] as const

describe('workout category palette contrast', () => {
  for (const mode of MODES) {
    for (const category of CATEGORIES) {
      it(`${mode} ${category} label clears WCAG AA on its fill`, () => {
        const entry = palettes[mode][category]
        expect(contrastRatio(entry.main, entry.light)).toBeGreaterThanOrEqual(4.5)
      })

      it(`${mode} ${category} hover label clears WCAG AA on its hover fill`, () => {
        const entry = palettes[mode][category]
        expect(contrastRatio('#ffffff', entry.dark)).toBeGreaterThanOrEqual(4.5)
      })
    }
  }
})
