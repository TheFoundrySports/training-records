import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { BeltProgressionUIState } from '../types/belt-progression.types'

type BeltProgressionUIStateRow = {
  id: string
  user_id: string
  belt_level: string
  section_id: string
  is_expanded: boolean
  updated_at: string
}

export function useBeltProgressionUIState() {
  const queryClient = useQueryClient()
  const queryKey = ['belt-progression-ui-state']

  // ── Query ─────────────────────────────────────────────────
  const query = useQuery({
    queryKey,
    queryFn: async (): Promise<BeltProgressionUIState[]> => {
      const { data, error } = await supabase
        .from('belt_progression_ui_state')
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

      return (data as BeltProgressionUIStateRow[]).map(mapUIStateRow)
    },
    staleTime: 60_000,
  })

  // ── Toggle section collapse mutation ───────────────────────
  const toggleSectionMutation = useMutation({
    mutationFn: async ({ sectionId, isExpanded }: { sectionId: string; isExpanded: boolean }) => {
      const { error } = await supabase
        .from('belt_progression_ui_state')
        .upsert(
          {
            belt_level: 'blue',
            section_id: sectionId,
            is_expanded: isExpanded,
          },
          {
            onConflict: 'user_id,belt_level,section_id',
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
    onMutate: async ({ sectionId, isExpanded }) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<BeltProgressionUIState[]>(queryKey)

      queryClient.setQueryData<BeltProgressionUIState[]>(queryKey, (old = []) => {
        const existing = old.find((r) => r.sectionId === sectionId)
        if (existing) {
          return old.map((r) =>
            r.sectionId === sectionId ? { ...r, isExpanded } : r,
          )
        }
        return [
          ...old,
          {
            id: `optimistic-${sectionId}`,
            userId: '',
            beltLevel: 'blue' as const,
            sectionId,
            isExpanded,
            updatedAt: new Date().toISOString(),
          },
        ]
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

  return {
    uiState: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    toggleSection: toggleSectionMutation.mutate,
    toggleSectionAsync: toggleSectionMutation.mutateAsync,
    isTogglingSection: toggleSectionMutation.isPending,
  }
}

function mapUIStateRow(row: BeltProgressionUIStateRow): BeltProgressionUIState {
  return {
    id: row.id,
    userId: row.user_id,
    beltLevel: row.belt_level as BeltProgressionUIState['beltLevel'],
    sectionId: row.section_id,
    isExpanded: row.is_expanded,
    updatedAt: row.updated_at,
  }
}