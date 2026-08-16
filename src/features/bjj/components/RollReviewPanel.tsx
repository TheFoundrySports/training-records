/**
 * RollReviewPanel — review and edit AI-proposed rolls (REQ-FRM1 PR 2b, Task 2.7-2.12).
 *
 * Features:
 * - Per-row controls: role, outcome, position_from/to, techniques, delete
 * - Displays AI confidence + raw excerpt
 * - Shows validation_error warnings with red borders (Option A blocking)
 * - Disables "Confirm all" when any roll has validation_error
 * - "Skip for now" clears all drafts from RHF state
 *
 * Material styling aligned with dashboard roll flow patterns.
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, ChevronDown, ChevronUp, Trash2 } from 'lucide-react'
import { useBJJPositions } from '../dashboard/hooks/useBJJPositions'
import type { BJJRollDraft, BJJRollRoleSchema, BJJRollOutcomeSchema } from '../bjj.schema'

interface RollReviewPanelProps {
  rolls: BJJRollDraft[]
  onConfirmAll: () => void
  onSkip: () => void
  onChange: (rollIndex: number, updates: Partial<BJJRollDraft>) => void
  onDelete: (rollIndex: number) => void
}

const ROLE_OPTIONS: Array<{ value: BJJRollRoleSchema; label: string }> = [
  { value: 'attacking', label: 'Attacking' },
  { value: 'defending', label: 'Defending' },
  { value: 'neutral', label: 'Neutral' },
]

const OUTCOME_OPTIONS: Array<{ value: BJJRollOutcomeSchema; label: string }> = [
  { value: 'submission', label: 'Submission' },
  { value: 'position_gain', label: 'Position Gain' },
  { value: 'position_loss', label: 'Position Loss' },
  { value: 'neutral', label: 'Neutral' },
]

export function RollReviewPanel({
  rolls,
  onConfirmAll,
  onSkip,
  onChange,
  onDelete,
}: RollReviewPanelProps) {
  const { data: positions = [] } = useBJJPositions()

  // Track which roll excerpts are expanded
  const [expandedExcerpts, setExpandedExcerpts] = useState<Set<number>>(new Set())

  // Check if any roll has validation errors
  const hasValidationErrors = rolls.some((roll) => roll.validation_error != null)

  function toggleExcerpt(rollIndex: number) {
    setExpandedExcerpts((prev) => {
      const next = new Set(prev)
      if (next.has(rollIndex)) {
        next.delete(rollIndex)
      } else {
        next.add(rollIndex)
      }
      return next
    })
  }

  function formatConfidence(confidence: number | null): string {
    if (confidence == null) return 'N/A'
    return `${Math.round(confidence * 100)}%`
  }

  return (
    <div className="rounded-md border bg-muted/50 px-3 py-3 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">
          AI Roll Proposals ({rolls.length} {rolls.length === 1 ? 'roll' : 'rolls'})
        </p>
      </div>

      {/* Roll list */}
      <div className="space-y-3">
        {rolls.map((roll, index) => {
          const hasError = roll.validation_error != null
          const isExpanded = expandedExcerpts.has(index)

          return (
            <div
              key={index}
              className={`rounded-md border p-3 space-y-2 ${
                hasError ? 'border-destructive bg-destructive/5' : 'border-border bg-surface'
              }`}
            >
              {/* Roll header with confidence and delete */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Roll {roll.roll_index}</span>
                  {roll.confidence != null && (
                    <Badge variant="secondary" className="text-xs">
                      {formatConfidence(roll.confidence)}
                    </Badge>
                  )}
                  {hasError && (
                    <div className="flex items-center gap-1 text-xs text-destructive">
                      <AlertCircle className="h-3 w-3" />
                      <span>Invalid position</span>
                    </div>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(index)}
                  aria-label={`Remove roll ${roll.roll_index}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {/* Validation error message */}
              {hasError && (
                <div className="rounded-md bg-destructive/10 px-2 py-1.5 text-xs text-destructive">
                  Position not recognized — select a valid position or remove this roll
                </div>
              )}

              {/* Role and Outcome selects */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Role</label>
                  <select
                    value={roll.role}
                    onChange={(e) =>
                      onChange(index, {
                        role: e.target.value as BJJRollDraft['role'],
                      })
                    }
                    className="w-full text-sm rounded-md border border-border bg-background px-2 py-1.5"
                  >
                    {ROLE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Outcome</label>
                  <select
                    value={roll.outcome}
                    onChange={(e) =>
                      onChange(index, {
                        outcome: e.target.value as BJJRollDraft['outcome'],
                      })
                    }
                    className="w-full text-sm rounded-md border border-border bg-background px-2 py-1.5"
                  >
                    {OUTCOME_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Position selects */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">From Position</label>
                  <select
                    value={roll.position_from ?? ''}
                    onChange={(e) => {
                      const newValue = e.target.value
                      onChange(index, {
                        position_from: newValue as BJJRollDraft['position_from'],
                        // Clear validation error if user is fixing the position
                        validation_error:
                          roll.validation_error === 'unknown_position_from' ? null : roll.validation_error,
                        // Mark as edited when user changes the position
                        source: 'ai_edited',
                      })
                    }}
                    className={`w-full text-sm rounded-md border px-2 py-1.5 ${
                      roll.validation_error === 'unknown_position_from'
                        ? 'border-destructive bg-destructive/5'
                        : 'border-border bg-background'
                    }`}
                  >
                    <option value="">Select position...</option>
                    {positions.map((pos) => (
                      <option key={pos.key} value={pos.key}>
                        {pos.display_en}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">To Position</label>
                  <select
                    value={roll.position_to ?? ''}
                    onChange={(e) => {
                      const newValue = e.target.value || null
                      onChange(index, {
                        position_to: newValue as BJJRollDraft['position_to'],
                        // Clear validation error if user is fixing the position
                        validation_error:
                          roll.validation_error === 'unknown_position_to' ? null : roll.validation_error,
                        // Mark as edited when user changes the position
                        source: 'ai_edited',
                      })
                    }}
                    className={`w-full text-sm rounded-md border px-2 py-1.5 ${
                      roll.validation_error === 'unknown_position_to'
                        ? 'border-destructive bg-destructive/5'
                        : 'border-border bg-background'
                    }`}
                  >
                    <option value="">None</option>
                    {positions.map((pos) => (
                      <option key={pos.key} value={pos.key}>
                        {pos.display_en}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Techniques (display only for now - multi-select would be complex) */}
              {roll.technique_names.length > 0 && (
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Techniques</label>
                  <div className="flex flex-wrap gap-1">
                    {roll.technique_names.map((name, techIndex) => (
                      <Badge key={techIndex} variant="secondary" className="text-xs">
                        {name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Raw excerpt collapsible */}
              {roll.raw_excerpt && (
                <div>
                  <button
                    type="button"
                    onClick={() => toggleExcerpt(index)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    {isExpanded ? (
                      <ChevronUp className="h-3 w-3" />
                    ) : (
                      <ChevronDown className="h-3 w-3" />
                    )}
                    <span>AI Context</span>
                  </button>
                  {isExpanded && (
                    <p className="mt-1 text-xs text-muted-foreground italic">
                      "{roll.raw_excerpt}"
                    </p>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 pt-1">
        <Button
          type="button"
          size="sm"
          onClick={onConfirmAll}
          disabled={hasValidationErrors || rolls.length === 0}
          title={
            hasValidationErrors
              ? 'Fix or remove invalid rolls before confirming'
              : undefined
          }
        >
          Confirm All
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onSkip}>
          Skip for Now
        </Button>
      </div>
    </div>
  )
}
