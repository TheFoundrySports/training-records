import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  applyThemeToDocument,
  persistThemePreference,
  readStoredThemePreference,
  readSystemTheme,
  resolveTheme,
  type ResolvedTheme,
  type ThemePreference,
} from './theme-storage'

interface ThemeContextValue {
  preference: ThemePreference
  resolved: ResolvedTheme
  setPreference: (preference: ThemePreference) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

const readInitialPreference = (): ThemePreference => readStoredThemePreference() ?? 'system'

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [preference, setPreferenceState] = useState<ThemePreference>(readInitialPreference)
  const [resolved, setResolved] = useState<ResolvedTheme>(() => resolveTheme(readInitialPreference()))

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next)
    persistThemePreference(next)
    setResolved(resolveTheme(next))
  }, [])

  const toggleTheme = useCallback(() => {
    setPreference(resolved === 'dark' ? 'light' : 'dark')
  }, [resolved, setPreference])

  useEffect(() => {
    applyThemeToDocument(resolved)
  }, [resolved])

  useEffect(() => {
    if (preference !== 'system') {
      return
    }

    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return
    }

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      setResolved(readSystemTheme())
    }

    handleChange()
    media.addEventListener('change', handleChange)
    return () => media.removeEventListener('change', handleChange)
  }, [preference])

  const value = useMemo(
    () => ({
      preference,
      resolved,
      setPreference,
      toggleTheme,
    }),
    [preference, resolved, setPreference, toggleTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

// Hook lives alongside provider; fast-refresh rule allows one non-component export pair.
// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}
