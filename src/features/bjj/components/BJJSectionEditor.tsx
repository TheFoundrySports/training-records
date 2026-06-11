import { useState, useRef } from 'react'
import { useWatch, useFormContext, type Control } from 'react-hook-form'
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TechniqueSearch } from './TechniqueSearch'
import { AIPreviewPanel } from './AIPreviewPanel'
import { useBJJSectionAI } from '../hooks/useBJJSectionAI'
import type { BJJWorkoutFormValues } from '../bjj.schema'

interface AIPreview {
  ai_description: string
  matched_technique_ids: string[]
}

interface BJJSectionEditorProps {
  index: number
  control: Control<BJJWorkoutFormValues>
  onRemove: () => void
  removeDisabled: boolean
  isPending: boolean
}

export function BJJSectionEditor({
  index,
  control,
  onRemove,
  removeDisabled,
  isPending,
}: BJJSectionEditorProps) {
  const [preview, setPreview] = useState<AIPreview | null>(null)
  const [aiError, setAiError] = useState<string | null>(null)
  /** Blocks a second click before React re-renders with `isAIPending` (TanStack Query updates async). */
  const enhanceInFlightRef = useRef(false)

  const { enhance, isPending: isAIPending } = useBJJSectionAI()
  const { setValue } = useFormContext<BJJWorkoutFormValues>()

  const rawDescription = useWatch({ control, name: `sections.${index}.rawDescription` })
  const sectionGoal = useWatch({ control, name: `sections.${index}.goal` })

  // bjj-section-ai Edge Function requires `section_goal` to be non-empty (returns 400 otherwise).
  // Keep the button in lockstep with that contract to avoid the user seeing a generic
  // "Edge Function returned a non-2xx status code" error.
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
          setPreview(result)
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
    // Store AI result in enhancedNotes (preserves original rawDescription)
    setValue(`sections.${index}.enhancedNotes`, preview.ai_description)
    // Also update technique IDs if AI found matches
    if (preview.matched_technique_ids.length > 0) {
      setValue(`sections.${index}.techniqueIds`, preview.matched_technique_ids)
    }
    setPreview(null)
  }

  function handleDiscard() {
    setPreview(null)
  }

  return (
    <Card className="overflow-visible">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Section {index + 1}</CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRemove}
            disabled={removeDisabled || isPending}
            aria-label={`Remove section ${index + 1}`}
          >
            Remove
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Goal */}
        <FormField
          control={control}
          name={`sections.${index}.goal`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Goal</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g. Guard passing from half guard"
                  {...field}
                  disabled={isPending}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Notes (optional) */}
        <FormField
          control={control}
          name={`sections.${index}.rawDescription`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes (optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="What did you drill? How did it go?"
                  rows={3}
                  {...field}
                  value={field.value ?? ''}
                  disabled={isPending}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Enhanced Notes (AI) */}
        <FormField
          control={control}
          name={`sections.${index}.enhancedNotes`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Enhanced Notes (AI, optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="AI-enhanced version of your notes will appear here"
                  rows={3}
                  {...field}
                  value={field.value ?? ''}
                  disabled={isPending}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Enhance with AI — always visible */}
        <div className="space-y-3">
          <div title={!hasSectionGoal ? 'Add a Goal before enhancing with AI' : undefined}>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleEnhance}
              disabled={isAIPending || isPending || !hasSectionGoal}
              aria-disabled={!hasSectionGoal}
            >
              {isAIPending ? 'Enhancing…' : '✦ Enhance with AI'}
            </Button>
          </div>

          {aiError && (
            <p className="text-sm text-destructive rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2">
              {aiError}
            </p>
          )}

          {preview && !aiError && (
            <AIPreviewPanel
              preview={preview}
              onApply={handleApply}
              onDiscard={handleDiscard}
            />
          )}
        </div>

        {/* Duration */}
        <FormField
          control={control}
          name={`sections.${index}.durationMinutes`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Duration (minutes, optional)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={1}
                  max={300}
                  placeholder="e.g. 15"
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

        {/* Technique Search */}
        <FormField
          control={control}
          name={`sections.${index}.techniqueIds`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Techniques (optional)</FormLabel>
              <FormControl>
                <TechniqueSearch
                  selectedIds={field.value ?? []}
                  onChange={field.onChange}
                  disabled={isPending}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  )
}
