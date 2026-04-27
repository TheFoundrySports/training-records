import { z } from 'zod'

export const aiSettingsSchema = z.object({
  provider_name: z.string().min(1, 'Provider name is required'),
  base_url: z.string().url('Must be a valid URL'),
  model: z.string().min(1, 'Model is required'),
})

export type AISettingsFormValues = z.infer<typeof aiSettingsSchema>
