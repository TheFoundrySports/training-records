export const THEME_STORAGE_KEY = 'theme:v1'

export type ThemePreference = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

export const isThemePreference = (value: string | null): value is ThemePreference =>
  value === 'light' || value === 'dark' || value === 'system'

export const readStoredThemePreference = (): ThemePreference | null => {
  if (typeof window === 'undefined') {
    return null
  }
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    return isThemePreference(stored) ? stored : null
  } catch {
    return null
  }
}

export const readSystemTheme = (): ResolvedTheme => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'light'
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export const resolveTheme = (preference: ThemePreference): ResolvedTheme => {
  if (preference === 'system') {
    return readSystemTheme()
  }
  return preference
}

export const applyThemeToDocument = (resolved: ResolvedTheme): void => {
  if (typeof document === 'undefined') {
    return
  }
  const root = document.documentElement
  root.classList.toggle('dark', resolved === 'dark')
  root.style.colorScheme = resolved
}

export const persistThemePreference = (preference: ThemePreference): void => {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, preference)
  } catch {
    // Private browsing or disabled storage — ignore.
  }
}
