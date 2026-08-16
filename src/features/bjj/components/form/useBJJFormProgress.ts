import { useMemo } from 'react'
import type { UseFormWatch } from 'react-hook-form'
import type { BJJWorkoutFormValues } from '../../bjj.schema'

export type FormStepState = 'todo' | 'current' | 'done'
export type ActionTone = 'warn' | 'ok'

export interface FormStep {
  id: string
  targetId: string
  name: string
  state: FormStepState
}

export interface FormProgress {
  steps: FormStep[]
  progressPct: number
  summaryTag: string
  summaryTagClass: string
  summaryFoot: string
  actionMessage: string
  actionTone: ActionTone
  canSubmit: boolean
  totalRolls: number
  invalidRolls: number
  sectionCount: number
  techniqueCount: number
}

export function useBJJFormProgress(
  watch: UseFormWatch<BJJWorkoutFormValues>,
  formError?: string | null,
): FormProgress {
  const values = watch()

  return useMemo(() => {
    const titleOk = (values.title ?? '').trim().length > 0
    const durationOk = Number.isFinite(values.durationMinutes) && values.durationMinutes >= 1
    const sessionOk = titleOk && durationOk

    const sections = values.sections ?? []
    const sectionsWithGoal = sections.filter((s) => (s.goal ?? '').trim().length > 0)
    const techniquesOk = sectionsWithGoal.length === sections.length && sections.length > 0

    const allRolls = sections.flatMap((s) => s.rolls ?? [])
    const invalidRolls = allRolls.filter((r) => r.validation_error != null).length
    const rollsOk = invalidRolls === 0

    const techniqueCount = sections.reduce((sum, s) => sum + (s.techniqueIds?.length ?? 0), 0)

    const checks = [sessionOk, techniquesOk, rollsOk]
    const doneCount = checks.filter(Boolean).length
    const progressPct = Math.round((doneCount / checks.length) * 100)

    const steps: FormStep[] = [
      {
        id: 'session',
        targetId: 'cardSession',
        name: 'Session',
        state: sessionOk ? 'done' : 'current',
      },
      {
        id: 'techniques',
        targetId: 'cardSections',
        name: 'Sections',
        state: techniquesOk ? 'done' : sessionOk ? 'current' : 'todo',
      },
      {
        id: 'rolls',
        targetId: 'cardRolls',
        name: 'Rolls',
        state: rollsOk && allRolls.length > 0 ? 'done' : techniquesOk && allRolls.length > 0 ? 'current' : rollsOk ? 'done' : techniquesOk ? 'current' : 'todo',
      },
      {
        id: 'review',
        targetId: 'cardReview',
        name: 'Review',
        state: progressPct === 100 ? 'current' : 'todo',
      },
    ]

    let actionMessage: string
    let actionTone: ActionTone = 'warn'

    if (formError) {
      actionMessage = 'Couldn’t save workout — see the message above.'
      actionTone = 'warn'
    } else if (!titleOk) {
      actionMessage = 'Enter a session title.'
    } else if (!durationOk) {
      actionMessage = 'Check the session duration.'
    } else if (!techniquesOk) {
      actionMessage = 'Each section needs a goal.'
    } else if (invalidRolls > 0) {
      actionMessage =
        invalidRolls === 1
          ? 'Fix 1 roll position before saving.'
          : `Fix ${invalidRolls} roll positions before saving.`
    } else if (allRolls.length > 0) {
      actionMessage = `${allRolls.length} roll${allRolls.length === 1 ? '' : 's'} ready to save.`
      actionTone = 'ok'
    } else {
      actionMessage = 'Ready to save — run AI enhance to propose rolls.'
      actionTone = progressPct === 100 ? 'ok' : 'warn'
    }

    const summaryFoot =
      progressPct === 100 ? 'Registration complete.' : actionMessage

    return {
      steps,
      progressPct,
      summaryTag: progressPct === 100 ? 'Complete' : 'Draft',
      summaryTagClass: progressPct === 100 ? 'tag ok' : 'tag',
      summaryFoot,
      actionMessage,
      actionTone,
      canSubmit: sessionOk && techniquesOk && rollsOk && !formError,
      totalRolls: allRolls.length,
      invalidRolls,
      sectionCount: sections.length,
      techniqueCount,
    }
  }, [values, formError])
}

export function scrollToFormSection(targetId: string) {
  const target = document.getElementById(targetId)
  if (!target) return
  const top = target.getBoundingClientRect().top + window.scrollY - 76
  window.scrollTo({ top, behavior: 'smooth' })
}
