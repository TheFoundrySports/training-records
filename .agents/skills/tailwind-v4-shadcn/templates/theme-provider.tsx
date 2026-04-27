import { useEffect, useState, type ReactNode } from 'react'
import { ThemeProviderContext, type Theme, type ThemeProviderState } from './theme-context'

type ThemeProviderProps = {
  children: ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'vite-ui-theme',
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    // Try localStorage first, fall back to sessionStorage, then default
    try {
      return (localStorage.getItem(storageKey) as Theme) ||
             (sessionStorage.getItem(storageKey) as Theme) ||
             defaultTheme
    } catch {
      // Storage unavailable (incognito/privacy mode) - use default
      return defaultTheme
    }
  })

  useEffect(() => {
    const root = window.document.documentElement

    root.classList.remove('light', 'dark')

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
        .matches
        ? 'dark'
        : 'light'

      root.classList.add(systemTheme)
      return
    }

    root.classList.add(theme)
  }, [theme])

  const value: ThemeProviderState = {
    theme,
    setTheme: (theme: Theme) => {
      // Try to persist to localStorage, fall back to sessionStorage
      try {
        localStorage.setItem(storageKey, theme)
      } catch {
        // localStorage unavailable (incognito) - use sessionStorage
        try {
          sessionStorage.setItem(storageKey, theme)
        } catch {
          // Both unavailable - just update state without persistence
          console.warn('Storage unavailable, theme preference will not persist')
        }
      }
      setTheme(theme)
    },
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}
