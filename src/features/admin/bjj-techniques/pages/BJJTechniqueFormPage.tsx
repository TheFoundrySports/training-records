import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  bjjTechniqueSchema,
  BJJ_CATEGORIES,
  type BJJTechniqueFormValues,
} from '@/features/bjj/bjj.schema'
import { useBJJTechniques } from '@/features/bjj/hooks/useBJJTechniques'
import { useCreateBJJTechnique, useUpdateBJJTechnique } from '../hooks/useBJJTechniqueMutations'
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

const selectClass =
  'h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'

export function BJJTechniqueFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEdit = Boolean(id)

  // For edit mode, fetch all techniques and find the one we need
  const { data: techniques, isLoading: loadingTechniques } = useBJJTechniques()
  const existing = id ? techniques?.find((t) => t.id === id) : undefined

  const createMutation = useCreateBJJTechnique()
  const updateMutation = useUpdateBJJTechnique()

  const isPending = createMutation.isPending || updateMutation.isPending

  const form = useForm<BJJTechniqueFormValues>({
    resolver: zodResolver(bjjTechniqueSchema),
    defaultValues: {
      name: '',
      description: '',
      category: undefined,
      youtubeUrl: '',
    },
  })

  useEffect(() => {
    if (isEdit && existing) {
      form.reset({
        name: existing.name,
        description: existing.description ?? '',
        category: existing.category,
        youtubeUrl: existing.youtubeUrl ?? '',
      })
    }
  }, [isEdit, existing, form])

  async function onSubmit(values: BJJTechniqueFormValues) {
    if (isEdit && id) {
      await updateMutation.mutateAsync({
        id,
        name: values.name,
        description: values.description || undefined,
        category: values.category,
        youtubeUrl: values.youtubeUrl || undefined,
      })
    } else {
      await createMutation.mutateAsync({
        name: values.name,
        description: values.description || undefined,
        category: values.category,
        youtubeUrl: values.youtubeUrl || undefined,
      })
    }
    void navigate('/admin/bjj-techniques')
  }

  if (isEdit && loadingTechniques) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div role="status" aria-label="Loading technique" className="space-y-4">
          <div className="h-8 w-48 rounded bg-muted animate-pulse" aria-hidden="true" />
          <div className="h-64 rounded-xl bg-muted animate-pulse" aria-hidden="true" />
        </div>
      </div>
    )
  }

  const mutationError =
    (createMutation.error as { error?: { message?: string } } | null)?.error?.message ??
    (updateMutation.error as { error?: { message?: string } } | null)?.error?.message

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-2xl font-semibold mb-6">{isEdit ? 'Edit Technique' : 'Add Technique'}</h1>

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
          {/* Name */}
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Single Leg X Guard" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Category */}
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category (optional)</FormLabel>
                <FormControl>
                  <select
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value || undefined)}
                    className={selectClass}
                    aria-label="Category"
                  >
                    <option value="">Select a category…</option>
                    {BJJ_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat} className="capitalize">
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </option>
                    ))}
                  </select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Description */}
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description (optional)</FormLabel>
                <FormControl>
                  <Textarea placeholder="Describe the technique…" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* YouTube URL */}
          <FormField
            control={form.control}
            name="youtubeUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>YouTube URL (optional)</FormLabel>
                <FormControl>
                  <Input type="url" placeholder="https://youtube.com/watch?v=..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving…' : 'Save'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void navigate('/admin/bjj-techniques')}
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
