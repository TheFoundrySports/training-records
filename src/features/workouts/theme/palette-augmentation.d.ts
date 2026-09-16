// Module augmentation for the MUI theme palette.
//
// Adds the workout category color slots (`crossfit`, `functional`, `bjj`)
// to the Palette interface so `theme.palette.crossfit.main` etc. are typed.
// Without this, accessing these keys requires `as any` casts.
//
// MUI's base `PaletteColor` already has `main` / `light` / `dark` /
// `contrastText`, so we only need to add the new top-level palette keys.
//
// Keep in sync with the runtime values in `material-tokens.ts`.

import '@mui/material/styles'

declare module '@mui/material/styles' {
  interface Palette {
    crossfit: PaletteColor
    functional: PaletteColor
    bjj: PaletteColor
  }

  interface PaletteOptions {
    crossfit?: Partial<PaletteColor>
    functional?: Partial<PaletteColor>
    bjj?: Partial<PaletteColor>
  }
}
