import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { CreateBJJTechniqueInput, UpdateBJJTechniqueInput } from '@/features/bjj/bjj.types'

export function useCreateBJJTechnique() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateBJJTechniqueInput): Promise<void> => {
      const { error } = await supabase.from('bjj_techniques').insert({
        name: input.name,
        description: input.description ?? null,
        category: input.category ?? null,
        youtube_url: input.youtubeUrl ?? null,
      })

      if (error) {
        throw {
          error: {
            code: error.code ?? 'UNKNOWN',
            message: error.message,
            details: error.details,
          },
        }
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['bjj-techniques'] })
    },
  })
}

export function useUpdateBJJTechnique() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: UpdateBJJTechniqueInput): Promise<void> => {
      const { id, ...rest } = input
      const { error } = await supabase
        .from('bjj_techniques')
        .update({
          ...(rest.name !== undefined && { name: rest.name }),
          ...(rest.description !== undefined && { description: rest.description ?? null }),
          ...(rest.category !== undefined && { category: rest.category ?? null }),
          ...(rest.youtubeUrl !== undefined && { youtube_url: rest.youtubeUrl ?? null }),
        })
        .eq('id', id)

      if (error) {
        throw {
          error: {
            code: error.code ?? 'UNKNOWN',
            message: error.message,
            details: error.details,
          },
        }
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['bjj-techniques'] })
    },
  })
}

export function useDeleteBJJTechnique() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from('bjj_techniques').delete().eq('id', id)

      if (error) {
        throw {
          error: {
            code: error.code ?? 'UNKNOWN',
            message: error.message,
            details: error.details,
          },
        }
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['bjj-techniques'] })
    },
  })
}
