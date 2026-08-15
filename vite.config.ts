import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? 'http://127.0.0.1:54321'

// https://vite.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api/v1': {
        target: `${SUPABASE_URL}/functions/v1`,
        rewrite: (path) => path.replace(/^\/api\/v1/, ''),
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    // PR 4 (bjj-evolution-dashboard / C2): pre-bundle MUI v6 + emotion
    // so the dashboard route's first dev-server boot doesn't have to
    // discover and resolve them on the fly. The deep paths for
    // ThemeProvider (used by `mui-dashboard-theme.ts` and
    // `renderWithMuiTheme.tsx`) and the refresh icon (used by
    // `DashboardTimeFilter` in PR 5) are the only ones we know are
    // imported at module-eval time; the rest of the MUI components
    // (Card, Button, ToggleButtonGroup, Chip, Grid, Paper, Stack, Box,
    // Typography, Alert) are reached via the top-level `@mui/material`
    // export map and get discovered at first use.
    include: [
      '@mui/material',
      '@mui/material/styles',
      '@emotion/react',
      '@emotion/styled',
      '@mui/icons-material/Sync',
    ],
  },
})
