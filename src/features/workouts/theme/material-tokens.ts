// material-tokens.ts — MUI palette/spacing/typography mirror of shadcn theme.
//
// Every color value is derived from a CSS variable in `src/index.css` (shadcn
// zinc palette). When shadcn tokens change, regenerate these hex values from
// the corresponding `oklch(...)` declarations and keep the per-line comment
// that names the source variable.

export type ThemeMode = 'light' | 'dark'

export interface MuiPalette {
  mode: ThemeMode
  primary: { main: string; contrastText: string }
  secondary: { main: string; contrastText: string }
  background: { default: string; paper: string }
  text: { primary: string; secondary: string; disabled: string }
  divider: string
  error: { main: string; contrastText: string }
  info: { main: string; contrastText: string } // MUI standard: blue
  success: { main: string; contrastText: string } // MUI standard: green
  // Workout categories — custom palette colors consumed by `<Chip color="crossfit">` etc.
  crossfit: { main: string; light: string; dark: string; contrastText: string }
  functional: { main: string; light: string; dark: string; contrastText: string }
  bjj: { main: string; light: string; dark: string; contrastText: string }
}

export interface WorkoutTokens {
  typography: {
    fontFamily: string
  }
  radius: {
    card: number // --radius (0.625rem) = 10px
    chip: number // --radius-md (calc(0.625 * 0.8) = 0.5rem) = 8px
    button: number
  }
}

// ---------------------------------------------------------------------------
// Light palette — traces to `:root` in `src/index.css`
// ---------------------------------------------------------------------------

const lightPalette: MuiPalette = {
  mode: 'light',
  primary: { main: '#0a0a0a', contrastText: '#fafafa' }, // --primary / --primary-foreground
  secondary: { main: '#f4f4f5', contrastText: '#0a0a0a' }, // --secondary / --secondary-foreground
  background: { default: '#ffffff', paper: '#ffffff' }, // --background / --card
  text: {
    primary: '#0a0a0a', // --foreground
    secondary: '#71717a', // --muted-foreground
    disabled: '#a1a1aa', // --muted (approximate disabled shade)
  },
  divider: '#e4e4e7', // --border
  error: { main: '#dc2626', contrastText: '#ffffff' }, // --destructive
  info: { main: '#0288d1', contrastText: '#ffffff' }, // MUI blue (light) — ensures `color="info"` is a real blue, not black
  success: { main: '#2e7d32', contrastText: '#ffffff' }, // MUI green (light)
  // Workout categories — orange/cyan/violet for visual differentiation.
  // `main` sits on `light` as the chip label, so it has to clear 4.5:1 against
  // it (the 600 shades only reached 2.6:1, 3.3:1 and 4.1:1).
  crossfit: { main: '#9a3412', light: '#fed7aa', dark: '#7c2d12', contrastText: '#ffffff' }, // orange-800 family
  functional: { main: '#0e7490', light: '#cffafe', dark: '#155e75', contrastText: '#ffffff' }, // cyan-700 family
  bjj: { main: '#6d28d9', light: '#ddd6fe', dark: '#4c1d95', contrastText: '#ffffff' }, // violet-700 family
}

// ---------------------------------------------------------------------------
// Dark palette — traces to `.dark` in `src/index.css`
// ---------------------------------------------------------------------------

const darkPalette: MuiPalette = {
  mode: 'dark',
  primary: { main: '#fafafa', contrastText: '#0a0a0a' }, // .dark --primary / --primary-foreground
  secondary: { main: '#27272a', contrastText: '#fafafa' }, // .dark --secondary / --secondary-foreground
  background: { default: '#0a0a0a', paper: '#18181b' }, // .dark --background / --card
  text: {
    primary: '#fafafa', // .dark --foreground
    secondary: '#a1a1aa', // .dark --muted-foreground
    disabled: '#52525b', // muted approximation
  },
  divider: '#27272a', // .dark --border (alpha flattened to opaque)
  error: { main: '#ff5546', contrastText: '#ffffff' }, // .dark --destructive
  info: { main: '#29b6f6', contrastText: '#0a0a0a' }, // MUI blue (dark) — lighter for contrast
  success: { main: '#66bb6a', contrastText: '#0a0a0a' }, // MUI green (dark)
  // Workout categories — brighter shades for dark-mode contrast. `main` is the
  // label on `light`, so it has to clear 4.5:1 against it there too.
  crossfit: { main: '#fcd34d', light: '#9a3412', dark: '#7c2d12', contrastText: '#0a0a0a' }, // amber-300 on orange-800
  functional: { main: '#67e8f9', light: '#155e75', dark: '#164e63', contrastText: '#0a0a0a' }, // cyan-300
  bjj: { main: '#c4b5fd', light: '#4c1d95', dark: '#2e1065', contrastText: '#0a0a0a' }, // violet-300
}

export const palettes: Record<ThemeMode, MuiPalette> = {
  light: lightPalette,
  dark: darkPalette,
}

export const tokensByMode: WorkoutTokens = {
  typography: {
    // Mirrors `@theme inline { --font-sans: 'Geist Variable', sans-serif }` in index.css
    fontFamily: '"Geist Variable", -apple-system, BlinkMacSystemFont, sans-serif',
  },
  radius: {
    card: 10, // --radius: 0.625rem
    chip: 8, // --radius-md: calc(--radius * 0.8)
    button: 8,
  },
}
