import path from 'path'
import { test, expect } from './fixtures/pages.fixture'

/**
 * Garmin import E2E tests.
 *
 * These tests mock the Supabase Edge Function endpoints so they don't
 * require a running garmin-import or training-evaluation function.
 *
 * Prerequisites:
 *   supabase db reset && bash scripts/seed-users.sh
 *
 * The mocked endpoints return canned responses that exercise the UI
 * state machine (import → metrics panel → evaluation card).
 */

const FIT_FIXTURE = path.join(__dirname, 'fixtures', 'activity.fit')

// Canned import response (matches ImportResult shape)
const IMPORT_RESPONSE = {
  garmin_activity_id: 'test-activity-id-001',
  metrics: {
    elapsedTimeSeconds: 3600,
    avgHeartRate: 145,
    maxHeartRate: 178,
    trainingLoad: 120,
    recoveryTimeHours: 24,
    calories: 650,
    vo2max: null,
    hrZone1Seconds: 600,
    hrZone2Seconds: 900,
    hrZone3Seconds: 1200,
    hrZone4Seconds: 600,
    hrZone5Seconds: 300,
  },
}

// Canned evaluation response (matches TrainingEvaluation shape from DB)
const EVALUATION_RESPONSE = {
  evaluation: {
    id: 'eval-id-001',
    summary: 'Good aerobic session with balanced HR zone distribution.',
    readiness_level: 'good',
    next_session_suggestion: 'Plan a moderate aerobic session in 24 hours.',
    adaptation_warning: null,
  },
}

test.describe('Garmin import: full upload flow', () => {
  test('upload .fit file → metrics panel appears → evaluation card loads', async ({
    page,
    workoutsPage,
    workoutFormPage,
    garminImportPage,
  }) => {
    // ── Setup: mock Edge Function endpoints ──────────────────────────────────
    // Supabase Edge Functions are invoked at /functions/v1/{name}
    await page.route('**/functions/v1/garmin-import', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(IMPORT_RESPONSE),
      })
    })

    await page.route('**/functions/v1/training-evaluation', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(EVALUATION_RESPONSE),
      })
    })

    // Also mock the garmin_activities DB read that happens after import
    // (useGarminActivity query refetch)
    await page.route('**/rest/v1/garmin_activities*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: IMPORT_RESPONSE.garmin_activity_id,
          workout_id: 'workout-for-test',
          user_id: 'user-001',
          file_path: 'user-001/workout/ts.fit',
          elapsed_time_seconds: 3600,
          avg_heart_rate: 145,
          max_heart_rate: 178,
          training_load: 120,
          recovery_time_hours: 24,
          calories: 650,
          vo2max: null,
          time_in_hr_zone: [600_000, 900_000, 1_200_000, 600_000, 300_000],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }),
      })
    })

    // Also mock the training_evaluations DB read
    await page.route('**/rest/v1/training_evaluations*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: EVALUATION_RESPONSE.evaluation.id,
          garmin_activity_id: IMPORT_RESPONSE.garmin_activity_id,
          user_id: 'user-001',
          summary: EVALUATION_RESPONSE.evaluation.summary,
          readiness_level: EVALUATION_RESPONSE.evaluation.readiness_level,
          next_session_suggestion: EVALUATION_RESPONSE.evaluation.next_session_suggestion,
          adaptation_warning: null,
          created_at: new Date().toISOString(),
        }),
      })
    })

    // ── Step 1: Create a workout to use ─────────────────────────────────────
    await workoutsPage.goto()
    await workoutsPage.clickLogWorkout()

    const workoutTitle = `Garmin E2E Test ${Date.now()}`
    await workoutFormPage.fillTitle(workoutTitle)
    await workoutFormPage.fillDate('2026-04-10T09:00')
    await workoutFormPage.fillDuration(60)
    await workoutFormPage.saveAndExpectSuccess()

    // Navigate to the created workout detail page
    await workoutsPage.openWorkoutByTitle(workoutTitle)
    await expect(page).toHaveURL(/\/workouts\/[\w-]+$/)

    // ── Step 2: Click "Import Garmin Data" ───────────────────────────────────
    await garminImportPage.clickImport()
    await expect(page.getByRole('dialog')).toBeVisible()

    // ── Step 3: Upload the .fit fixture file ─────────────────────────────────
    await garminImportPage.uploadFitFile(FIT_FIXTURE)

    // ── Step 4: Confirm import ───────────────────────────────────────────────
    await garminImportPage.confirmImport()

    // Dialog should close after successful import
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 10_000 })

    // ── Step 5: Assert TrainingMetricsPanel became visible ───────────────────
    await garminImportPage.expectMetricsPanelVisible()
    await expect(page.getByText('Garmin Metrics')).toBeVisible()

    // ── Step 6: Assert AIEvaluationCard shows content ────────────────────────
    await garminImportPage.expectEvaluationCardVisible()
    await expect(page.getByText('AI Training Evaluation')).toBeVisible()
  })
})

test.describe('Garmin import: re-import flow', () => {
  test('re-import shows replacement warning before proceeding', async ({
    page,
    workoutsPage,
    workoutFormPage,
    garminImportPage,
  }) => {
    // ── Setup: mock endpoints ────────────────────────────────────────────────
    await page.route('**/functions/v1/garmin-import', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(IMPORT_RESPONSE),
      })
    })

    await page.route('**/functions/v1/training-evaluation', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(EVALUATION_RESPONSE),
      })
    })

    await page.route('**/rest/v1/garmin_activities*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: IMPORT_RESPONSE.garmin_activity_id,
          workout_id: 'workout-reimport-test',
          user_id: 'user-001',
          file_path: 'user-001/workout/ts.fit',
          elapsed_time_seconds: 3600,
          avg_heart_rate: 145,
          max_heart_rate: 178,
          training_load: 120,
          recovery_time_hours: 24,
          calories: 650,
          vo2max: null,
          time_in_hr_zone: [600_000, 900_000, 1_200_000, 600_000, 300_000],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }),
      })
    })

    await page.route('**/rest/v1/training_evaluations*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: EVALUATION_RESPONSE.evaluation.id,
          garmin_activity_id: IMPORT_RESPONSE.garmin_activity_id,
          user_id: 'user-001',
          summary: EVALUATION_RESPONSE.evaluation.summary,
          readiness_level: EVALUATION_RESPONSE.evaluation.readiness_level,
          next_session_suggestion: EVALUATION_RESPONSE.evaluation.next_session_suggestion,
          adaptation_warning: null,
          created_at: new Date().toISOString(),
        }),
      })
    })

    // ── Step 1: Create a workout and do initial import ───────────────────────
    await workoutsPage.goto()
    await workoutsPage.clickLogWorkout()

    const workoutTitle = `Garmin ReImport E2E ${Date.now()}`
    await workoutFormPage.fillTitle(workoutTitle)
    await workoutFormPage.fillDate('2026-04-10T09:00')
    await workoutFormPage.fillDuration(60)
    await workoutFormPage.saveAndExpectSuccess()

    await workoutsPage.openWorkoutByTitle(workoutTitle)

    // Do first import to set up the "has existing data" state
    await garminImportPage.clickImport()
    await garminImportPage.uploadFitFile(FIT_FIXTURE)
    await garminImportPage.confirmImport()
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 10_000 })

    // Wait for metrics panel to confirm first import succeeded
    await garminImportPage.expectMetricsPanelVisible()

    // ── Step 2: Click "Re-import Garmin Data" ────────────────────────────────
    await garminImportPage.clickReImport()
    await expect(page.getByRole('dialog')).toBeVisible()

    // ── Step 3: Assert replacement warning is shown ──────────────────────────
    await garminImportPage.expectReplaceWarningVisible()

    // ── Step 4: Confirm re-import ────────────────────────────────────────────
    await garminImportPage.uploadFitFile(FIT_FIXTURE)
    await garminImportPage.confirmImport()

    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 10_000 })

    // ── Step 5: Assert metrics panel still shows after re-import ────────────
    await garminImportPage.expectMetricsPanelVisible()
    await expect(page.getByText('Garmin Metrics')).toBeVisible()
  })
})
