import { useState } from 'react'
import { useWatch, type Control } from 'react-hook-form'
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TechniqueSearch } from './TechniqueSearch'
import { useBJJSectionAI } from '../hooks/useBJJSectionAI'
import type { BJJWorkoutFormValues } from '../bjj.schema'

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
  const [aiDescription, setAiDescription] = useState<string | null>(null)
  const [aiError, setAiError] = useState<string | null>(null)

  const { enhance, isPending: isAIPending } = useBJJSectionAI()

  const rawDescription = useWatch({ control, name: `sections.${index}.rawDescription` })
  const sectionGoal = useWatch({ control, name: `sections.${index}.goal` })

  const hasRawDescription = (rawDescription ?? '').trim().length > 0

  function handleEnhance() {
    setAiError(null)
    enhance(
      {
        section_goal: sectionGoal ?? '',
        raw_description: rawDescription ?? '',
      },
      {
        onSuccess: (result) => {
          setAiDescription(result.ai_description)
        },
        onError: (err) => {
          const message = err instanceof Error ? err.message : 'AI enhancement failed'
          setAiError(message)
        },
      },
    )
  }

  return (
    <Card>
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

        {/* Raw Description */}
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

        {/* Enhance with AI */}
        {hasRawDescription && (
          <div className="space-y-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleEnhance}
              disabled={isAIPending || isPending}
            >
              {isAIPending ? 'Enhancing…' : '✦ Enhance with AI'}
            </Button>

            {aiError && (
              <p className="text-sm text-destructive rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2">
                {aiError}
              </p>
            )}

            {aiDescription && !aiError && (
              <div className="rounded-md border bg-muted/50 px-3 py-2">
                <p className="text-xs font-medium text-muted-foreground mb-1">AI Enhanced</p>
                <p className="text-sm">{aiDescription}</p>
              </div>
            )}
          </div>
        )}

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
