import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { aiSettingsSchema, type AISettingsFormValues } from '../ai-settings.schema'
import { useAISettings } from '../hooks/useAISettings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

export function AISettingsPage() {
  const { data, isLoading, error, upsert, isPending, mutationError, isSuccess } = useAISettings()

  const form = useForm<AISettingsFormValues>({
    resolver: zodResolver(aiSettingsSchema),
    defaultValues: {
      provider_name: 'openai',
      base_url: 'https://api.openai.com/v1',
      model: 'gpt-4o-mini',
    },
  })

  useEffect(() => {
    if (data) {
      form.reset({
        provider_name: data.provider_name,
        base_url: data.base_url,
        model: data.model,
      })
    }
  }, [data, form])

  function onSubmit(values: AISettingsFormValues) {
    upsert(values)
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div role="status" aria-label="Loading AI settings" className="space-y-4">
          <div className="h-8 w-48 rounded bg-muted animate-pulse" aria-hidden="true" />
          <div className="h-64 rounded-xl bg-muted animate-pulse" aria-hidden="true" />
        </div>
      </div>
    )
  }

  const loadError = error instanceof Error ? error.message : null
  const saveError = mutationError instanceof Error ? mutationError.message : null

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-2xl font-semibold mb-2">AI Settings</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Configure the AI provider used for section enhancement.
      </p>

      {loadError && (
        <div
          role="alert"
          className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-destructive text-sm"
        >
          {loadError}
        </div>
      )}

      {saveError && (
        <div
          role="alert"
          className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-destructive text-sm"
        >
          {saveError}
        </div>
      )}

      {isSuccess && (
        <div
          role="status"
          className="mb-4 rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-green-700 dark:text-green-400 text-sm"
        >
          AI settings saved successfully.
        </div>
      )}

      {/* API key informational note */}
      <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
        <strong>API Key</strong> — The API key is configured via the{' '}
        <code className="font-mono text-xs">OPENAI_API_KEY</code> environment variable on the
        server. It is not stored in the database.
      </div>

      <Form {...form}>
        <form
          onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}
          className="space-y-5"
          noValidate
        >
          {/* Provider Name */}
          <FormField
            control={form.control}
            name="provider_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Provider Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. openai" {...field} disabled={isPending} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Base URL */}
          <FormField
            control={form.control}
            name="base_url"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Base URL</FormLabel>
                <FormControl>
                  <Input
                    type="url"
                    placeholder="https://api.openai.com/v1"
                    {...field}
                    disabled={isPending}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Model */}
          <FormField
            control={form.control}
            name="model"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Model</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. gpt-4o-mini" {...field} disabled={isPending} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving…' : 'Save Settings'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
