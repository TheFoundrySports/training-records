import { Box, Typography, Stack } from '@mui/material'
import type { ReactNode } from 'react'

interface MetadataFieldProps {
  label: string
  value: ReactNode
}

/**
 * Single key-value field using MUI Box with flex layout.
 * Label is muted, value is primary text.
 * Responsive: label takes fixed width on sm+, full width on xs.
 *
 * Usage:
 * ```tsx
 * <MetadataField label="Date" value="Jan 1, 2025" />
 * <MetadataField label="Duration" value={`${min} minutes`} />
 * ```
 */
export function MetadataField({ label, value }: MetadataFieldProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'baseline',
        gap: 2,
        py: 0.75,
      }}
    >
      <Typography
        variant="body2"
        component="span"
        sx={{
          color: 'text.secondary',
          minWidth: { xs: 'auto', sm: 100 },
          flexShrink: 0,
        }}
      >
        {label}
      </Typography>
      <Typography variant="body1" component="span" sx={{ flex: 1 }}>
        {value}
      </Typography>
    </Box>
  )
}

/**
 * Group of metadata fields with consistent vertical spacing.
 * Uses MUI Stack for vertical rhythm.
 */
export function MetadataGrid({ children }: { children: ReactNode }) {
  return (
    <Stack spacing={0} sx={{ pt: 0.5 }}>
      {Array.isArray(children)
        ? children.map((child, index) => <Box key={index}>{child}</Box>)
        : <Box>{children}</Box>}
    </Stack>
  )
}
