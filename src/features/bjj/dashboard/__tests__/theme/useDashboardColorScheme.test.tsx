/**
 * Tests for `useDashboardColorScheme` via the unified ThemeProvider.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { ReactNode } from 'react'
import { ThemeProvider, useTheme } from '@/theme/ThemeContext'
import { useDashboardColorScheme } from '@/theme/useDashboardColorScheme'

const wrapper = ({ children }: { children: ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
)

describe('useDashboardColorScheme', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('dark')
  })

  it('returns light when theme preference is light', () => {
    const { result } = renderHook(
      () => ({
        theme: useTheme(),
        scheme: useDashboardColorScheme(),
      }),
      { wrapper },
    )

    act(() => {
      result.current.theme.setPreference('light')
    })

    expect(result.current.scheme).toBe('light')
  })

  it('returns dark when theme preference is dark', () => {
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
