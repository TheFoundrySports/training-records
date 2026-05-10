import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { workoutSchema, type WorkoutFormValues } from '../workout.schema'
import { useWorkout } from '../hooks/useWorkouts'
import { useCreateWorkout, useUpdateWorkout } from '../hooks/useWorkoutMutations'
import { useWorkoutNotesAI } from '../hooks/useWorkoutNotesAI'
import { getFormat } from '../registry/index'
import { WodFormatSelector } from '../components/WodFormatSelector'
import { PublicWodPickerModal } from '../components/PublicWodPickerModal'
import { AINotesPreviewPanel } from '../components/AINotesPreviewPanel'
import type { PublicWodFormFields } from '@/features/public-wods'
import type { WodFormat } from '../registry/types'
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
  const location = useLocation()
  const isEdit = Boolean(id)

  const { data: existing, isLoading: loadingExisting } = useWorkout(id ?? '')

  const createMutation = useCreateWorkout()
  const updateMutation = useUpdateWorkout()

  const isPending = createMutation.isPending || updateMutation.isPending

  const [pickerOpen, setPickerOpen] = useState(false)

  const form = useForm<WorkoutFormValues>({
    resolver: zodResolver(workoutSchema),
    defaultValues: {
      title: '',
      type: 'crossfit',
      // datetime-local input format (normalizeDateTime handles conversion to ISO8601)
      performedAt: new Date().toISOString().slice(0, 16),
      durationMinutes: 30,
      notes: '',
      enhancedNotes: undefined,
      rpe: undefined,
      wodText: '',
      wodFormat: undefined,
      payload: undefined,
    },
  })

  const mutationError =
    (createMutation.error as { error?: { message?: string } } | null)?.error?.message ??
    (updateMutation.error as { error?: { message?: string } } | null)?.error?.message

  const rootError = form.formState.errors.root?.message

  const rootErrorRef = useRef<HTMLDivElement>(null)

  // AI Enhance state
  const [aiPreview, setAiPreview] = useState<string | null>(null)
  const [aiError, setAiError] = useState<string | null>(null)
  /** Blocks a second click before React re-renders with `isAIPending`. */
  const enhanceInFlightRef = useRef(false)

  const { enhance, isPending: isAIPending } = useWorkoutNotesAI()

  const notesValue = form.watch('notes')
  /** Set to true when user clicks "Apply" on the AI preview — cleared on form reset/submit */
  const aiWasAppliedRef = useRef(false)

  // Focus error summary on submit failure
  useEffect(() => {
    if (rootErrorRef.current && (mutationError ?? rootError)) {
      rootErrorRef.current.focus()
    }
  }, [mutationError, rootError])

  function handleAIEnhance() {
    const notes = notesValue ?? ''
    if (!notes.trim() || enhanceInFlightRef.current || isAIPending) return

    enhanceInFlightRef.current = true
    setAiError(null)
    enhance(
      { notes },
      {
        onSuccess: (result) => {
          setAiPreview(result.enhanced_notes)
        },
        onError: (err) => {
          const message = err instanceof Error ? err.message : 'AI enhancement failed'
          setAiError(message)
        },
        onSettled: () => {
          enhanceInFlightRef.current = false
        },
      },
    )
  }

  function handleAIApply(enhancedNotes: string) {
    // Store enhanced notes separately — original notes are preserved
    form.setValue('enhancedNotes', enhancedNotes, { shouldValidate: true })
    aiWasAppliedRef.current = true
    setAiPreview(null)
  }

  function handleAIDiscard() {
    setAiPreview(null)
  }

  function handlePublicWodSelect(fields: PublicWodFormFields) {
    form.reset({
      ...form.getValues(),
      title: fields.title,
      type: fields.type,
      wodFormat: (fields.wodFormat ?? undefined) as WodFormat | undefined,
      wodText: fields.wodText ?? '',
      ...(fields.durationMinutes != null ? { durationMinutes: fields.durationMinutes } : {}),
      payload: (fields.payload ?? undefined) as WorkoutFormValues['payload'],
    })
  }

  const wodFormat = form.watch('wodFormat')

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
        wodText: existing.wodText ?? '',
        wodFormat: existing.wodFormat as WodFormat | undefined,
        payload: existing.payload ?? undefined,
      })
    }
  }, [isEdit, existing, form])

  // Pre-fill form from AI navigation state (create mode only)
  useEffect(() => {
    const prefill = (location.state as { prefill?: WorkoutFormValues } | null)?.prefill
    if (!isEdit && prefill) {
      form.reset(prefill)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // run once on mount only — location.state is stable

  async function onSubmit(values: WorkoutFormValues) {
    // Validate WOD payload if a format is selected
    if (values.wodFormat) {
      try {
        const handler = getFormat(values.wodFormat as WodFormat)
        const result = handler.schema.safeParse(values.payload)
        if (!result.success) {
          console.error('Zod validation errors:', JSON.stringify(result.error.issues, null, 2))
          console.error('Payload being validated:', JSON.stringify(values.payload, null, 2))
          form.setError('root', { message: 'WOD payload is invalid' })
          return
        }
      } catch (e) {
        console.error('Schema validation threw:', e)
        form.setError('root', { message: 'WOD payload is invalid' })
        return
      }
    }

    // Include enhanced notes in submission if user applied AI enhancement
    const submissionValues: WorkoutFormValues = {
      ...values,
      enhancedNotes: aiWasAppliedRef.current ? form.getValues('notes') : values.enhancedNotes,
    }

    if (isEdit && id) {
      await updateMutation.mutateAsync({ id, data: submissionValues })
      void navigate(`/workouts/${id}`)
    } else {
      await createMutation.mutateAsync(submissionValues)
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

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">{isEdit ? 'Edit Workout' : 'Log Workout'}</h1>
        {!isEdit && (
          <Button type="button" variant="outline" onClick={() => setPickerOpen(true)}>
            Load Workout
          </Button>
        )}
      </div>

      <PublicWodPickerModal
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={handlePublicWodSelect}
      />

      {(mutationError ?? rootError) && (
        <div
          ref={rootErrorRef}
          role="alert"
          aria-live="assertive"
          tabIndex={-1}
          className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-destructive text-sm outline-none"
        >
          {mutationError ?? rootError}
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

          {/* WOD Format */}
          <FormField
            control={form.control}
            name="wodFormat"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <WodFormatSelector
                    value={field.value ?? ''}
                    onChange={(format) => {
                      field.onChange(format === '' ? undefined : format)
                      // Clear payload when format changes
                      form.setValue('payload', undefined)
                    }}
                    disabled={isPending}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Dynamic WOD Format Section */}
          {wodFormat &&
            (() => {
              try {
                const handler = getFormat(wodFormat as WodFormat)
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const control = form.control as any
                return <handler.FormSection control={control} name="payload" disabled={isPending} />
              } catch {
                return null
              }
            })()}

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
                <div className="flex items-center justify-between">
                  <FormLabel>Notes</FormLabel>
                  {(notesValue ?? '').trim().length > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAIEnhance}
                      disabled={isAIPending || isPending}
                      className="h-7 text-xs"
                    >
                      {isAIPending ? 'Enhancing…' : '✦ Enhance with AI'}
                    </Button>
                  )}
                </div>
                <FormControl>
                  <Textarea placeholder="How did it go?" {...field} />
                </FormControl>
                <FormMessage />
                {aiError && (
                  <p className="text-sm text-destructive rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 mt-1">
                    {aiError}
                  </p>
                )}
                {aiPreview && !aiError && (
                  <AINotesPreviewPanel
                    enhanced_notes={aiPreview}
                    onApply={handleAIApply}
                    onDiscard={handleAIDiscard}
                  />
                )}
              </FormItem>
            )}
          />

          {/* WOD Text */}
          <FormField
            control={form.control}
            name="wodText"
            render={({ field }) => (
              <FormItem>
                <FormLabel>WOD Text</FormLabel>
                <FormControl>
                  <Textarea placeholder="Describe the workout in detail…" rows={6} {...field} />
                </FormControl>
                <p className="text-xs text-muted-foreground text-right">
                  {(field.value ?? '').length} / 5000
                </p>
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
