import type { BJJWorkoutFormValues } from './bjj.schema'

/** Prefilled create-form demo data — explore the hybrid form without running AI first. */
export function createBjjWorkoutFormExampleValues(): BJJWorkoutFormValues {
  return {
    title: 'Morning no-gi open mat',
    performedAt: new Date().toISOString().slice(0, 16),
    durationMinutes: 90,
    notes:
      'Good energy today. Focused on passing from half guard, then flow rolling with lighter partners.',
    rpe: 7,
    sections: [
      {
        goal: 'Guard passing and sparring rounds',
        rawDescription:
          'Drilled knee slice from half guard, then rolled: passed open guard to side, moved to mount and finished an armbar. Second roll — defended turtle, took the back.',
        enhancedNotes:
          'Structured work on half-guard passing (underhook, flatten, knee through) followed by positional sparring. Two clear rolls worth logging for the dashboard.',
        durationMinutes: 55,
        techniqueIds: [],
        rolls: [
          {
            roll_index: 1,
            role: 'attacking',
            outcome: 'position_gain',
            position_from: 'open_guard',
            position_to: 'side_control',
            technique_names: ['Knee slice pass'],
            confidence: 0.84,
            raw_excerpt: 'Passed from open guard to side control with a heavy knee slice.',
            validation_error: null,
            source: 'manual',
          },
          {
            roll_index: 2,
            role: 'attacking',
            outcome: 'submission',
            position_from: 'mount',
            position_to: null,
            technique_names: ['Armbar from mount'],
            confidence: 0.78,
            raw_excerpt:
              'Stabilized mount and finished with an armbar when they pushed on my hip.',
            validation_error: null,
            source: 'manual',
          },
        ],
      },
    ],
  }
}
