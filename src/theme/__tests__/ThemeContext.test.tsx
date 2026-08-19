import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { ReactNode } from 'react'
import { ThemeProvider, useTheme } from '../ThemeContext'
import { THEME_STORAGE_KEY } from '../theme-storage'
import { useDashboardColorScheme } from '../useDashboardColorScheme'

const wrapper = ({ children }: { children: ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
)

describe('ThemeProvider', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('dark')
    document.documentElement.style.colorScheme = ''
  })

  it('defaults to system preference when no stored theme exists', () => {
    const { result } = renderHook(() => useTheme(), { wrapper })
    expect(['light', 'dark']).toContain(result.current.resolved)
    expect(result.current.preference).toBe('system')
  })

  it('toggleTheme switches between light and dark and persists preference', () => {
    const { result } = renderHook(() => useTheme(), { wrapper })

    act(() => {
      result.current.setPreference('light')
    })
    expect(result.current.resolved).toBe('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)

    act(() => {
      result.current.toggleTheme()
    })
    expect(result.current.resolved).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
  })

  it('useDashboardColorScheme mirrors resolved theme from ThemeProvider', () => {
    const { result } = renderHook(
      () => ({
        theme: useTheme(),
        scheme: useDashboardColorScheme(),
      }),
      { wrapper },
    )

    act(() => {
      result.current.theme.setPreference('dark')
    })

    expect(result.current.scheme).toBe('dark')
  })
})
