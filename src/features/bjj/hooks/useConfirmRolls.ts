/**
 * useConfirmRolls — mutation hook for confirming roll drafts after workout save (REQ-FRM1 PR 2a, D5).
 *
 * Flow:
 * 1. Map section_number to section id by querying bjj_sections
 * 2. Fetch existing rolls from bjj_roll_events for each section
 * 3. Call planRollConfirmation to get delete/insert plan
 * 4. Delete proposed rows if plan.deleteProposed = true
 * 5. Map technique_names to technique_ids by querying bjj_techniques
 * 6. Insert confirmed rolls with offset indices
 * 7. Invalidate bjj dashboard queries on success
 *
 * REQ-RE10: This hook executes AFTER workout save resolves.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { planRollConfirmation } from '../ai/planRollConfirmation'
import { bjjDashboardKeys } from '../dashboard/hooks/bjjDashboardKeys'
import type { ConfirmRollsInput } from '../bjj.types'

export function useConfirmRolls() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: ConfirmRollsInput): Promise<void> => {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !user) {
        throw new Error('You must be signed in to save roll data.')
      }

      const userId = user.id

      // Early return if no sections
      if (input.sections.length === 0) {
        return
      }

      // Process each section sequentially to maintain ordering
      for (const section of input.sections) {
        // Skip sections with no rolls
        if (section.rolls.length === 0) {
          continue
        }

        // Step 1: Map section_number to section id
        const { data: sectionData, error: sectionError } = await supabase
          .from('bjj_sections')
          .select('id')
          .eq('workout_id', input.workoutId)
          .eq('section_number', section.sectionNumber)
          .single()

        if (sectionError || !sectionData) {
          throw new Error(
            `Failed to resolve section id for section_number ${section.sectionNumber}: ${sectionError?.message}`
          )
        }

        const sectionId = sectionData.id

        // Step 2: Fetch existing rolls for this section
        const { data: existingRolls, error: fetchError } = await supabase
          .from('bjj_roll_events')
          .select('roll_index, status')
          .eq('section_id', sectionId)

        if (fetchError) {
          throw new Error(
            `Failed to fetch existing rolls for section ${sectionId}: ${fetchError.message}`
          )
        }

        // Step 3: Call planRollConfirmation
        const plan = planRollConfirmation(sectionId, existingRolls ?? [], section.rolls)

        // Step 4: Delete proposed rows if needed
        if (plan.deleteProposed) {
          const { error: deleteError } = await supabase
            .from('bjj_roll_events')
            .delete()
            .eq('section_id', sectionId)
            .eq('status', 'proposed')

          if (deleteError) {
            throw new Error(
              `Failed to delete proposed rolls for section ${sectionId}: ${deleteError.message}`
            )
          }
        }

        // Step 5: Map technique_names to technique_ids for all rolls
        // Collect all unique technique names from this section's rolls
        const allTechniqueNames = Array.from(
          new Set(section.rolls.flatMap((roll) => roll.technique_names))
        )

        let techniqueNameToIdMap = new Map<string, string>()

        if (allTechniqueNames.length > 0) {
          const { data: techniques, error: techniqueError } = await supabase
            .from('bjj_techniques')
            .select('id, name')
            .in('name', allTechniqueNames)

          if (techniqueError) {
            throw new Error(
              `Failed to fetch techniques for section ${sectionId}: ${techniqueError.message}`
            )
          }

          techniqueNameToIdMap = new Map(
            (techniques ?? []).map((t) => [t.name, t.id])
          )
        }

        // Step 6: Build inserts with technique_ids resolved
        const insertsWithTechniqueIds = plan.inserts.map((insert, idx) => {
          const rollDraft = section.rolls[idx]
          const techniqueIds = rollDraft.technique_names
            .map((name) => techniqueNameToIdMap.get(name))
            .filter((id): id is string => id != null)

          return {
            user_id: userId,
            workout_id: input.workoutId,
            section_id: sectionId,
            roll_index: insert.roll_index,
            role: insert.role,
            outcome: insert.outcome,
            position_from: insert.position_from,
            position_to: insert.position_to,
            technique_ids: techniqueIds,
            status: insert.status,
            source: insert.source,
            confidence: insert.confidence,
            raw_excerpt: insert.raw_excerpt,
          }
        })

        // Step 7: Insert confirmed rolls
        if (insertsWithTechniqueIds.length > 0) {
          const { error: insertError } = await supabase
            .from('bjj_roll_events')
            .insert(insertsWithTechniqueIds)

          if (insertError) {
            throw new Error(
              `Failed to insert confirmed rolls for section ${sectionId}: ${insertError.message}`
            )
          }
        }
      }
    },
    onSuccess: () => {
      // Step 8: Invalidate bjj dashboard queries (REQ-RE8)
      void queryClient.invalidateQueries({ queryKey: bjjDashboardKeys.all })
    },
  })
}
