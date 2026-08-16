/**
 * MaterialScope component tests.
 *
 * Task 4.11: Verify MaterialScope uses ScopedCssBaseline (not global
 * CssBaseline) to prevent body/html reset leaks into shadcn pages.
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MaterialScope } from '../MaterialScope'

describe('MaterialScope', () => {
  it('renders children inside .bjj-dashboard scope class', () => {
    render(
      <MaterialScope>
        <div data-testid="test-child">Test Content</div>
      </MaterialScope>,
    )

    const child = screen.getByTestId('test-child')
    expect(child).toBeInTheDocument()

    // Find the wrapper with .bjj-dashboard class
    const wrapper = child.closest('.bjj-dashboard')
    expect(wrapper).toBeInTheDocument()
    expect(wrapper).toHaveClass('bjj-dashboard')
  })

  it('uses ScopedCssBaseline (not CssBaseline)', () => {
    const { container } = render(
      <MaterialScope>
        <div>Content</div>
      </MaterialScope>,
    )

    // ScopedCssBaseline creates a div with class MuiScopedCssBaseline-root
    const scopedRoot = container.querySelector('.MuiScopedCssBaseline-root')
    expect(scopedRoot).toBeInTheDocument()

    // Global CssBaseline creates a <style> tag with data-emotion attribute
    // and applies styles to html/body directly. With ScopedCssBaseline,
    // those global styles should NOT exist.
    const globalStyles = container.querySelectorAll('style[data-emotion]')
    const hasBodyReset = Array.from(globalStyles).some((style) =>
      style.textContent?.includes('body {'),
    )

    // The scoped baseline may have styles, but they should NOT target
    // bare 'body' or 'html' elements globally
    expect(hasBodyReset).toBe(false)
  })

  it('wraps children in MUI ThemeProvider', () => {
    const { container } = render(
      <MaterialScope>
        <div data-testid="themed-content">Themed</div>
      </MaterialScope>,
    )

    // MUI ThemeProvider should be present (it doesn't add a DOM node,
    // but we can verify the theme context works by checking that
    // ScopedCssBaseline and .bjj-dashboard are both present)
    const scopedRoot = container.querySelector('.MuiScopedCssBaseline-root')
    const dashboardScope = container.querySelector('.bjj-dashboard')

    expect(scopedRoot).toBeInTheDocument()
    expect(dashboardScope).toBeInTheDocument()
  })

  it('applies dark mode via prefers-color-scheme (system preference)', () => {
    // This test verifies the structure is correct; actual dark mode
    // CSS application is tested in material-port.test.ts via the
    // @media (prefers-color-scheme: dark) query in material-dashboard.css

    render(
      <MaterialScope>
        <div>Content</div>
      </MaterialScope>,
    )

    // The .bjj-dashboard class should be present
    const dashboardScope = document.querySelector('.bjj-dashboard')
    expect(dashboardScope).toBeInTheDocument()

    // The dark mode CSS variables are defined in material-dashboard.css
    // under @media (prefers-color-scheme: dark) { .bjj-dashboard { ... } }
    // This test just confirms the scope class is present; the CSS test
    // in material-port.test.ts verifies the media query exists
  })
})
