/**
 * RollReviewPanel — review and edit AI-proposed rolls (REQ-FRM1).
 * Hybrid OD styling: Material roll cards + canonical position model (Option A).
 */

import { useState } from 'react'
import { AlertCircle, ChevronDown, ChevronUp, Trash2 } from 'lucide-react'
import { useBJJPositions } from '../dashboard/hooks/useBJJPositions'
import type { BJJRollDraft, BJJRollRole, BJJRollOutcome } from '../bjj.schema'

interface RollReviewPanelProps {
  sectionLabel?: string
  rolls: BJJRollDraft[]
  /** User explicitly confirmed rolls in this review session. */
  reviewComplete?: boolean
  onConfirmAll: () => void
  onSkip: () => void
  onChange: (rollIndex: number, updates: Partial<BJJRollDraft>) => void
  onDelete: (rollIndex: number) => void
}

const ROLE_OPTIONS: Array<{ value: BJJRollRole; label: string }> = [
  { value: 'attacking', label: 'Attacking' },
  { value: 'defending', label: 'Defending' },
  { value: 'neutral', label: 'Neutral' },
]

const OUTCOME_OPTIONS: Array<{ value: BJJRollOutcome; label: string }> = [
  { value: 'submission', label: 'Submission' },
  { value: 'position_gain', label: 'Position gain' },
  { value: 'position_loss', label: 'Position loss' },
  { value: 'neutral', label: 'Neutral' },
]

const ROLE_LABELS: Record<BJJRollRole, string> = {
  attacking: 'Attacking',
  defending: 'Defending',
  neutral: 'Neutral',
}

const OUTCOME_LABELS: Record<BJJRollOutcome, string> = {
  submission: 'Submission',
  position_gain: 'Position gain',
  position_loss: 'Position loss',
  neutral: 'Neutral',
}

export function RollReviewPanel({
  sectionLabel,
  rolls,
  reviewComplete = false,
  onConfirmAll,
  onSkip,
  onChange,
  onDelete,
}: RollReviewPanelProps) {
  const { data: positions = [] } = useBJJPositions()
  const [expandedExcerpts, setExpandedExcerpts] = useState<Set<number>>(new Set())

  const hasValidationErrors = rolls.some((roll) => roll.validation_error != null)
  const confirmedCount = reviewComplete ? rolls.length : 0

  function toggleExcerpt(rollIndex: number) {
    setExpandedExcerpts((prev) => {
      const next = new Set(prev)
      if (next.has(rollIndex)) next.delete(rollIndex)
      else next.add(rollIndex)
      return next
    })
  }

  function formatConfidence(confidence: number | null): string {
    if (confidence == null) return 'N/A'
    return `${Math.round(confidence * 100)}%`
  }

  function positionLabel(key: string | null | undefined): string {
    if (!key) return '—'
    return positions.find((p) => p.key === key)?.display_en ?? key
  }

  return (
    <div>
      <div className="card-head" style={{ paddingBottom: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
        <h4 style={{ fontSize: 'var(--text-base)', margin: 0 }}>
          Roll review{sectionLabel ? ` · ${sectionLabel}` : ''}
        </h4>
        <span
          className={`tag ${
            hasValidationErrors ? 'pending' : reviewComplete ? 'ok' : rolls.length > 0 ? '' : ''
          }`}
        >
          {rolls.length === 0
            ? 'No rolls'
            : hasValidationErrors
              ? `${rolls.length} need fix`
              : reviewComplete
                ? `${rolls.length} confirmed`
                : `${rolls.length} proposed`}
        </span>
      </div>

      <div className="banner">
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
          <circle cx="10" cy="10" r="8" />
          <path d="M10 9v5M10 6.5h0" strokeLinecap="round" />
        </svg>
        <span>
          AI proposed <strong>{rolls.length}</strong> roll{rolls.length === 1 ? '' : 's'}. Map each
          to valid positions — only confirmed rolls feed dashboard metrics.
        </span>
      </div>

      <div className="roll-list" style={{ marginTop: 'var(--space-5)' }}>
        {rolls.map((roll, index) => {
          const hasError = roll.validation_error != null
          const isExpanded = expandedExcerpts.has(index)

          return (
            <article
              key={`${roll.roll_index}-${index}`}
              className="roll"
              data-state={hasError ? 'invalid' : 'proposed'}
            >
              <div className="roll-head">
                <span className="roll-title">
                  Roll {roll.roll_index}
                  {roll.confidence != null ? (
                    <span className="mono" style={{ marginLeft: 6 }}>
                      {formatConfidence(roll.confidence)} confidence
                    </span>
                  ) : null}
                </span>
                <span className={`tag ${hasError ? 'pending' : reviewComplete ? 'ok' : ''}`}>
                  {hasError ? 'Invalid' : reviewComplete ? 'Confirmed' : 'Proposed'}
                </span>
              </div>

              <div className="roll-read">
                <p>
                  <strong>{ROLE_LABELS[roll.role]}</strong> · {OUTCOME_LABELS[roll.outcome]}
                </p>
                <p className="flow-read" style={{ marginTop: 'var(--space-2)' }}>
                  {positionLabel(roll.position_from)}
                  {roll.position_to ? ` → ${positionLabel(roll.position_to)}` : ''}
                </p>
              </div>

              {hasError ? (
                <div className="banner warn" style={{ marginTop: 'var(--space-3)' }}>
                  <AlertCircle width={18} height={18} aria-hidden="true" />
                  <span>Position not recognized — select a valid position or remove this roll.</span>
                </div>
              ) : null}

              <div className="roll-body" style={{ marginTop: 'var(--space-4)' }}>
                <div className="field">
                  <label className="label" htmlFor={`roll-${index}-role`}>
                    Role
                  </label>
                  <select
                    id={`roll-${index}-role`}
                    className="select"
                    value={roll.role}
                    aria-invalid={hasError}
                    onChange={(e) =>
                      onChange(index, { role: e.target.value as BJJRollDraft['role'] })
                    }
                  >
                    {ROLE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label className="label" htmlFor={`roll-${index}-outcome`}>
                    Outcome
                  </label>
                  <select
                    id={`roll-${index}-outcome`}
                    className="select"
                    value={roll.outcome}
                    onChange={(e) =>
                      onChange(index, { outcome: e.target.value as BJJRollDraft['outcome'] })
                    }
                  >
                    {OUTCOME_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label className="label" htmlFor={`roll-${index}-from`}>
                    From position
                  </label>
                  <select
                    id={`roll-${index}-from`}
                    className="select"
                    value={roll.position_from ?? ''}
                    aria-invalid={roll.validation_error === 'unknown_position_from'}
                    onChange={(e) =>
                      onChange(index, {
                        position_from: e.target.value as BJJRollDraft['position_from'],
                        validation_error:
                          roll.validation_error === 'unknown_position_from'
                            ? null
                            : roll.validation_error,
                        source: 'ai_edited',
                      })
                    }
                  >
                    <option value="">Select position…</option>
                    {positions.map((pos) => (
                      <option key={pos.key} value={pos.key}>
                        {pos.display_en}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label className="label" htmlFor={`roll-${index}-to`}>
                    To position
                  </label>
                  <select
                    id={`roll-${index}-to`}
                    className="select"
                    value={roll.position_to ?? ''}
                    aria-invalid={roll.validation_error === 'unknown_position_to'}
                    onChange={(e) =>
                      onChange(index, {
                        position_to: (e.target.value || null) as BJJRollDraft['position_to'],
                        validation_error:
                          roll.validation_error === 'unknown_position_to'
                            ? null
                            : roll.validation_error,
                        source: 'ai_edited',
                      })
                    }
                  >
                    <option value="">None</option>
                    {positions.map((pos) => (
                      <option key={pos.key} value={pos.key}>
                        {pos.display_en}
                      </option>
                    ))}
                  </select>
                </div>

                {roll.technique_names.length > 0 ? (
                  <div className="field span-all">
                    <span className="label">Techniques</span>
                    <p className="flow-read">{roll.technique_names.join(' · ')}</p>
                  </div>
                ) : null}

                {roll.raw_excerpt ? (
                  <div className="field span-all">
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost"
                      onClick={() => toggleExcerpt(index)}
                      aria-expanded={isExpanded}
                    >
                      {isExpanded ? (
                        <ChevronUp width={14} height={14} aria-hidden="true" />
                      ) : (
                        <ChevronDown width={14} height={14} aria-hidden="true" />
                      )}
                      <span style={{ marginLeft: 6 }}>AI context</span>
                    </button>
                    {isExpanded ? (
                      <p className="hint" style={{ marginTop: 'var(--space-2)', fontStyle: 'italic' }}>
                        &ldquo;{roll.raw_excerpt}&rdquo;
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <div className="roll-foot">
                <button
                  type="button"
                  className="btn btn-sm btn-danger-text"
                  onClick={() => onDelete(index)}
                  aria-label={`Remove roll ${roll.roll_index}`}
                >
                  <Trash2 width={14} height={14} aria-hidden="true" />
                  <span style={{ marginLeft: 6 }}>Discard</span>
                </button>
              </div>
            </article>
          )
        })}
      </div>

      {reviewComplete ? (
        <div className="banner ok" style={{ marginTop: 'var(--space-4)' }}>
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
            <path d="M6.5 10.2 8.8 12.5 13.5 7.8" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="10" cy="10" r="8" />
          </svg>
          <span>
            <strong>{rolls.length}</strong> roll{rolls.length === 1 ? '' : 's'} confirmed — ready to
            save with this workout.
          </span>
        </div>
      ) : (
        <div className="roll-foot">
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={onConfirmAll}
            disabled={hasValidationErrors || rolls.length === 0}
            title={
              hasValidationErrors ? 'Fix or remove invalid rolls before confirming' : undefined
            }
          >
            Confirm all ({confirmedCount}/{rolls.length})
          </button>
          <button type="button" className="btn btn-sm" onClick={onSkip}>
            Skip for now
          </button>
        </div>
      )}
    </div>
  )
}
