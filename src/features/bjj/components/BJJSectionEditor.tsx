import { useState, useRef } from 'react'
import { useWatch, useFormContext, type Control } from 'react-hook-form'
import { TechniqueSearch } from './TechniqueSearch'
import { AIPreviewPanel } from './AIPreviewPanel'
import { RollReviewPanel } from './RollReviewPanel'
import { useBJJSectionAI } from '../hooks/useBJJSectionAI'
import type { BJJWorkoutFormValues, BJJRollDraft } from '../bjj.schema'
import { confirmRollDraft, confirmRollDrafts, proposalToDraft } from '../bjj.schema'
import { FormAlert } from './form/FormAlert'
import { MatFormField } from './form/MatFormField'

interface AIPreview {
  ai_description: string
  matched_technique_ids: string[]
  rolls: BJJRollDraft[]
}

interface BJJSectionEditorProps {
  index: number
  control: Control<BJJWorkoutFormValues>
  onRemove: () => void
  removeDisabled: boolean
  isPending: boolean
  /** When true, roll review renders in page-level #cardRolls instead. */
  hideRollReview?: boolean
}

export function BJJSectionEditor({
  index,
  control,
  onRemove,
  removeDisabled,
  isPending,
  hideRollReview = false,
}: BJJSectionEditorProps) {
  const [preview, setPreview] = useState<AIPreview | null>(null)
  const [aiError, setAiError] = useState<string | null>(null)
  const [rollsReviewComplete, setRollsReviewComplete] = useState(false)
  const enhanceInFlightRef = useRef(false)

  const { enhance, isPending: isAIPending } = useBJJSectionAI()
  const { setValue } = useFormContext<BJJWorkoutFormValues>()

  const rawDescription = useWatch({ control, name: `sections.${index}.rawDescription` })
  const sectionGoal = useWatch({ control, name: `sections.${index}.goal` })
  const sectionRolls = useWatch({ control, name: `sections.${index}.rolls` }) ?? []

  const hasSectionGoal = (sectionGoal ?? '').trim().length > 0

  function handleEnhance() {
    if (enhanceInFlightRef.current || isAIPending || !hasSectionGoal) return

    enhanceInFlightRef.current = true
    setAiError(null)
    enhance(
      {
        section_goal: sectionGoal ?? '',
        raw_description: rawDescription ?? '',
      },
      {
        onSuccess: (result) => {
          setRollsReviewComplete(false)
          const drafts = result.rolls.map((roll) => proposalToDraft(roll, 'manual'))
          setPreview({
            ...result,
            rolls: drafts,
          })
          setValue(`sections.${index}.rolls`, drafts, { shouldDirty: true })
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

  function handleApply() {
    if (!preview) return
    setValue(`sections.${index}.enhancedNotes`, preview.ai_description)
    if (preview.matched_technique_ids.length > 0) {
      setValue(`sections.${index}.techniqueIds`, preview.matched_technique_ids)
    }
    setPreview(null)
  }

  function handleDiscard() {
    setPreview(null)
  }

  function handleConfirmRoll(rollIndex: number) {
    const currentRolls = preview?.rolls ?? sectionRolls
    const roll = currentRolls[rollIndex]
    if (!roll || roll.validation_error != null) return

    const updatedRolls = currentRolls.map((item, index) =>
      index === rollIndex ? confirmRollDraft(item) : item,
    )

    setValue(`sections.${index}.rolls`, updatedRolls, { shouldDirty: true })
    setRollsReviewComplete(updatedRolls.every((item) => item.reviewConfirmed === true))
    setPreview((prev) => (prev ? { ...prev, rolls: updatedRolls } : null))
  }

  function handleConfirmRolls() {
    const currentRolls = preview?.rolls ?? sectionRolls
    if (currentRolls.length === 0) return
    if (currentRolls.some((roll) => roll.validation_error != null)) return

    const confirmedRolls = confirmRollDrafts(currentRolls)

    setValue(`sections.${index}.rolls`, confirmedRolls, { shouldDirty: true })
    setRollsReviewComplete(confirmedRolls.every((roll) => roll.reviewConfirmed === true))
    setPreview((prev) => (prev ? { ...prev, rolls: confirmedRolls } : null))
  }

  function handleSkipRolls() {
    setValue(`sections.${index}.rolls`, [], { shouldDirty: true })
    setRollsReviewComplete(false)
    setPreview((prev) => (prev ? { ...prev, rolls: [] } : null))
  }

  function handleRollChange(rollIndex: number, updates: Partial<BJJRollDraft>) {
    const currentRolls = preview?.rolls ?? sectionRolls
    if (rollIndex >= currentRolls.length) return

    const updatedRolls: BJJRollDraft[] = currentRolls.map((roll, i) => {
      if (i !== rollIndex) return roll
      return {
        ...roll,
        ...updates,
        reviewConfirmed: false,
        source: updates.source ?? 'ai_edited',
      }
    })

    setRollsReviewComplete(false)
    setPreview((prev) => (prev ? { ...prev, rolls: updatedRolls } : null))
    setValue(`sections.${index}.rolls`, updatedRolls, { shouldDirty: true })
  }

  function handleRollDelete(rollIndex: number) {
    const currentRolls = preview?.rolls ?? sectionRolls
    const updatedRolls = currentRolls.filter((_, i) => i !== rollIndex)

    setRollsReviewComplete(false)
    setPreview((prev) => (prev ? { ...prev, rolls: updatedRolls } : null))
    setValue(`sections.${index}.rolls`, updatedRolls, { shouldDirty: true })
  }

  const activeRolls = preview?.rolls ?? sectionRolls
  const showRollReview = !hideRollReview && activeRolls.length > 0

  return (
    <article
      className="card"
      style={{ padding: 'var(--space-5)', boxShadow: 'var(--elev-ring)' }}
      aria-labelledby={`section-heading-${index}`}
    >
      <div className="card-head" style={{ marginBottom: 'var(--space-4)' }}>
        <h3 id={`section-heading-${index}`} style={{ fontSize: 'var(--text-base)', margin: 0 }}>
          Section {index + 1}
        </h3>
        <button
          type="button"
          className="btn btn-sm btn-danger-text"
          onClick={onRemove}
          disabled={removeDisabled || isPending}
          aria-label={`Remove section ${index + 1}`}
        >
          Remove
        </button>
      </div>

      <MatFormField
        control={control}
        name={`sections.${index}.goal`}
        label="Goal"
        required
        disabled={isPending}
        render={({ id, field, 'aria-invalid': invalid, 'aria-required': requiredMark, 'aria-describedby': describedBy, disabled }) => (
          <input
            id={id}
            className="input"
            placeholder="e.g. Guard passing from half guard"
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
        control={control}
        name={`sections.${index}.rawDescription`}
        label="Notes (optional)"
        disabled={isPending}
        render={({ id, field, 'aria-invalid': invalid, 'aria-describedby': describedBy, disabled }) => (
          <textarea
            id={id}
            className="textarea"
            rows={3}
            placeholder="What did you drill? How did sparring go?"
            aria-invalid={invalid}
            aria-describedby={describedBy}
            disabled={disabled}
            value={field.value ?? ''}
          />
        )}
      />

      <MatFormField
        control={control}
        name={`sections.${index}.enhancedNotes`}
        label="Enhanced notes (AI, optional)"
        disabled={isPending}
        render={({ id, field, 'aria-invalid': invalid, 'aria-describedby': describedBy, disabled }) => (
          <textarea
            id={id}
            className="textarea"
            rows={3}
            placeholder="AI-enhanced version of your notes will appear here"
            aria-invalid={invalid}
            aria-describedby={describedBy}
            disabled={disabled}
            value={field.value ?? ''}
          />
        )}
      />

      <div style={{ marginTop: 'var(--space-4)' }}>
        <button
          type="button"
          className="btn btn-sm"
          onClick={handleEnhance}
          disabled={isAIPending || isPending || !hasSectionGoal}
          aria-disabled={!hasSectionGoal}
          title={!hasSectionGoal ? 'Add a goal before enhancing with AI' : undefined}
        >
          {isAIPending ? 'Enhancing…' : '✦ Enhance with AI'}
        </button>

        {aiError ? (
          <FormAlert tone="warn" style={{ marginTop: 'var(--space-3)' }}>
            {aiError}
          </FormAlert>
        ) : null}

        {preview && !aiError ? (
          <div style={{ marginTop: 'var(--space-4)' }}>
            <AIPreviewPanel preview={preview} onApply={handleApply} onDiscard={handleDiscard} />
          </div>
        ) : null}
      </div>

      {!hideRollReview ? (
        <div style={{ marginTop: 'var(--space-5)' }} aria-label="Roll review">
          {showRollReview ? (
            <RollReviewPanel
              sectionLabel={`Section ${index + 1}`}
              rolls={preview?.rolls ?? sectionRolls}
              reviewComplete={rollsReviewComplete}
              onConfirmRoll={handleConfirmRoll}
              onConfirmAll={handleConfirmRolls}
              onSkip={handleSkipRolls}
              onChange={handleRollChange}
              onDelete={handleRollDelete}
            />
          ) : null}
        </div>
      ) : null}

      <div className="grid-2" style={{ marginTop: 'var(--space-5)' }}>
        <MatFormField
          control={control}
          name={`sections.${index}.durationMinutes`}
          label="Duration (minutes, optional)"
          disabled={isPending}
          render={({ id, field, 'aria-invalid': invalid, 'aria-describedby': describedBy, disabled }) => (
            <input
              id={id}
              type="number"
              min={1}
              max={300}
              className="input"
              placeholder="e.g. 15"
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
        control={control}
        name={`sections.${index}.techniqueIds`}
        label="Techniques (optional)"
        disabled={isPending}
        render={({ field }) => (
          <TechniqueSearch
            selectedIds={field.value ?? []}
            onChange={field.onChange}
            disabled={isPending}
          />
        )}
      />
    </article>
  )
}
