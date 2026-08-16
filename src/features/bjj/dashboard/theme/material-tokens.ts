/**
 * Re-export shim for material-tokens.ts.
 *
 * The theme files were moved to shared src/theme/ in PR 4 (MaterialScope
 * foundation). This shim keeps the dashboard + tests green during the
 * migration. All new imports should use '@/theme/material-tokens'.
 */
export * from '@/theme/material-tokens'
