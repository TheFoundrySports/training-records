import { useNavigate } from 'react-router'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { bjjWorkoutSchema, type BJJWorkoutFormValues } from '../bjj.schema'
import { useCreateBJJWorkout } from '../hooks/useBJJWorkoutMutations'
import { BJJSectionEditor } from '../components/BJJSectionEditor'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

export function BJJWorkoutFormPage() {
  const navigate = useNavigate()
  const createMutation = useCreateBJJWorkout()
  const isPending = createMutation.isPending

  const form = useForm<BJJWorkoutFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(bjjWorkoutSchema) as any,
    defaultValues: {
      title: '',
      performedAt: new Date().toISOString().slice(0, 16),
      durationMinutes: 60,
      notes: '',
      rpe: undefined,
      sections: [
        {
          goal: '',
          rawDescription: '',
          durationMinutes: undefined,
          techniqueIds: [],
        },
      ],
    },
  })

  const { fields, append, remove } = useFieldArray({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    control: form.control as any,
    name: 'sections',
  })

  async function onSubmit(values: BJJWorkoutFormValues) {
    const workoutId = await createMutation.mutateAsync(values)
    void navigate(`/workouts/${workoutId}`)
  }

  const mutationError = (createMutation.error as { error?: { message?: string } } | null)?.error
    ?.message

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-2xl font-semibold mb-6">Log BJJ Workout</h1>

      {mutationError && (
        <div
          role="alert"
          className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-destructive text-sm"
        >
          {mutationError}
        </div>
      )}

      <Form {...form}>
        <form
          onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}
          className="space-y-5"
          noValidate
        >
          {/* Title */}
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Morning BJJ" {...field} disabled={isPending} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Date & Time */}
          <FormField
            control={form.control}
            name="performedAt"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date &amp; Time</FormLabel>
                <FormControl>
                  <Input type="datetime-local" {...field} disabled={isPending} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Duration */}
          <FormField
            control={form.control}
            name="durationMinutes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Duration (minutes)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    max={300}
                    {...field}
                    onChange={(e) => field.onChange(e.target.valueAsNumber)}
                    disabled={isPending}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Notes */}
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes (optional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="General session notes…"
                    {...field}
                    value={field.value ?? ''}
                    disabled={isPending}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* RPE */}
          <FormField
            control={form.control}
            name="rpe"
            render={({ field }) => (
              <FormItem>
                <FormLabel>RPE (1–10, optional)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    placeholder="e.g. 7"
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

          {/* Sections */}
          <div className="space-y-4">
            <h2 className="text-lg font-medium">Sections</h2>
            {fields.map((field, index) => (
              <BJJSectionEditor
                key={field.id}
                index={index}
                control={form.control}
                onRemove={() => remove(index)}
                removeDisabled={fields.length === 1}
                isPending={isPending}
              />
            ))}

            {form.formState.errors.sections?.root?.message && (
              <p className="text-sm text-destructive">
                {form.formState.errors.sections.root.message}
              </p>
            )}
            {typeof form.formState.errors.sections?.message === 'string' && (
              <p className="text-sm text-destructive">{form.formState.errors.sections.message}</p>
            )}

            <Button
              type="button"
              variant="outline"
              onClick={() =>
                append({
                  goal: '',
                  rawDescription: '',
                  durationMinutes: undefined,
                  techniqueIds: [],
                })
              }
              disabled={isPending || fields.length >= 10}
            >
              + Add Section
            </Button>
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving…' : 'Save'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void navigate('/workouts')}
              disabled={isPending}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
