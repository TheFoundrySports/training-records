import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { workoutSchema, type WorkoutFormValues } from '../workout.schema'
import { useWorkout } from '../hooks/useWorkouts'
import { useCreateWorkout, useUpdateWorkout } from '../hooks/useWorkoutMutations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

/**
 * WorkoutFormPage — used for both create (/workouts/new) and edit (/workouts/:id/edit).
 * Detects mode by checking if `id` param is present.
 */
export function WorkoutFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEdit = Boolean(id)

  const { data: existing, isLoading: loadingExisting } = useWorkout(id ?? '')

  const createMutation = useCreateWorkout()
  const updateMutation = useUpdateWorkout()

  const isPending = createMutation.isPending || updateMutation.isPending

  const form = useForm<WorkoutFormValues>({
    resolver: zodResolver(workoutSchema),
    defaultValues: {
      title: '',
      type: 'crossfit',
      // datetime-local input format (normalizeDateTime handles conversion to ISO8601)
      performedAt: new Date().toISOString().slice(0, 16),
      durationMinutes: 30,
      notes: '',
      rpe: undefined,
    },
  })

  // Populate form when editing and data is loaded
  useEffect(() => {
    if (isEdit && existing) {
      form.reset({
        title: existing.title,
        type: existing.type,
        performedAt: existing.performedAt.slice(0, 16),
        durationMinutes: existing.durationMinutes,
        notes: existing.notes ?? '',
        rpe: existing.rpe,
      })
    }
  }, [isEdit, existing, form])

  async function onSubmit(values: WorkoutFormValues) {
    if (isEdit && id) {
      await updateMutation.mutateAsync({ id, data: values })
      void navigate(`/workouts/${id}`)
    } else {
      await createMutation.mutateAsync(values)
      void navigate('/workouts')
    }
  }

  if (isEdit && loadingExisting) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div role="status" aria-label="Loading workout" className="space-y-4">
          <div className="h-8 w-48 rounded bg-muted animate-pulse" aria-hidden="true" />
          <div className="h-64 rounded-xl bg-muted animate-pulse" aria-hidden="true" />
        </div>
      </div>
    )
  }

  const mutationError =
    (createMutation.error as { error?: { message?: string } } | null)?.error?.message ??
    (updateMutation.error as { error?: { message?: string } } | null)?.error?.message

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-2xl font-semibold mb-6">
        {isEdit ? 'Edit Workout' : 'Log Workout'}
      </h1>

      {mutationError && (
        <div role="alert" className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-destructive text-sm">
          {mutationError}
        </div>
      )}

      <Form {...form}>
        <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="space-y-5" noValidate>
          {/* Title */}
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Morning WOD" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Type */}
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Type</FormLabel>
                <FormControl>
                  <select
                    {...field}
                    className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    aria-label="Workout type"
                  >
                    <option value="crossfit">CrossFit</option>
                    <option value="functional">Functional</option>
                  </select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Performed at */}
          <FormField
            control={form.control}
            name="performedAt"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date &amp; Time</FormLabel>
                <FormControl>
                  <Input type="datetime-local" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Duration */}
          <FormField
            control={form.control}
            name="durationMinutes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Duration (minutes)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    max={300}
                    {...field}
                    onChange={(e) => field.onChange(e.target.valueAsNumber)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Notes */}
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea placeholder="How did it go?" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* RPE */}
          <FormField
            control={form.control}
            name="rpe"
            render={({ field }) => (
              <FormItem>
                <FormLabel>RPE (1–10, optional)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    placeholder="e.g. 7"
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => {
                      const val = e.target.value
                      field.onChange(val === '' ? undefined : Number(val))
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving…' : 'Save'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void navigate(isEdit && id ? `/workouts/${id}` : '/workouts')}
              disabled={isPending}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
