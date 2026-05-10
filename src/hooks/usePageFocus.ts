import { useEffect } from 'react'
import { useLocation } from 'react-router'

/**
 * Focuses `#main-content` on route changes for accessible navigation.
 * Works with the skip-link pattern: when users skip to main content,
 * focus moves here so screen readers announce the new context.
 */
export function usePageFocus() {
  const { pathname } = useLocation()

  useEffect(() => {
    // Small delay ensures DOM is ready after route transition
    const timeout = setTimeout(() => {
      document.getElementById('main-content')?.focus()
    }, 50)

    return () => clearTimeout(timeout)
  }, [pathname])
}
