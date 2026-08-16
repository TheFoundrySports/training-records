import { useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { bjjWorkoutSchema, type BJJWorkoutFormValues } from '../bjj.schema'
import { createBjjWorkoutFormExampleValues } from '../bjjWorkoutFormExamples'
import { useCreateBJJWorkout } from '../hooks/useBJJWorkoutMutations'
import { useUpdateBJJWorkout } from '../hooks/useUpdateBJJWorkout'
import { useConfirmRolls } from '../hooks/useConfirmRolls'
import { useBJJWorkoutDraft } from '../hooks/useBJJWorkoutDraft'
import { useWorkout } from '@/features/workouts/hooks/useWorkouts'
import { useBJJSections } from '../hooks/useBJJSections'
import { useAuth } from '@/features/auth/AuthContext'
import { BJJSectionEditor } from '../components/BJJSectionEditor'
import { MaterialScope } from '@/components/MaterialScope'
import { Form } from '@/components/ui/form'
import type { BJJSection } from '../bjj.types'
import { BJJFormStepper } from '../components/form/BJJFormStepper'
import { BJJFormSummarySidebar } from '../components/form/BJJFormSummarySidebar'
import { BJJFormActionBar } from '../components/form/BJJFormActionBar'
import { BJJFormRollsCard } from '../components/form/BJJFormRollsCard'
import { BJJSessionIntensityField } from '../components/form/BJJSessionIntensityField'
import { MatFormField } from '../components/form/MatFormField'
import { FormAlert } from '../components/form/FormAlert'
import { useBJJFormProgress } from '../components/form/useBJJFormProgress'
import { BJJ_SESSION_NOTES_MAX, BJJ_SESSION_NOTES_SOFT_MAX } from '../bjj.schema'

const FORM_ID = 'bjj-workout-form'

export function BJJWorkoutFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEditMode = Boolean(id)
  const { user } = useAuth()

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

  const {
    pendingRestore,
    draftFeedback,
    restoreDraft,
    discardDraft,
    saveDraft,
    clearSavedDraft,
  } = useBJJWorkoutDraft({
    userId: user?.id,
    enabled: !isEditMode,
    getValues: form.getValues,
    reset: form.reset,
  })

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

      clearSavedDraft()
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

  function formatDraftSavedAt(iso: string): string {
    const date = new Date(iso)
    if (Number.isNaN(date.getTime())) return 'earlier'
    return date.toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  }

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

        {!isEditMode && pendingRestore ? (
          <div className="banner warn draft-banner" role="status">
            <svg
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              aria-hidden="true"
            >
              <path d="M10 2.8 18 17H2z" strokeLinejoin="round" />
              <path d="M10 8v3.4M10 13.8h0" strokeLinecap="round" />
            </svg>
            <div className="draft-banner-copy">
              <strong>Saved draft found.</strong> Restore your in-progress workout from{' '}
              {formatDraftSavedAt(pendingRestore.savedAt)}?
            </div>
            <div className="draft-banner-actions">
              <button type="button" className="btn btn-sm" onClick={restoreDraft} disabled={isPending}>
                Restore draft
              </button>
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={discardDraft}
                disabled={isPending}
              >
                Discard
              </button>
            </div>
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

                <BJJSessionIntensityField control={form.control} disabled={isPending} />
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
                      hideRollReview
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

              <section className="card" id="cardRolls" aria-labelledby="hRolls">
                <div className="card-head">
                  <h2 id="hRolls">Roll review</h2>
                  <span className="tag">Step 3</span>
                </div>
                <BJJFormRollsCard />
              </section>

              <section className="card" id="cardReview" aria-labelledby="hReview">
                <div className="card-head">
                  <h2 id="hReview">Review</h2>
                  <span className="tag">Step 4</span>
                </div>
                <p className="hint" style={{ fontSize: 'var(--text-sm)', color: 'var(--fg-2)' }}>
                  {progress.progressPct === 100
                    ? 'Everything checks out — add optional session notes, then save from the action bar.'
                    : 'When every section has a goal and roll positions are valid, save from the action bar below.'}
                </p>
                <div style={{ marginTop: 'var(--space-5)' }}>
                <MatFormField
                  control={form.control}
                  name="notes"
                  label="Session notes (optional)"
                  hint="General notes for the whole session."
                  disabled={isPending}
                  render={({ id, field, 'aria-invalid': invalid, 'aria-describedby': describedBy, disabled }) => {
                    const noteLength = (field.value ?? '').length

                    return (
                      <>
                        <textarea
                          id={id}
                          className="textarea"
                          placeholder="How did the session go overall?"
                          aria-invalid={invalid}
                          aria-describedby={describedBy}
                          disabled={disabled}
                          maxLength={BJJ_SESSION_NOTES_MAX}
                          value={field.value ?? ''}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                        />
                        <div className="field-foot">
                          <span
                            className="count"
                            aria-live="polite"
                            data-near-limit={noteLength >= BJJ_SESSION_NOTES_SOFT_MAX - 50 ? 'true' : 'false'}
                          >
                            {noteLength} / {BJJ_SESSION_NOTES_SOFT_MAX}
                          </span>
                        </div>
                      </>
                    )
                  }}
                />
                </div>
                <div
                  className={progress.progressPct === 100 ? 'banner ok' : 'banner'}
                  style={{ marginTop: 'var(--space-5)' }}
                >
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
                    {progress.totalRolls === 1 ? '' : 's'}
                    {progress.totalRolls > 0
                      ? ` (${progress.confirmedRolls} of ${progress.totalRolls} confirmed)`
                      : ''}{' '}
                    pending save.
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
          showSaveDraft={!isEditMode}
          onSaveDraft={saveDraft}
          draftFeedback={draftFeedback}
        />
      </div>
    </MaterialScope>
  )
}
