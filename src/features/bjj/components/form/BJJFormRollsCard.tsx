import { useFormContext, useWatch } from 'react-hook-form'
import { confirmRollDraft, confirmRollDrafts, type BJJRollDraft, type BJJWorkoutFormValues } from '../../bjj.schema'
import { RollReviewPanel } from '../RollReviewPanel'

export function BJJFormRollsCard() {
  const { control, setValue } = useFormContext<BJJWorkoutFormValues>()
  const sections = useWatch({ control, name: 'sections' }) ?? []

  const totalRolls = sections.reduce((sum, section) => sum + (section.rolls?.length ?? 0), 0)
  const sectionsWithRolls = sections
    .map((section, sectionIndex) => ({ section, sectionIndex }))
    .filter(({ section }) => (section.rolls?.length ?? 0) > 0)

  if (totalRolls === 0) {
    return (
      <div className="banner">
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
          <circle cx="10" cy="10" r="8" />
          <path d="M10 9v5M10 6.5h0" strokeLinecap="round" />
        </svg>
        <span>
          Run <strong>Enhance with AI</strong> on a training section to propose rolls for review
          here. Confirmed rolls feed your evolution dashboard.
        </span>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {sectionsWithRolls.map(({ section, sectionIndex }) => {
        const rolls = section.rolls ?? []
        const goalLabel = (section.goal ?? '').trim()
        const sectionLabel = goalLabel
          ? `Section ${sectionIndex + 1}: ${goalLabel}`
          : `Section ${sectionIndex + 1}`
        const reviewComplete =
          rolls.length > 0 && rolls.every((roll) => roll.reviewConfirmed === true)

        return (
          <RollReviewPanel
            key={sectionIndex}
            sectionLabel={sectionLabel}
            rolls={rolls}
            reviewComplete={reviewComplete}
            onConfirmRoll={(rollIndex) => {
              const roll = rolls[rollIndex]
              if (!roll || roll.validation_error != null) return
              const updated = rolls.map((item, index) =>
                index === rollIndex ? confirmRollDraft(item) : item,
              )
              setValue(`sections.${sectionIndex}.rolls`, updated, { shouldDirty: true })
            }}
            onConfirmAll={() => {
              if (rolls.some((roll) => roll.validation_error != null)) return
              setValue(
                `sections.${sectionIndex}.rolls`,
                confirmRollDrafts(rolls),
                { shouldDirty: true },
              )
            }}
            onSkip={() => {
              setValue(`sections.${sectionIndex}.rolls`, [], { shouldDirty: true })
            }}
            onChange={(rollIndex, updates) => {
              handleRollChange(setValue, sectionIndex, rolls, rollIndex, updates)
            }}
            onDelete={(rollIndex) => {
              const updated = rolls.filter((_, index) => index !== rollIndex)
              setValue(`sections.${sectionIndex}.rolls`, updated, { shouldDirty: true })
            }}
          />
        )
      })}
    </div>
  )
}

function handleRollChange(
  setValue: ReturnType<typeof useFormContext<BJJWorkoutFormValues>>['setValue'],
  sectionIndex: number,
  rolls: BJJRollDraft[],
  rollIndex: number,
  updates: Partial<BJJRollDraft>,
) {
  if (rollIndex >= rolls.length) return

  const updatedRolls = rolls.map((roll, index) => {
    if (index !== rollIndex) return roll
    return {
      ...roll,
      ...updates,
      reviewConfirmed: false,
      source: updates.source ?? 'ai_edited',
    }
  })

  setValue(`sections.${sectionIndex}.rolls`, updatedRolls, { shouldDirty: true })
}
