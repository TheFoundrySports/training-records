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
import SportsMmaIcon from '@mui/icons-material/SportsMma'
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

/**
 * Pick the right MUI icon for a workout category. Centralised so the
 * WorkoutCard chip and any future badge share the same source of truth.
 */
function CategoryIcon({ type }: { type: WorkoutType }) {
  switch (type) {
    case 'crossfit':
      return <WhatshotIcon data-testid={`category-icon-${type}`} fontSize="small" />
    case 'functional':
      return <SelfImprovementIcon data-testid={`category-icon-${type}`} fontSize="small" />
    case 'bjj':
      return <SportsMmaIcon data-testid={`category-icon-${type}`} fontSize="small" />
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
          icon={<CategoryIcon type={workout.type} />}
          label={workout.type}
          size="small"
          variant="outlined"
          data-testid={`category-chip-${workout.type}`}
          sx={{
            textTransform: 'capitalize',
            flexShrink: 0,
            color: categoryColor.main,
            borderColor: categoryColor.main,
            // Slightly tint the background using the category's `light` shade
            // (white-on-orange would be harsh; a soft fill reads better).
            backgroundColor: categoryColor.light,
            '& .MuiChip-icon': { color: categoryColor.main },
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
