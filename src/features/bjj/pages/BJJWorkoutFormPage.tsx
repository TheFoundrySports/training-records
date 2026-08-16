import { useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { bjjWorkoutSchema, type BJJWorkoutFormValues } from '../bjj.schema'
import { useCreateBJJWorkout } from '../hooks/useBJJWorkoutMutations'
import { useUpdateBJJWorkout } from '../hooks/useUpdateBJJWorkout'
import { useConfirmRolls } from '../hooks/useConfirmRolls'
import { useWorkout } from '@/features/workouts/hooks/useWorkouts'
import { useBJJSections } from '../hooks/useBJJSections'
import { BJJSectionEditor } from '../components/BJJSectionEditor'
import { MaterialScope } from '@/components/MaterialScope'
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
import type { BJJSection } from '../bjj.types'

export function BJJWorkoutFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEditMode = Boolean(id)

  const createMutation = useCreateBJJWorkout()
  const updateMutation = useUpdateBJJWorkout()
  const confirmRollsMutation = useConfirmRolls()
  const isPending = createMutation.isPending || updateMutation.isPending || confirmRollsMutation.isPending

  // Fetch existing workout for edit mode
  const { data: existingWorkout, isLoading: loadingWorkout } = useWorkout(id ?? '')
  const { data: existingSections } = useBJJSections(id ?? '')

  const form = useForm<BJJWorkoutFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(bjjWorkoutSchema) as any,
    defaultValues: {
      title: '',
      performedAt: new Date().toISOString().slice(0, 16),
      durationMinutes: 60,
      notes: '',
      rpe: undefined,
      sections: [
        {
          goal: '',
          rawDescription: '',
          durationMinutes: undefined,
          techniqueIds: [],
          rolls: [],
        },
      ],
    },
  })

  const { fields, append, remove } = useFieldArray({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    control: form.control as any,
    name: 'sections',
  })

  // Pre-fill form when editing — run only once after data loads
  const hasPrefilledRef = useRef(false)
  useEffect(() => {
    if (isEditMode && existingWorkout && existingSections && !hasPrefilledRef.current) {
      hasPrefilledRef.current = true
      const mappedSections = existingSections.map((section: BJJSection) => ({
        id: section.id,
        goal: section.goal,
        rawDescription: section.rawDescription ?? '',
        enhancedNotes: section.enhancedNotes ?? '',
        durationMinutes: section.durationMinutes,
        techniqueIds: section.techniques.map((t) => t.id),
        rolls: [], // Edit mode doesn't load existing rolls into the form
      }))

      form.reset({
        title: existingWorkout.title,
        performedAt: existingWorkout.performedAt.slice(0, 16),
        durationMinutes: existingWorkout.durationMinutes,
        notes: existingWorkout.notes ?? '',
        rpe: existingWorkout.rpe,
        sections: mappedSections.length > 0 ? mappedSections : [],
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode, existingWorkout, existingSections])

  async function onSubmit(values: BJJWorkoutFormValues) {
    try {
      let workoutId: string

      // Task 3.3 & 3.10: Save workout first, then confirm rolls (REQ-RE10)
      if (isEditMode && id) {
        await updateMutation.mutateAsync({
          workoutId: id,
          title: values.title,
          performedAt: new Date(values.performedAt).toISOString(),
          durationMin: values.durationMinutes,
          notes: values.notes ?? '',
          rpe: values.rpe,
          sections: values.sections.map((s, idx) => ({
            id: s.id,
            goal: s.goal,
            orderIndex: idx,
            techniqueIds: s.techniqueIds,
          })),
        })
        workoutId = id
      } else {
        workoutId = await createMutation.mutateAsync(values)
      }

      // Check if any sections have roll drafts to confirm
      const sectionsWithRolls = values.sections
        .map((section, index) => ({
          sectionNumber: index + 1, // section_number is 1-based
          rolls: section.rolls ?? [],
        }))
        .filter((section) => section.rolls.length > 0)

      // If there are rolls to confirm, call useConfirmRolls
      if (sectionsWithRolls.length > 0) {
        await confirmRollsMutation.mutateAsync({
          workoutId,
          sections: sectionsWithRolls,
        })
      }

      // Navigate after successful save + roll confirmation
      void navigate(`/workouts/${workoutId}`)
    } catch (error) {
      // Mutation errors are already tracked by the mutations
      // and will be displayed via mutationError below
      console.error('Save failed:', error)
    }
  }

  const mutationError =
    (createMutation.error as { error?: { message?: string } } | null)?.error?.message ??
    (updateMutation.error as { error?: { message?: string } } | null)?.error?.message ??
    (confirmRollsMutation.error as { message?: string } | null)?.message

  const rootErrorRef = useRef<HTMLDivElement>(null)

  // Focus error summary on submit failure
  useEffect(() => {
    if (rootErrorRef.current && mutationError) {
      rootErrorRef.current.focus()
    }
  }, [mutationError])

  if (isEditMode && loadingWorkout) {
    return (
      <MaterialScope>
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <div role="status" aria-label="Loading workout" className="space-y-4">
            <div className="h-8 w-48 rounded bg-muted animate-pulse" aria-hidden="true" />
            <div className="h-64 rounded-xl bg-muted animate-pulse" aria-hidden="true" />
          </div>
        </div>
      </MaterialScope>
    )
  }

  return (
    <MaterialScope>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--text-2xl)',
            fontWeight: 500,
            marginBottom: 'var(--space-6)',
            color: 'var(--fg)',
          }}
        >
          {isEditMode ? 'Edit BJJ Workout' : 'Log BJJ Workout'}
        </h1>

        {mutationError && (
          <div
            ref={rootErrorRef}
            role="alert"
            aria-live="assertive"
            tabIndex={-1}
            style={{
              marginBottom: 'var(--space-4)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--danger)',
              backgroundColor: 'color-mix(in oklab, var(--danger) 10%, transparent)',
              padding: 'var(--space-4)',
              color: 'var(--danger)',
              fontSize: 'var(--text-sm)',
              outline: 'none',
            }}
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
          {/* Title */}
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Morning BJJ" {...field} disabled={isPending} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Date & Time */}
          <FormField
            control={form.control}
            name="performedAt"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date &amp; Time</FormLabel>
                <FormControl>
                  <Input type="datetime-local" {...field} disabled={isPending} />
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
                    disabled={isPending}
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
                <FormLabel>Notes (optional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="General session notes…"
                    {...field}
                    value={field.value ?? ''}
                    disabled={isPending}
                  />
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
                    disabled={isPending}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Sections */}
          <fieldset className="space-y-4">
            <legend className="text-lg font-medium">Sections</legend>
            {fields.map((field, index) => (
              <BJJSectionEditor
                key={field.id}
                index={index}
                control={form.control}
                onRemove={() => remove(index)}
                removeDisabled={fields.length === 1}
                isPending={isPending}
              />
            ))}

            {form.formState.errors.sections?.root?.message && (
              <p className="text-sm text-destructive">
                {form.formState.errors.sections.root.message}
              </p>
            )}
            {typeof form.formState.errors.sections?.message === 'string' && (
              <p className="text-sm text-destructive">{form.formState.errors.sections.message}</p>
            )}

            <Button
              type="button"
              variant="outline"
              onClick={() =>
                append({
                  goal: '',
                  rawDescription: '',
                  durationMinutes: undefined,
                  techniqueIds: [],
                  rolls: [],
                })
              }
              disabled={isPending || fields.length >= 10}
            >
              + Add Section
            </Button>
          </fieldset>

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving…' : 'Save'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void navigate(isEditMode && id ? `/workouts/${id}` : '/workouts')}
              disabled={isPending}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Form>
      </div>
    </MaterialScope>
  )
}