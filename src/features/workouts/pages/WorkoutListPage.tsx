import { useMemo, useState } from 'react'
import { useNavigate, Link as LinkLike } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Card,
  Chip,
  Container,
  List,
  ListItem,
  Skeleton,
  Stack,
  ThemeProvider,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useTheme,
} from '@mui/material'
import type { Theme } from '@mui/material/styles'
import WhatshotIcon from '@mui/icons-material/Whatshot'
import SelfImprovementIcon from '@mui/icons-material/SelfImprovement'
import type { SvgIconProps } from '@mui/material/SvgIcon'
import { useWorkouts } from '../hooks/useWorkouts'
import { ExportAllWorkoutsButton } from '../components/ExportAllWorkoutsButton'
import { ImportWorkoutsModal } from '../components/ImportWorkoutsModal'
import { createWorkoutsTheme, readShadcnDarkMode } from '../theme/mui-workouts-theme'
import type { Workout, WorkoutType } from '../workout.types'

type FilterType = 'all' | WorkoutType

const FILTER_OPTIONS: { label: string; value: FilterType }[] = [
  { label: 'All', value: 'all' },
  { label: 'CrossFit', value: 'crossfit' },
  { label: 'Functional', value: 'functional' },
  { label: 'BJJ', value: 'bjj' },
]

/** Friendly display labels for workout categories on the card chip. */
const CATEGORY_LABELS: Record<WorkoutType, string> = {
  crossfit: 'CrossFit',
  functional: 'Functional',
  bjj: 'Brazilian JiuJitsu',
}

/**
 * BJJ white belt icon — inlined from Wikimedia Commons
 * (https://commons.wikimedia.org/wiki/File:BJJ_White_Belt.svg). The original
 * SVG (viewBox 0 0 478.619 184.762) is preserved as-is and rendered at 1em
 * with `vector-effect="non-scaling-stroke"` so the line weight stays
 * legible when the chip shrinks the icon to ~18–24px.
 *
 * MUI's icon library has no belt/gi icon, so this lives inline.
 * Stroke uses currentColor so the chip's category color (violet for BJJ)
 * tints the belt. Fill stays #FFF (original) which reads as the belt surface
 * against the chip's light-tinted background.
 */
function BjjBeltIcon(props: SvgIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 478.619 184.762"
      width="1em"
      height="1em"
      data-testid="category-icon-bjj"
      aria-hidden="true"
      {...props}
    >
      <g
        fill="#FFF"
        stroke="currentColor"
        strokeWidth={4}
        vectorEffect="non-scaling-stroke"
      >
        <path d="M192.044 46.054s-1.475 4.952.21 7.375c1.686 2.423 24.86 1.791 24.86 1.791L205.845 45l-13.801 1.054z" />
        <path d="M9.831 23.198S129.012 55.285 243.61 55.285 458.289 4.098 462.11 1.806c3.819-2.292 12.987 38.963.765 48.131-12.225 9.168-80.983 48.896-216.208 48.896-135.226 0-233.015-21.392-239.892-29.032-6.876-7.64-6.876-38.199 3.056-46.603z" />
        <path d="M252.014 126.336s-22.156-6.112-28.268-21.392c-6.111-15.279 58.827-29.795 58.827-29.795l-6.112 31.324-24.447 19.863z" />
        <path d="M195.479 102.652s30.56 21.392 35.143 19.1c4.584-2.292 58.827-36.671 58.827-36.671L243.61 51.465l-50.423 38.2 2.292 12.987z" />
        <path d="M22.818 152.312S148.111 75.914 223.746 45.354c75.635-30.56 30.56 29.031 30.56 29.031s-78.69 38.199-110.778 57.299-81.746 50.424-87.858 51.188c-6.112.763-32.852-30.56-32.852-30.56z" />
        <path d="M255.967 27.303s-5.29-1.851-14.146 8.46c-8.857 10.312 15.07 8.197 15.07 8.197l-.924-16.657z" />
        <path d="M232.15 28.546s94.734 49.659 127.586 60.355c32.851 10.696 113.832 46.603 116.889 55.771s-27.503 30.559-27.503 30.559-23.685-21.391-54.243-34.379c-30.56-12.987-83.274-34.379-112.306-48.131-29.031-13.751-89.387-47.367-89.387-47.367l38.964-16.808z" />
        <path d="M255.834 27.782s-2.292 92.442-4.584 97.026c-2.293 4.584 42.783-12.987 43.546-18.335.765-5.349 6.877-50.423 2.293-55.007s-36.672-25.976-41.255-23.684zM52.833 134.34s20.641 24.654 33.446 31.918c4.013-1.912 87.34-50.839 87.34-50.839s-25.801-22.933-29.623-32.107c-7.453 4.205-91.163 51.028-91.163 51.028z" />
        <path d="M62.006 129.18s20.641 24.655 33.446 31.917c4.013-1.911 68.995-40.707 68.995-40.707s-25.801-22.933-29.624-32.108c-7.452 4.205-72.817 40.898-72.817 40.898z" />
      </g>
    </svg>
  )
}

/**
 * Pick the right icon for a workout category. Centralised so the
 * WorkoutCard chip and any future badge share the same source of truth.
 * MUI ships icons for CrossFit (Whatshot) and Functional (SelfImprovement),
 * but BJJ gets an inline tied-belt SVG (no MUI equivalent).
 * All three forward arbitrary SvgIconProps (size, color, sx, etc.) so the
 * chip can scale them uniformly.
 */
function CategoryIcon({ type, ...iconProps }: { type: WorkoutType } & SvgIconProps) {
  switch (type) {
    case 'crossfit':
      return <WhatshotIcon data-testid={`category-icon-${type}`} {...iconProps} />
    case 'functional':
      return <SelfImprovementIcon data-testid={`category-icon-${type}`} {...iconProps} />
    case 'bjj':
      return <BjjBeltIcon {...iconProps} />
  }
}

/** Resolve the theme palette color slot for a workout category. */
function useCategoryColor(theme: Theme, type: WorkoutType) {
  return theme.palette[type]
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function WorkoutCard({ workout }: { workout: Workout }) {
  const theme = useTheme()
  const categoryColor = useCategoryColor(theme, workout.type)
  return (
    <ListItem disablePadding>
      <Card
        component={LinkLike}
        to={`/workouts/${workout.id}`}
        sx={{
          width: '100%',
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          textDecoration: 'none',
          color: 'inherit',
          cursor: 'pointer',
          '&:hover': { borderColor: categoryColor.main },
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body1" noWrap sx={{ fontWeight: 500 }}>
            {workout.title}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {formatDate(workout.performedAt)} &bull; {workout.durationMinutes} min
          </Typography>
        </Box>
        <Chip
          icon={<CategoryIcon type={workout.type} fontSize="medium" />}
          label={CATEGORY_LABELS[workout.type]}
          size="medium"
          variant="outlined"
          data-testid={`category-chip-${workout.type}`}
          sx={{
            flexShrink: 0,
            fontSize: '0.875rem',
            color: categoryColor.main,
            borderColor: categoryColor.main,
            // Slightly tint the background using the category's `light` shade
            // (white-on-orange would be harsh; a soft fill reads better).
            backgroundColor: categoryColor.light,
            '& .MuiChip-icon': { color: categoryColor.main, fontSize: '1.5rem' },
            '&:hover': {
              backgroundColor: categoryColor.dark,
              color: '#ffffff',
              borderColor: categoryColor.dark,
            },
          }}
        />
      </Card>
    </ListItem>
  )
}

function LoadingSkeleton() {
  return (
    <Box
      role="status"
      aria-label="Loading workouts"
      sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}
    >
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} variant="rectangular" height={80} sx={{ borderRadius: 1.25 }} />
      ))}
    </Box>
  )
}

/** Highlight the active category toggle with the category's color (or `primary` for "all"). */
function useCategoryToggleSx(type: FilterType) {
  const theme = useTheme()
  if (type === 'all') {
    return {
      '&.Mui-selected': {
        backgroundColor: theme.palette.primary.main,
        color: theme.palette.primary.contrastText,
        '&:hover': { backgroundColor: theme.palette.primary.main },
      },
    } as const
  }
  const color = theme.palette[type]
  return {
    '&.Mui-selected': {
      backgroundColor: color.main,
      color: color.contrastText,
      '&:hover': { backgroundColor: color.dark },
    },
  } as const
}

function TypeFilter({ value, onChange }: { value: FilterType; onChange: (v: FilterType) => void }) {
  return (
    <ToggleButtonGroup
      value={value}
      exclusive
      onChange={(_, next) => next && onChange(next as FilterType)}
      aria-label="Filter workouts by type"
      sx={{ mb: 3, flexWrap: 'wrap', gap: 0.5 }}
    >
      {FILTER_OPTIONS.map((opt) => (
        <CategoryToggleButton key={opt.value} option={opt} />
      ))}
    </ToggleButtonGroup>
  )
}

function CategoryToggleButton({ option }: { option: { label: string; value: FilterType } }) {
  const sx = useCategoryToggleSx(option.value)
  return (
    <ToggleButton value={option.value} aria-label={option.label} sx={sx}>
      {option.label}
    </ToggleButton>
  )
}

export function WorkoutListPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const theme = useMemo(() => createWorkoutsTheme(readShadcnDarkMode()), [])
  const [filter, setFilter] = useState<FilterType>('all')
  const [importModalOpen, setImportModalOpen] = useState(false)
  const { data: workouts, isLoading, isError, error } = useWorkouts({ type: filter })

  return (
    <ThemeProvider theme={theme}>
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          alignItems={{ sm: 'center' }}
          justifyContent="space-between"
          sx={{ mb: 3 }}
        >
          <Typography variant="h4" component="h1">
            Workouts
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <ExportAllWorkoutsButton />
            <Button variant="outlined" onClick={() => setImportModalOpen(true)}>
              Import
            </Button>
            <Button variant="contained" onClick={() => void navigate('/workouts/new')}>
              Log workout
            </Button>
          </Stack>
        </Stack>

        <TypeFilter value={filter} onChange={setFilter} />

        {isLoading && <LoadingSkeleton />}

        {isError && (
          <Alert severity="error" sx={{ borderRadius: 1, mb: 2 }}>
            <AlertTitle>Failed to load workouts</AlertTitle>
            {(error as { error?: { message?: string } })?.error?.message ??
              'An unexpected error occurred. Please try again.'}
          </Alert>
        )}

        {!isLoading && !isError && workouts && workouts.length === 0 && (
          <Stack alignItems="center" spacing={1} sx={{ py: 8 }}>
            <Typography variant="body1" sx={{ fontWeight: 500 }}>
              No workouts yet
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Log your first workout to get started.
            </Typography>
            <Button
              variant="contained"
              sx={{ mt: 2 }}
              onClick={() => void navigate('/workouts/new')}
            >
              Log workout
            </Button>
          </Stack>
        )}

        {!isLoading && !isError && workouts && workouts.length > 0 && (
          <List
            aria-label="Workout list"
            sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, p: 0 }}
          >
            {workouts.map((workout) => (
              <WorkoutCard key={workout.id} workout={workout} />
            ))}
          </List>
        )}

        <ImportWorkoutsModal
          open={importModalOpen}
          onClose={() => setImportModalOpen(false)}
          onSuccess={() => {
            setImportModalOpen(false)
            void queryClient.invalidateQueries({ queryKey: ['workouts'] })
          }}
        />
      </Container>
    </ThemeProvider>
  )
}
