import { useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { bjjWorkoutSchema, type BJJWorkoutFormValues } from '../bjj.schema'
import { createBjjWorkoutFormExampleValues } from '../bjjWorkoutFormExamples'
import { useCreateBJJWorkout } from '../hooks/useBJJWorkoutMutations'
import { useUpdateBJJWorkout } from '../hooks/useUpdateBJJWorkout'
import { useConfirmRolls } from '../hooks/useConfirmRolls'
import { useWorkout } from '@/features/workouts/hooks/useWorkouts'
import { useBJJSections } from '../hooks/useBJJSections'
import { BJJSectionEditor } from '../components/BJJSectionEditor'
import { MaterialScope } from '@/components/MaterialScope'
import { Form } from '@/components/ui/form'
import type { BJJSection } from '../bjj.types'
import { BJJFormStepper } from '../components/form/BJJFormStepper'
import { BJJFormSummarySidebar } from '../components/form/BJJFormSummarySidebar'
import { BJJFormActionBar } from '../components/form/BJJFormActionBar'
import { MatFormField } from '../components/form/MatFormField'
import { FormAlert } from '../components/form/FormAlert'
import { useBJJFormProgress } from '../components/form/useBJJFormProgress'

const FORM_ID = 'bjj-workout-form'

export function BJJWorkoutFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEditMode = Boolean(id)

  const createMutation = useCreateBJJWorkout()
  const updateMutation = useUpdateBJJWorkout()
  const confirmRollsMutation = useConfirmRolls()
  const isPending =
    createMutation.isPending || updateMutation.isPending || confirmRollsMutation.isPending

  const { data: existingWorkout, isLoading: loadingWorkout } = useWorkout(id ?? '')
  const { data: existingSections } = useBJJSections(id ?? '')

  const form = useForm<BJJWorkoutFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(bjjWorkoutSchema) as any,
    defaultValues: createBjjWorkoutFormExampleValues(),
  })

  const { fields, append, remove } = useFieldArray({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    control: form.control as any,
    name: 'sections',
  })

  const watched = form.watch()
  const mutationError =
    (createMutation.error as { error?: { message?: string } } | null)?.error?.message ??
    (updateMutation.error as { error?: { message?: string } } | null)?.error?.message ??
    (confirmRollsMutation.error as { message?: string } | null)?.message

  const progress = useBJJFormProgress(form.watch, mutationError ?? null)

  const hasPrefilledRef = useRef(false)
  useEffect(() => {
    if (isEditMode && existingWorkout && existingSections && !hasPrefilledRef.current) {
      hasPrefilledRef.current = true
      const mappedSections = existingSections.map((section: BJJSection) => ({
        id: section.id,
        goal: section.goal,
        rawDescription: section.rawDescription ?? '',
        enhancedNotes: section.enhancedNotes ?? section.aiDescription ?? '',
        durationMinutes: section.durationMinutes,
        techniqueIds: section.techniques.map((t) => t.id),
        rolls: [],
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
            rawDescription: s.rawDescription,
            durationMinutes: s.durationMinutes,
            enhancedNotes: s.enhancedNotes,
          })),
        })
        workoutId = id
      } else {
        workoutId = await createMutation.mutateAsync(values)
      }

      const sectionsWithRolls = values.sections
        .map((section, index) => ({
          sectionNumber: index + 1,
          rolls: section.rolls ?? [],
        }))
        .filter((section) => section.rolls.length > 0)

      if (sectionsWithRolls.length > 0) {
        await confirmRollsMutation.mutateAsync({
          workoutId,
          sections: sectionsWithRolls,
        })
      }

      void navigate(`/workouts/${workoutId}`)
    } catch (error) {
      console.error('Save failed:', error)
    }
  }

  const rootErrorRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (rootErrorRef.current && mutationError) {
      rootErrorRef.current.focus()
    }
  }, [mutationError])

  const durationLabel =
    Number.isFinite(watched.durationMinutes) && watched.durationMinutes > 0
      ? `${watched.durationMinutes} min`
      : '—'
  const rpeLabel = watched.rpe != null ? `${watched.rpe} / 10` : '—'

  function handleCancel() {
    void navigate(isEditMode && id ? `/workouts/${id}` : '/workouts')
  }

  if (isEditMode && loadingWorkout) {
    return (
      <MaterialScope>
        <div className="bjj-form">
          <div className="shell">
            <div role="status" aria-label="Loading workout" className="form-page-head">
              <div
                className="card"
                style={{ height: 240, background: 'var(--surface-warm)' }}
                aria-hidden="true"
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
          <span className="form-eyebrow">
            {isEditMode ? 'Edit · workout' : 'Log · new workout'}
          </span>
          <h1 className="form-page-title">
            {isEditMode ? 'Edit BJJ workout' : 'Log your BJJ workout'}
          </h1>
          <p className="form-page-sub">
            Record session details, link techniques per section, and confirm AI-proposed rolls.
            Confirmed rolls feed your evolution dashboard.
          </p>
          <BJJFormStepper steps={progress.steps} />
        </header>

        {mutationError ? (
          <div ref={rootErrorRef} tabIndex={-1} aria-live="assertive">
            <FormAlert tone="error">{mutationError}</FormAlert>
          </div>
        ) : null}

        <Form {...form}>
          <form
            id={FORM_ID}
            className="form-grid"
            onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}
            noValidate
          >
            <div className="form-col">
              <section className="card" id="cardSession" aria-labelledby="hSession">
                <div className="card-head">
                  <h2 id="hSession">Session details</h2>
                  <span className="tag">Step 1</span>
                </div>

                <MatFormField
                  control={form.control}
                  name="title"
                  label="Title"
                  required
                  disabled={isPending}
                  render={({ id, field, 'aria-invalid': invalid, 'aria-required': requiredMark, 'aria-describedby': describedBy, disabled }) => (
                    <input
                      id={id}
                      className="input"
                      placeholder="e.g. Morning BJJ"
                      aria-invalid={invalid}
                      aria-required={requiredMark}
                      aria-describedby={describedBy}
                      disabled={disabled}
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                    />
                  )}
                />

                <div className="grid-2" style={{ marginTop: 'var(--space-5)' }}>
                  <MatFormField
                    control={form.control}
                    name="performedAt"
                    label="Date & time"
                    required
                    disabled={isPending}
                    render={({ id, field, 'aria-invalid': invalid, 'aria-required': requiredMark, 'aria-describedby': describedBy, disabled }) => (
                      <input
                        id={id}
                        type="datetime-local"
                        className="input"
                        aria-invalid={invalid}
                        aria-required={requiredMark}
                        aria-describedby={describedBy}
                        disabled={disabled}
                        value={field.value ?? ''}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    )}
                  />
                  <MatFormField
                    control={form.control}
                    name="durationMinutes"
                    label="Duration (minutes)"
                    required
                    hint="Between 1 and 300 minutes."
                    disabled={isPending}
                    render={({ id, field, 'aria-invalid': invalid, 'aria-describedby': describedBy, disabled }) => (
                      <input
                        id={id}
                        type="number"
                        min={1}
                        max={300}
                        className="input"
                        aria-invalid={invalid}
                        aria-describedby={describedBy}
                        disabled={disabled}
                        value={field.value ?? ''}
                        onChange={(e) => {
                          const val = e.target.value
                          field.onChange(val === '' ? undefined : Number(val))
                        }}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    )}
                  />
                </div>

                <div className="grid-2" style={{ marginTop: 'var(--space-5)' }}>
                  <MatFormField
                    control={form.control}
                    name="rpe"
                    label="RPE (1–10, optional)"
                    disabled={isPending}
                    render={({ id, field, 'aria-invalid': invalid, 'aria-describedby': describedBy, disabled }) => (
                      <input
                        id={id}
                        type="number"
                        min={1}
                        max={10}
                        className="input"
                        placeholder="e.g. 7"
                        aria-invalid={invalid}
                        aria-describedby={describedBy}
                        disabled={disabled}
                        value={field.value ?? ''}
                        onChange={(e) => {
                          const val = e.target.value
                          field.onChange(val === '' ? undefined : Number(val))
                        }}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    )}
                  />
                </div>

                <MatFormField
                  control={form.control}
                  name="notes"
                  label="Session notes (optional)"
                  hint="General notes for the whole session."
                  disabled={isPending}
                  className=""
                  render={({ id, field, 'aria-invalid': invalid, 'aria-describedby': describedBy, disabled }) => (
                    <textarea
                      id={id}
                      className="textarea"
                      placeholder="How did the session go overall?"
                      aria-invalid={invalid}
                      aria-describedby={describedBy}
                      disabled={disabled}
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                    />
                  )}
                />
              </section>

              <section className="card" id="cardSections" aria-labelledby="hSections">
                <div className="card-head">
                  <h2 id="hSections">Training sections</h2>
                  <span className="tag">Step 2</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
                  {fields.map((field, index) => (
                    <BJJSectionEditor
                      key={field.id}
                      index={index}
                      control={form.control}
                      onRemove={() => remove(index)}
                      removeDisabled={fields.length === 1}
                      isPending={isPending}
                      rollAnchorId={index === 0 ? 'cardRolls' : undefined}
                    />
                  ))}
                </div>

                {(form.formState.errors.sections?.root?.message ||
                  typeof form.formState.errors.sections?.message === 'string') && (
                  <FormAlert tone="error" style={{ marginTop: 'var(--space-4)' }}>
                    {form.formState.errors.sections?.root?.message ??
                      form.formState.errors.sections?.message}
                  </FormAlert>
                )}

                <button
                  type="button"
                  className="btn"
                  style={{ marginTop: 'var(--space-5)' }}
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
                  + Add section
                </button>
              </section>

              <section className="card" id="cardReview" aria-labelledby="hReview">
                <div className="card-head">
                  <h2 id="hReview">Review</h2>
                  <span className="tag">Step 4</span>
                </div>
                <p className="hint" style={{ fontSize: 'var(--text-sm)', color: 'var(--fg-2)' }}>
                  When every section has a goal and roll positions are valid, save from the action
                  bar below. AI-enhanced notes and confirmed rolls persist to your dashboard
                  metrics.
                </p>
                <div className="banner" style={{ marginTop: 'var(--space-5)' }}>
                  <svg
                    viewBox="0 0 20 20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    aria-hidden="true"
                  >
                    <circle cx="10" cy="10" r="8" />
                    <path d="M10 9v5M10 6.5h0" strokeLinecap="round" />
                  </svg>
                  <span>
                    <strong>{progress.sectionCount}</strong> section
                    {progress.sectionCount === 1 ? '' : 's'},{' '}
                    <strong>{progress.techniqueCount}</strong> linked technique
                    {progress.techniqueCount === 1 ? '' : 's'},{' '}
                    <strong>{progress.totalRolls}</strong> roll draft
                    {progress.totalRolls === 1 ? '' : 's'} pending save.
                  </span>
                </div>
              </section>
            </div>

            <BJJFormSummarySidebar
              progress={progress}
              durationLabel={durationLabel}
              rpeLabel={rpeLabel}
            />
          </form>
        </Form>
        </div>

        <BJJFormActionBar
          progress={progress}
          isPending={isPending}
          formId={FORM_ID}
          onCancel={handleCancel}
        />
      </div>
    </MaterialScope>
  )
}
