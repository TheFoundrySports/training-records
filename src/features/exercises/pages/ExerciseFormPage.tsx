import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { exerciseSchema, type ExerciseFormValues } from '../exercise.schema'
import { useExercise } from '../hooks/useExercises'
import { useCreateExercise, useUpdateExercise } from '../hooks/useExerciseMutations'
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
 * ExerciseFormPage — used for both create (/exercises/new) and edit (/exercises/:id/edit).
 */
export function ExerciseFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEdit = Boolean(id)

  const { data: existing, isLoading: loadingExisting } = useExercise(id ?? '')

  const createMutation = useCreateExercise()
  const updateMutation = useUpdateExercise()

  const isPending = createMutation.isPending || updateMutation.isPending

  const form = useForm<ExerciseFormValues>({
    resolver: zodResolver(exerciseSchema),
    defaultValues: {
      name: '',
      movementType: 'Gymnastics',
      measurementType: 'Reps',
      difficultyLevel: 'Beginner',
      description: '',
      isBenchmark: false,
      equipment: [],
    },
  })

  useEffect(() => {
    if (isEdit && existing) {
      form.reset({
        name: existing.name,
        movementType: existing.movementType as ExerciseFormValues['movementType'],
        measurementType: existing.measurementType as ExerciseFormValues['measurementType'],
        difficultyLevel: existing.difficultyLevel as ExerciseFormValues['difficultyLevel'],
        description: existing.description ?? '',
        isBenchmark: existing.isBenchmark,
        equipment: existing.equipment,
        videoUrl: existing.videoUrl ?? '',
        scalingOptions: existing.scalingOptions ?? '',
      })
    }
  }, [isEdit, existing, form])

  async function onSubmit(values: ExerciseFormValues) {
    if (isEdit && id) {
      await updateMutation.mutateAsync({ id, data: values })
    } else {
      await createMutation.mutateAsync(values)
    }
    void navigate('/exercises')
  }

  if (isEdit && loadingExisting) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div role="status" aria-label="Loading exercise" className="space-y-4">
          <div className="h-8 w-48 rounded bg-muted animate-pulse" aria-hidden="true" />
          <div className="h-64 rounded-xl bg-muted animate-pulse" aria-hidden="true" />
        </div>
      </div>
    )
  }

  const mutationError =
    (createMutation.error as { error?: { message?: string } } | null)?.error?.message ??
    (updateMutation.error as { error?: { message?: string } } | null)?.error?.message

  const selectClass =
    'h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-2xl font-semibold mb-6">{isEdit ? 'Edit Exercise' : 'Add Exercise'}</h1>

      {mutationError && (
        <div
          role="alert"
          className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-destructive text-sm"
        >
          {mutationError}
        </div>
      )}

      <Form {...form}>
        <form
          onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}
          className="space-y-5"
          noValidate
        >
          {/* Name */}
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Pull-up" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Movement Type */}
          <FormField
            control={form.control}
            name="movementType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Movement Type</FormLabel>
                <FormControl>
                  <select {...field} className={selectClass} aria-label="Movement type">
                    <option value="Gymnastics">Gymnastics</option>
                    <option value="Weightlifting">Weightlifting</option>
                    <option value="Monostructural">Monostructural</option>
                    <option value="Mixed">Mixed</option>
                  </select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Measurement Type */}
          <FormField
            control={form.control}
            name="measurementType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Measurement Type</FormLabel>
                <FormControl>
                  <select {...field} className={selectClass} aria-label="Measurement type">
                    <option value="Reps">Reps</option>
                    <option value="Weight">Weight</option>
                    <option value="Distance">Distance</option>
                    <option value="Time">Time</option>
                    <option value="Reps/Weight">Reps/Weight</option>
                  </select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Difficulty Level */}
          <FormField
            control={form.control}
            name="difficultyLevel"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Difficulty Level</FormLabel>
                <FormControl>
                  <select {...field} className={selectClass} aria-label="Difficulty level">
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                    <option value="Elite">Elite</option>
                  </select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Description */}
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description (optional)</FormLabel>
                <FormControl>
                  <Textarea placeholder="Describe the exercise…" {...field} />
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
              onClick={() => void navigate('/exercises')}
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
