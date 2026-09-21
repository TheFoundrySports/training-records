import { useState } from 'react'
import { useNavigate } from 'react-router'
import {
  Card,
  CardContent,
  CardHeader,
  Chip,
  Stack,
  Box,
  Typography,
  Button as MuiButton,
  Skeleton,
  ToggleButton,
  ToggleButtonGroup,
  Divider,
} from '@mui/material'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import { useBJJSections } from '../hooks/useBJJSections'
import { MetadataField, MetadataGrid } from '@/features/workouts/components/MetadataField'
import type { Workout } from '@/features/workouts/workout.types'
import type { BJJSection } from '../bjj.types'

interface BJJWorkoutDetailProps {
  workoutId: string
  workout: Workout
  canEdit?: boolean
  canDelete?: boolean
  onDelete?: () => void
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** BJJ violet color from material-tokens */
const BJJ_COLOR = { main: '#7c3aed', contrastText: '#ffffff' }

/** BJJ section card using MUI components */
function BJJSectionCard({ section }: { section: BJJSection }) {
  const [view, setView] = useState<'raw' | 'ai'>(section.aiDescription ? 'ai' : 'raw')

  const hasDescription = section.rawDescription || section.aiDescription
  const showDescription = view === 'raw' ? section.rawDescription : section.aiDescription

  return (
    <Card sx={{ mb: 2 }}>
      <CardHeader
        sx={{ pb: 1 }}
        title={
          <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
            <Typography variant="body2" component="span" sx={{ fontWeight: 600 }}>
              Section {section.sectionNumber}: {section.goal}
            </Typography>
            {section.durationMinutes && (
              <Chip
                label={`${section.durationMinutes} min`}
                size="small"
                variant="outlined"
                sx={{ height: 24, fontSize: '0.75rem' }}
              />
            )}
          </Stack>
        }
      />

      <CardContent sx={{ pt: 1 }}>
        {/* Techniques */}
        {section.techniques.length > 0 && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
            {section.techniques.map((technique) => (
              <Chip
                key={technique.id}
                label={
                  <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {technique.name}
                    {technique.youtubeUrl && (
                      <a
                        href={technique.youtubeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Watch ${technique.name} on YouTube`}
                        style={{ color: '#ef4444', marginLeft: 4 }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <PlayArrowIcon sx={{ fontSize: 14 }} />
                      </a>
                    )}
                  </Box>
                }
                size="small"
                sx={{
                  backgroundColor: BJJ_COLOR.main,
                  color: BJJ_COLOR.contrastText,
                  '& .MuiChip-label': { px: 1 },
                }}
              />
            ))}
          </Box>
        )}

        {/* Description toggle */}
        {hasDescription && (
          <Box>
            {section.rawDescription && section.aiDescription && (
              <ToggleButtonGroup
                value={view}
                exclusive
                onChange={(_, next) => next && setView(next)}
                size="small"
                sx={{ mb: 1.5 }}
              >
                <ToggleButton value="raw">Raw</ToggleButton>
                <ToggleButton value="ai">AI Enhanced</ToggleButton>
              </ToggleButtonGroup>
            )}
            {showDescription && (
              <Typography
                variant="body2"
                component="pre"
                sx={{
                  color: 'text.secondary',
                  fontFamily: 'inherit',
                  whiteSpace: 'pre-wrap',
                  m: 0,
                }}
              >
                {showDescription}
              </Typography>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  )
}

export function BJJWorkoutDetail({
  workoutId,
  workout,
  canEdit,
  canDelete,
  onDelete,
}: BJJWorkoutDetailProps) {
  const navigate = useNavigate()
  const { data: sections, isLoading, isError } = useBJJSections(workoutId)

  return (
    <Stack spacing={3}>
      {/* Main metadata card */}
      <Card sx={{ borderRadius: 2 }}>
        <CardHeader
          sx={{ borderBottom: 1, borderColor: 'divider', pb: 2 }}
          title={
            <Typography variant="h5" component="span" sx={{ fontWeight: 600 }}>
              {workout.title}
            </Typography>
          }
          titleTypographyProps={{ component: 'h1' }}
          action={
            <Chip
              label="BJJ"
              size="small"
              sx={{
                backgroundColor: BJJ_COLOR.main,
                color: BJJ_COLOR.contrastText,
                fontWeight: 500,
              }}
            />
          }
        />

        <CardContent>
          <MetadataGrid>
            <MetadataField label="Date" value={formatDate(workout.performedAt)} />
            <MetadataField label="Duration" value={`${workout.durationMinutes} minutes`} />
            {workout.rpe !== undefined && (
              <MetadataField label="RPE" value={`${workout.rpe} / 10`} />
            )}
          </MetadataGrid>

          {workout.notes && (
            <>
              <Divider sx={{ my: 2 }} />
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Notes
                </Typography>
                <Typography
                  variant="body1"
                  component="pre"
                  sx={{
                    fontFamily: 'inherit',
                    whiteSpace: 'pre-wrap',
                    m: 0,
                  }}
                >
                  {workout.notes}
                </Typography>
              </Box>
            </>
          )}
        </CardContent>
      </Card>

      {/* Action buttons */}
      {(canEdit || (canDelete && onDelete)) && (
        <Stack direction="row" spacing={1.5} flexWrap="wrap">
          {canEdit && (
            <MuiButton variant="outlined" onClick={() => void navigate(`/bjj/${workout.id}/edit`)}>
              Edit
            </MuiButton>
          )}
          {canDelete && onDelete && (
            <MuiButton variant="outlined" color="error" onClick={onDelete}>
              Delete
            </MuiButton>
          )}
        </Stack>
      )}

      {/* Sections */}
      <Box>
        <Typography variant="h6" component="h2" sx={{ mb: 2, fontWeight: 600 }}>
          Sections
        </Typography>

        {isLoading && (
          <Stack spacing={2} role="status" aria-label="Loading sections">
            {[1, 2].map((i) => (
              <Skeleton key={i} variant="rectangular" height={120} sx={{ borderRadius: 2 }} />
            ))}
          </Stack>
        )}

        {isError && (
          <Box
            role="alert"
            sx={{
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'error.main',
              backgroundColor: 'error.contrastText',
              p: 2,
            }}
          >
            <Typography variant="body2" color="error.main">
              Failed to load sections.
            </Typography>
          </Box>
        )}

        {!isLoading && !isError && sections && sections.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            No sections recorded for this workout.
          </Typography>
        )}

        {!isLoading && !isError && sections && sections.length > 0 && (
          <ul aria-label="Workout sections" style={{ listStyle: 'none' }}>
            {sections.map((section) => (
              <li key={section.id}>
                <BJJSectionCard section={section} />
              </li>
            ))}
          </ul>
        )}
      </Box>
    </Stack>
  )
}
