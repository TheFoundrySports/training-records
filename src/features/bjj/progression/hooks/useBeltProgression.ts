import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { BeltProgressionItem } from '../types/belt-progression.types'

type BeltProgressionRow = {
  id: string
  user_id: string
  belt_level: string
  section_id: string
  item_id: string
  is_complete: boolean
  completed_at: string | null
  technique_id: string | null
  created_at: string
  updated_at: string
}

export function useBeltProgression() {
  const queryClient = useQueryClient()
  const queryKey = ['belt-progression']

  // ── Query ─────────────────────────────────────────────────
  const query = useQuery({
    queryKey,
    queryFn: async (): Promise<BeltProgressionItem[]> => {
      const { data, error } = await supabase
        .from('belt_progression')
        .select('*')
        .eq('belt_level', 'blue')

      if (error) {
        throw {
          error: {
            code: error.code ?? 'UNKNOWN',
            message: error.message,
            details: error.details,
          },
        }
      }

      return (data as BeltProgressionRow[]).map(mapProgressionRow)
    },
    staleTime: 60_000,
  })

  // ── Toggle mutation ───────────────────────────────────────
  const toggleMutation = useMutation({
    mutationFn: async ({
      sectionId,
      itemId,
      isComplete,
    }: {
      sectionId: string
      itemId: string
      isComplete: boolean
    }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw {
          error: {
            code: 'UNAUTHENTICATED',
            message: 'User must be authenticated to toggle progression item',
            details: null,
          },
        }
      }

      const { error } = await supabase
        .from('belt_progression')
        .upsert(
          {
            user_id: user.id,
            belt_level: 'blue',
            section_id: sectionId,
            item_id: itemId,
            is_complete: isComplete,
            completed_at: isComplete ? new Date().toISOString() : null,
          },
          {
            onConflict: 'user_id,belt_level,section_id,item_id',
          },
        )

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

    // Optimistic update
    onMutate: async ({ sectionId, itemId, isComplete }) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<BeltProgressionItem[]>(queryKey)

      queryClient.setQueryData<BeltProgressionItem[]>(queryKey, (old = []) => {
        const existing = old.find((r) => r.sectionId === sectionId && r.itemId === itemId)

        if (existing) {
          return old.map((r) =>
            r.sectionId === sectionId && r.itemId === itemId
              ? { ...r, isComplete, completedAt: isComplete ? new Date().toISOString() : null }
              : r,
          )
        }

        if (isComplete) {
          const key = `${sectionId}::${itemId}`
          return [
            ...old,
            {
              id: `optimistic-${key}`,
              userId: '',
              beltLevel: 'blue' as const,
              sectionId,
              itemId,
              isComplete: true,
              completedAt: new Date().toISOString(),
              techniqueId: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ]
        }

        return old
      })

      return { previous }
    },

    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous)
      }
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey })
    },
  })

  // ── Reset mutation ────────────────────────────────────────
  const resetMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('belt_progression')
        .delete()
        .eq('belt_level', 'blue')

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
      void queryClient.invalidateQueries({ queryKey: ['belt-progression'] })
      void queryClient.invalidateQueries({ queryKey: ['belt-progression-ui-state'] })
    },
  })

  return {
    progression: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    toggleItem: toggleMutation.mutate,
    toggleItemAsync: toggleMutation.mutateAsync,
    isToggling: toggleMutation.isPending,
    resetProgress: resetMutation.mutate,
    resetProgressAsync: resetMutation.mutateAsync,
    isResetting: resetMutation.isPending,
  }
}

function mapProgressionRow(row: BeltProgressionRow): BeltProgressionItem {
  return {
    id: row.id,
    userId: row.user_id,
    beltLevel: row.belt_level as BeltProgressionItem['beltLevel'],
    sectionId: row.section_id,
    itemId: row.item_id,
    isComplete: row.is_complete,
    completedAt: row.completed_at,
    techniqueId: row.technique_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}