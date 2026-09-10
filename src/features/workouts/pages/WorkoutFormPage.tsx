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
import { MaterialScope } from '@/components/MaterialScope'
import type { PublicWodFormFields } from '@/features/public-wods'
import type { WodFormat } from '../registry/types'

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

  const [aiPreview, setAiPreview] = useState<string | null>(null)
  const [aiError, setAiError] = useState<string | null>(null)
  const enhanceInFlightRef = useRef(false)

  const { enhance, isPending: isAIPending } = useWorkoutNotesAI()

  const notesValue = form.watch('notes')
  const aiWasAppliedRef = useRef(false)

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

  useEffect(() => {
    const prefill = (location.state as { prefill?: WorkoutFormValues } | null)?.prefill
    if (!isEdit && prefill) {
      form.reset(prefill)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // run once on mount only

  async function onSubmit(values: WorkoutFormValues) {
    // Guard against NaN from empty number inputs
    const safe = {
      ...values,
      durationMinutes: Number.isNaN(values.durationMinutes) ? undefined : values.durationMinutes,
      rpe: Number.isNaN(values.rpe) ? undefined : values.rpe,
    }

    if (safe.wodFormat) {
      try {
        const handler = getFormat(safe.wodFormat as WodFormat)
        const result = handler.schema.safeParse(safe.payload)
        if (!result.success) {
          console.error('Zod validation errors:', JSON.stringify(result.error.issues, null, 2))
          console.error('Payload being validated:', JSON.stringify(safe.payload, null, 2))
          form.setError('root', { message: 'WOD payload is invalid' })
          return
        }
      } catch (e) {
        console.error('Schema validation threw:', e)
        form.setError('root', { message: 'WOD payload is invalid' })
        return
      }
    }

    const submissionValues = {
      ...safe,
      enhancedNotes: aiWasAppliedRef.current ? form.getValues('notes') : safe.enhancedNotes,
    } as WorkoutFormValues

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
      <MaterialScope>
        <div className="bjj-form">
          <div className="shell">
            <div role="status" aria-label="Loading workout" style={{ padding: 'var(--space-8) 0' }}>
              <div
                style={{
                  height: 32,
                  width: 192,
                  background: 'var(--surface-warm)',
                  borderRadius: 'var(--radius-md)',
                }}
              />
            </div>
          </div>
        </div>
      </MaterialScope>
    )
  }

  return (
    <MaterialScope>
      <div className="bjj-form">
        <div className="shell">
          <header className="form-page-head">
            <h1 className="form-page-title">{isEdit ? 'Edit Workout' : 'Log Workout'}</h1>
            {!isEdit && (
              <button type="button" className="btn" onClick={() => setPickerOpen(true)}>
                Load Workout
              </button>
            )}
          </header>

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
              className="banner error"
              style={{ marginBottom: 'var(--space-5)' }}
            >
              <svg
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                aria-hidden="true"
              >
                <circle cx="10" cy="10" r="8" />
                <path d="M10 8v2.5M10 12.8h0" strokeLinecap="round" />
              </svg>
              <span>{mutationError ?? rootError}</span>
            </div>
          )}

          <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} noValidate>
            <div
              className="form-col"
              style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}
            >
              {/* Session Details */}
              <section className="card" aria-labelledby="hSession">
                <div className="card-head">
                  <h2
                    id="hSession"
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 'var(--text-lg)',
                      fontWeight: 500,
                      margin: 0,
                    }}
                  >
                    Session Details
                  </h2>
                </div>

                {/* Title */}
                <div className="field" style={{ marginBottom: 'var(--space-4)' }}>
                  <label className="label" htmlFor="field-title">
                    Title
                  </label>
                  <input
                    id="field-title"
                    className="input"
                    placeholder="e.g. Morning WOD"
                    {...form.register('title')}
                    aria-invalid={!!form.formState.errors.title}
                    aria-describedby={form.formState.errors.title ? 'err-title' : undefined}
                  />
                  {form.formState.errors.title && (
                    <p id="err-title" className="field-error" role="alert">
                      <svg
                        viewBox="0 0 16 16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        aria-hidden="true"
                      >
                        <circle cx="8" cy="8" r="6.4" />
                        <path d="M8 5v3.5M8 10.5h0" strokeLinecap="round" />
                      </svg>
                      <span>{form.formState.errors.title.message}</span>
                    </p>
                  )}
                </div>

                {/* Type */}
                <div className="field" style={{ marginBottom: 'var(--space-4)' }}>
                  <label className="label" htmlFor="field-type">
                    Type
                  </label>
                  <select id="field-type" className="select" {...form.register('type')}>
                    <option value="crossfit">CrossFit</option>
                    <option value="functional">Functional</option>
                  </select>
                </div>

                {/* Date + Duration */}
                <div className="grid-2" style={{ marginBottom: 'var(--space-4)' }}>
                  <div className="field">
                    <label className="label" htmlFor="field-performedAt">
                      Date &amp; Time
                    </label>
                    <input
                      id="field-performedAt"
                      type="datetime-local"
                      className="input"
                      {...form.register('performedAt')}
                      aria-invalid={!!form.formState.errors.performedAt}
                      aria-describedby={
                        form.formState.errors.performedAt ? 'err-performedAt' : undefined
                      }
                    />
                    {form.formState.errors.performedAt && (
                      <p id="err-performedAt" className="field-error" role="alert">
                        <svg
                          viewBox="0 0 16 16"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          aria-hidden="true"
                        >
                          <circle cx="8" cy="8" r="6.4" />
                          <path d="M8 5v3.5M8 10.5h0" strokeLinecap="round" />
                        </svg>
                        <span>{form.formState.errors.performedAt.message}</span>
                      </p>
                    )}
                  </div>

                  <div className="field">
                    <label className="label" htmlFor="field-durationMinutes">
                      Duration (minutes)
                    </label>
                    <input
                      id="field-durationMinutes"
                      type="number"
                      min={1}
                      max={300}
                      className="input"
                      {...form.register('durationMinutes', {
                        setValueAs: (v) => (v === '' ? undefined : Number(v)),
                      })}
                      aria-invalid={!!form.formState.errors.durationMinutes}
                      aria-describedby={
                        form.formState.errors.durationMinutes ? 'err-durationMinutes' : undefined
                      }
                    />
                    {form.formState.errors.durationMinutes && (
                      <p id="err-durationMinutes" className="field-error" role="alert">
                        <svg
                          viewBox="0 0 16 16"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          aria-hidden="true"
                        >
                          <circle cx="8" cy="8" r="6.4" />
                          <path d="M8 5v3.5M8 10.5h0" strokeLinecap="round" />
                        </svg>
                        <span>{form.formState.errors.durationMinutes.message}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* RPE */}
                <div className="field">
                  <label className="label" htmlFor="field-rpe">
                    RPE (1–10, optional)
                  </label>
                  <input
                    id="field-rpe"
                    type="number"
                    min={1}
                    max={10}
                    className="input"
                    placeholder="e.g. 7"
                    {...form.register('rpe', {
                      setValueAs: (v) => (v === '' ? undefined : Number(v)),
                    })}
                    aria-invalid={!!form.formState.errors.rpe}
                    aria-describedby={form.formState.errors.rpe ? 'err-rpe' : undefined}
                  />
                  {form.formState.errors.rpe && (
                    <p id="err-rpe" className="field-error" role="alert">
                      <svg
                        viewBox="0 0 16 16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        aria-hidden="true"
                      >
                        <circle cx="8" cy="8" r="6.4" />
                        <path d="M8 5v3.5M8 10.5h0" strokeLinecap="round" />
                      </svg>
                      <span>{form.formState.errors.rpe.message}</span>
                    </p>
                  )}
                </div>
              </section>

              {/* WOD */}
              <section className="card" aria-labelledby="hWod">
                <div className="card-head">
                  <h2
                    id="hWod"
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 'var(--text-lg)',
                      fontWeight: 500,
                      margin: 0,
                    }}
                  >
                    WOD
                  </h2>
                </div>

                {/* WOD Format */}
                <div className="field" style={{ marginBottom: 'var(--space-4)' }}>
                  <label className="label" htmlFor="wod-format-select">
                    WOD Format
                  </label>
                  <WodFormatSelector
                    value={wodFormat ?? ''}
                    onChange={(format) => {
                      form.setValue('wodFormat', format === '' ? undefined : (format as WodFormat))
                      form.setValue('payload', undefined)
                    }}
                    disabled={isPending}
                  />
                  {form.formState.errors.wodFormat && (
                    <p className="field-error" role="alert">
                      <svg
                        viewBox="0 0 16 16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        aria-hidden="true"
                      >
                        <circle cx="8" cy="8" r="6.4" />
                        <path d="M8 5v3.5M8 10.5h0" strokeLinecap="round" />
                      </svg>
                      <span>{form.formState.errors.wodFormat.message as string}</span>
                    </p>
                  )}
                </div>

                {/* Dynamic WOD Format Section */}
                {wodFormat &&
                  (() => {
                    try {
                      const handler = getFormat(wodFormat as WodFormat)
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      const control = form.control as any
                      return (
                        <handler.FormSection
                          control={control}
                          name="payload"
                          disabled={isPending}
                        />
                      )
                    } catch {
                      return null
                    }
                  })()}

                {/* WOD Text */}
                <div className="field" style={{ marginTop: 'var(--space-4)' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 6,
                    }}
                  >
                    <label className="label" htmlFor="field-wodText">
                      WOD Text
                    </label>
                  </div>
                  <textarea
                    id="field-wodText"
                    className="textarea"
                    placeholder="Describe the workout in detail…"
                    rows={6}
                    maxLength={5000}
                    {...form.register('wodText')}
                    aria-invalid={!!form.formState.errors.wodText}
                    aria-describedby={
                      form.formState.errors.wodText ? 'err-wodText' : 'count-wodText'
                    }
                  />
                  <div className="field-foot">
                    <span
                      id="count-wodText"
                      className="count"
                      aria-live="polite"
                      data-near-limit={
                        (form.getValues('wodText') ?? '').length >= 4950 ? 'true' : 'false'
                      }
                    >
                      {(form.getValues('wodText') ?? '').length} / 5000
                    </span>
                  </div>
                  {form.formState.errors.wodText && (
                    <p id="err-wodText" className="field-error" role="alert">
                      <svg
                        viewBox="0 0 16 16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        aria-hidden="true"
                      >
                        <circle cx="8" cy="8" r="6.4" />
                        <path d="M8 5v3.5M8 10.5h0" strokeLinecap="round" />
                      </svg>
                      <span>{form.formState.errors.wodText.message as string}</span>
                    </p>
                  )}
                </div>
              </section>

              {/* Notes */}
              <section className="card" aria-labelledby="hNotes">
                <div className="card-head">
                  <h2
                    id="hNotes"
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 'var(--text-lg)',
                      fontWeight: 500,
                      margin: 0,
                    }}
                  >
                    Notes
                  </h2>
                </div>

                <div className="field">
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 6,
                    }}
                  >
                    <label className="label" htmlFor="field-notes">
                      Notes
                    </label>
                    {(notesValue ?? '').trim().length > 0 && (
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={handleAIEnhance}
                        disabled={isAIPending || isPending}
                      >
                        {isAIPending ? 'Enhancing…' : '✦ Enhance with AI'}
                      </button>
                    )}
                  </div>

                  <textarea
                    id="field-notes"
                    className="textarea"
                    placeholder="How did it go?"
                    {...form.register('notes')}
                    aria-invalid={!!form.formState.errors.notes}
                    aria-describedby={form.formState.errors.notes ? 'err-notes' : undefined}
                  />
                  {form.formState.errors.notes && (
                    <p id="err-notes" className="field-error" role="alert">
                      <svg
                        viewBox="0 0 16 16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        aria-hidden="true"
                      >
                        <circle cx="8" cy="8" r="6.4" />
                        <path d="M8 5v3.5M8 10.5h0" strokeLinecap="round" />
                      </svg>
                      <span>{form.formState.errors.notes.message as string}</span>
                    </p>
                  )}
                  {aiError && (
                    <div className="banner error" style={{ marginTop: 'var(--space-3)' }}>
                      <svg
                        viewBox="0 0 20 20"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        aria-hidden="true"
                      >
                        <circle cx="10" cy="10" r="8" />
                        <path d="M10 8v2.5M10 12.8h0" strokeLinecap="round" />
                      </svg>
                      <span>{aiError}</span>
                    </div>
                  )}
                  {aiPreview && !aiError && (
                    <AINotesPreviewPanel
                      enhanced_notes={aiPreview}
                      onApply={handleAIApply}
                      onDiscard={handleAIDiscard}
                    />
                  )}
                </div>
              </section>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 'var(--space-3)', paddingTop: 'var(--space-6)' }}>
              <button type="submit" className="btn btn-primary" disabled={isPending}>
                {isPending ? 'Saving…' : 'Save'}
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => void navigate(isEdit && id ? `/workouts/${id}` : '/workouts')}
                disabled={isPending}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </MaterialScope>
  )
}
