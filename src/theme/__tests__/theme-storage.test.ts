import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  THEME_STORAGE_KEY,
  readStoredThemePreference,
  resolveTheme,
} from '../theme-storage'

describe('theme-storage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('resolveTheme returns explicit light and dark preferences', () => {
    expect(resolveTheme('light')).toBe('light')
    expect(resolveTheme('dark')).toBe('dark')
  })

  it('resolveTheme follows system preference when set to system', () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query === '(prefers-color-scheme: dark)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })

    expect(resolveTheme('system')).toBe('dark')
  })

  it('reads stored theme preference from localStorage', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark')
    expect(readStoredThemePreference()).toBe('dark')
  })
})
