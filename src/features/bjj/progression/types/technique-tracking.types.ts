/**
 * Type definitions for BJJ technique tracking (PR 2).
 * These types correspond to the `technique_learning_status` view and
 * related query results from the practice log schema.
 */

/**
 * Represents the learning status of a single technique for a user.
 * Derived from `technique_learning_status` view which joins
 * `technique_practice_log`, `bjj_techniques`, and `technique_learning_thresholds`.
 */
export interface TechniqueLearningStatus {
  user_id: string
  technique_id: string
  name: string
  name_es: string | null
  category: string | null
  total_practices: number
  required_practices: number
  is_learned: boolean
  first_practiced_at: string
  last_practiced_at: string
}

/**
 * A single workout entry in a technique's practice history.
 * Used by `useTechniqueWorkoutHistory` to display the workout list in the modal.
 */
export interface WorkoutHistoryEntry {
  workout_id: string
  performed_at: string
  section_number: number
  goal: string
  ai_description: string
}

/**
 * A technique suggested for practice — recently active but not yet in the
 * user's belt progression as completed. Used by `useTechniqueSuggestions`
 * to surface practice recommendations in the suggestion panel.
 */
export interface TechniqueSuggestion {
  technique_id: string
  name: string
  name_es: string | null
  total_practices: number
  last_practiced_at: string
}