/**
 * WorkoutTypePicker — hero picker on /workouts/new.
 *
 * Rendered inside <MaterialScope> so the bjj-dashboard CSS variables
 * (`--surface`, `--space-*`, `--font-display`, `--radius-md`, `--elev-raised`,
 * `--focus-ring`, …) resolve. Cards are CSS-class widgets using the same
 * `.widget` / `.widget-icon` / `.widget-title` / `.widget-sub` classes as
 * the dashboard widgets in `src/features/bjj/dashboard/`, not MUI <Card>.
 *
 * Change mgmt:
 *  - Layout primitives come from MUI (`Box`, `Stack`, `Typography`).
 *  - Card surface + focus ring come from the shared `.widget` class and
 *    the scope-level `:focus-visible` rule in `material-dashboard.css`.
 *  - Each option is a `<Link>` so navigation is real anchor semantics
 *    (browser-native focus, no `useNavigate` noop race).
 *  - Adding a third option is a `WORKOUT_TYPE_OPTIONS` constant-entry
 *    change with no JSX edit.
 */
import { Link } from 'react-router'
import { Box, Stack, Typography } from '@mui/material'
import { Dumbbell, Shield, type LucideIcon } from 'lucide-react'

export interface WorkoutTypeOption {
  readonly id: 'crossfit' | 'bjj'
  readonly title: string
  readonly subtitle: string
  readonly href: string
  readonly icon: LucideIcon
}

// eslint-disable-next-line react-refresh/only-export-components
export const WORKOUT_TYPE_OPTIONS: readonly WorkoutTypeOption[] = [
  {
    id: 'crossfit',
    title: 'CrossFit / Functional',
    subtitle: 'WOD-based training',
    href: '/workouts/new/crossfit',
    icon: Dumbbell,
  },
  {
    id: 'bjj',
    title: 'Brazilian Jiu-Jitsu',
    subtitle: 'Section-based technique training',
    href: '/bjj/new',
    icon: Shield,
  },
]

export function WorkoutTypePicker() {
  return (
    <Stack
      sx={{
        maxWidth: 'var(--container-max, 768px)',
        mx: 'auto',
        px: 'var(--container-gutter-phone)',
        py: 'var(--section-y-phone)',
        '@media (min-width:600px)': {
          px: 'var(--container-gutter-tablet)',
          py: 'var(--section-y-tablet)',
        },
        '@media (min-width:1280px)': {
          py: 'var(--section-y-desktop)',
        },
      }}
    >
      <Typography
        variant="h4"
        component="h1"
        data-testid="picker-heading"
        sx={{
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--text-3xl)',
          fontWeight: 500,
          letterSpacing: '-0.02em',
          lineHeight: 'var(--leading-tight)',
          color: 'var(--fg)',
          mb: 'var(--space-8)',
        }}
      >
        Log Workout
      </Typography>
      <Box
        data-testid="picker-grid"
        sx={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: 'var(--space-6)',
          '@media (min-width:600px)': {
            gridTemplateColumns: '1fr 1fr',
            gap: 'var(--space-8)',
          },
        }}
      >
        {WORKOUT_TYPE_OPTIONS.map(({ id, title, subtitle, href, icon: Icon }) => (
          <Link
            key={id}
            to={href}
            data-testid={`option-card-${id}`}
            className="widget option-card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-3)',
              textDecoration: 'none',
              color: 'inherit',
              cursor: 'pointer',
              transition: 'transform var(--motion-fast) var(--ease-standard)',
            }}
          >
            <span
              className="widget-icon"
              aria-hidden="true"
              style={{ marginBottom: 'var(--space-2)' }}
            >
              <Icon />
            </span>
            <span className="widget-title">{title}</span>
            <span className="widget-sub">{subtitle}</span>
          </Link>
        ))}
      </Box>
    </Stack>
  )
}
