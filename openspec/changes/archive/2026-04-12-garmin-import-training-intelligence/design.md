# Design: Garmin Import + Training Intelligence

## Technical Approach

Two new Supabase Edge Functions (`garmin-import`, `training-evaluation`) orchestrated by a sequential `useMutation` chain on the client. Storage holds raw FIT files; parsed metrics land in `garmin_activities`; LLM output in `training_evaluations`. Client follows the exact pattern of `ai-generate` / `useGenerateWorkout`.

---

## Architecture Decisions

| #   | Decision                            | Alternatives                      | Choice                                                                      | Rationale                                                                      |
| --- | ----------------------------------- | --------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| 1   | FIT parsing in Edge Function        | Client-side WASM parse            | Server-side via `esm.sh/fit-file-parser`                                    | Raw file never leaves server; no WASM bundle in frontend                       |
| 2   | Inline validation in Edge Functions | Import npm:zod                    | Manual type-guard functions (pattern from `_shared/wod-schemas.ts`)         | Project uses manual guards — stay consistent; avoid Deno import map complexity |
| 3   | `fit-file-parser` promisification   | Use event stream                  | Wrap callback in `new Promise()`                                            | Library is callback-based; wrapping is standard Deno pattern                   |
| 4   | Storage upload via `req.formData()` | Base64 in JSON body               | `multipart/form-data` with `supabase.storage.from().upload()`               | Matches Supabase Edge Function storage SDK pattern; handles binary cleanly     |
| 5   | Soft circular FK resolution         | Defer FK until after both inserts | Insert `garmin_activities` first → `UPDATE workouts SET garmin_activity_id` | Avoids circular dependency; workouts row already exists                        |
| 6   | Adaptation warning calculation      | DB trigger / cron                 | Client-side: query next workout after metrics load                          | Simpler; no background infra needed for MVP                                    |

---

## Data Flow

```
Client (WorkoutDetailPage)
  │
  ├─ [1] Upload modal: user selects .fit file
  │
  ├─ [2] POST /garmin-import  (multipart: fit_file + workout_id)
  │       │
  │       ├─ parse FIT → extract metrics
  │       ├─ upload raw file → Storage garmin-fits/{userId}/{activityId}.fit
  │       ├─ INSERT garmin_activities (metrics)
  │       ├─ UPDATE workouts SET garmin_activity_id = {id}
  │       └─ return { garmin_activity_id, metrics }
  │
  ├─ [3] Show TrainingMetricsPanel immediately (data from step 2)
  │
  ├─ [4] POST /training-evaluation  (json: { garmin_activity_id })
  │       │
  │       ├─ fetch garmin_activities row
  │       ├─ call GPT-4o-mini with metrics prompt
  │       ├─ validate response (manual type-guard)
  │       ├─ INSERT training_evaluations
  │       └─ return { evaluation }
  │
  ├─ [5] Show AIEvaluationCard (skeleton → content)
  │
  └─ [6] Query next planned workout → compute adaptation warning
```

---

## Database Schema

### Migration 1 — `garmin_activities`

```sql
-- 20260412000001_create_garmin_activities.sql
create table public.garmin_activities (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid references auth.users(id) on delete cascade not null,
  workout_id          uuid references public.workouts(id) on delete cascade not null,
  storage_path        text not null,              -- garmin-fits/{userId}/{id}.fit
  elapsed_seconds     integer,
  calories            integer,
  avg_heart_rate      integer,
  max_heart_rate      integer,
  training_load       numeric(6,2),
  recovery_time_hours integer,
  vo2max_estimate     numeric(4,1),
  hr_zone_1_seconds   integer,
  hr_zone_2_seconds   integer,
  hr_zone_3_seconds   integer,
  hr_zone_4_seconds   integer,
  hr_zone_5_seconds   integer,
  created_at          timestamptz not null default now()
);

alter table public.garmin_activities enable row level security;

create policy "Athletes can read own garmin_activities" on public.garmin_activities
  for select using (auth.uid() = user_id);
create policy "Athletes can insert own garmin_activities" on public.garmin_activities
  for insert with check (auth.uid() = user_id);

create index garmin_activities_workout_id_idx on public.garmin_activities(workout_id);
create index garmin_activities_user_id_idx on public.garmin_activities(user_id);
```

### Migration 2 — `training_evaluations`

```sql
-- 20260412000002_create_training_evaluations.sql
create table public.training_evaluations (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid references auth.users(id) on delete cascade not null,
  garmin_activity_id   uuid references public.garmin_activities(id) on delete cascade not null unique,
  readiness_level      text not null check (readiness_level in ('low','medium','high')),
  training_summary     text not null,
  next_suggestion      text not null,
  raw_response         jsonb,
  created_at           timestamptz not null default now()
);

alter table public.training_evaluations enable row level security;

create policy "Athletes can read own training_evaluations" on public.training_evaluations
  for select using (auth.uid() = user_id);
create policy "Athletes can insert own training_evaluations" on public.training_evaluations
  for insert with check (auth.uid() = user_id);

create index training_evaluations_garmin_activity_id_idx on public.training_evaluations(garmin_activity_id);
```

### Migration 3 — `workouts.garmin_activity_id`

```sql
-- 20260412000003_workouts_garmin_activity_fk.sql
alter table public.workouts
  add column if not exists garmin_activity_id uuid
    references public.garmin_activities(id) on delete set null;

comment on column public.workouts.garmin_activity_id is
  'Links workout to imported Garmin activity. Set after garmin_activities insert.';
```

### Storage bucket

```sql
-- In migration 1 or Supabase dashboard:
-- Bucket: garmin-fits, private
-- RLS policy: owner can SELECT/INSERT on objects where (storage.foldername(name))[1] = auth.uid()::text
```

---

## Edge Functions

### `garmin-import`

**Request:** `multipart/form-data`

- `fit_file`: `File` (`.fit`)
- `workout_id`: `string` (UUID)

**Flow:**

```ts
// supabase/functions/garmin-import/index.ts
import { FitParser } from 'https://esm.sh/fit-file-parser@1.9.9'

async function parseFit(buffer: ArrayBuffer): Promise<FitData> {
  return new Promise((resolve, reject) => {
    const parser = new FitParser({ force: true, speedUnit: 'km/h' })
    parser.on('finished', (err: Error | null, data: unknown) => {
      if (err) reject(err)
      else resolve(data as FitData)
    })
    parser.parse(Buffer.from(buffer))
  })
}
```

**Metrics extraction** (from `data.sessions[0]` and `data.records`):

- `elapsed_seconds` ← `session.total_elapsed_time`
- `calories` ← `session.total_calories`
- `avg_heart_rate` ← `session.avg_heart_rate`
- `max_heart_rate` ← `session.max_heart_rate`
- `training_load` ← `session.training_load_peak` (nullable)
- `recovery_time_hours` ← `session.recovery_time` (nullable)
- `vo2max_estimate` ← `session.enhanced_avg_respiration_rate` or device field (nullable)
- HR zones ← `data.time_in_hr_zone` array if present; fallback: compute from records

**Storage upload:**

```ts
const storagePath = `${userId}/${activityId}.fit`
await supabase.storage.from('garmin-fits').upload(storagePath, fileBytes, {
  contentType: 'application/octet-stream',
  upsert: false,
})
```

**DB writes (in order):**

1. `INSERT INTO garmin_activities (...) RETURNING id`
2. `UPDATE workouts SET garmin_activity_id = {id} WHERE id = workout_id AND user_id = auth_uid`

**Response:**

```ts
{ garmin_activity_id: string, metrics: GarminMetrics }
```

**Error codes:** `BAD_REQUEST` (invalid FIT / missing fields), `STORAGE_ERROR`, `DB_ERROR`, `UNAUTHORIZED`

---

### `training-evaluation`

**Request:** `application/json`

```ts
{
  garmin_activity_id: string
}
```

**Flow:**

1. Fetch `garmin_activities` row (validate ownership via `user_id = auth.uid()`)
2. Build prompt with metrics
3. Call `https://api.openai.com/v1/chat/completions` (model: `gpt-4o-mini`, `response_format: { type: 'json_object' }`)
4. Manual type-guard validate response
5. INSERT `training_evaluations`
6. Return evaluation

**System prompt:**

```
You are a sports science coach. Given an athlete's training metrics from a Garmin device,
produce a structured JSON evaluation with these fields:
- readiness_level: "low" | "medium" | "high"
- training_summary: string (2-3 sentences about this session)
- next_suggestion: string (actionable next-workout recommendation)

Only return the JSON object. No explanation.
```

**User message:** Serialized metrics (avg HR, zones, load, recovery, VO2max).

**Validation type-guard** (in `_shared/garmin-schemas.ts`):

```ts
export function isValidEvaluationResponse(v: unknown): v is EvaluationResponse {
  if (typeof v !== 'object' || v === null) return false
  const r = v as Record<string, unknown>
  return (
    ['low', 'medium', 'high'].includes(r.readiness_level as string) &&
    typeof r.training_summary === 'string' &&
    typeof r.next_suggestion === 'string'
  )
}
```

**Error codes:** `NOT_FOUND`, `AI_ERROR`, `VALIDATION_ERROR`, `DB_ERROR`, `UNAUTHORIZED`

---

## Client Architecture

### TypeScript Types

```ts
// src/features/garmin/garmin.types.ts
export interface GarminMetrics {
  elapsedSeconds?: number
  calories?: number
  avgHeartRate?: number
  maxHeartRate?: number
  trainingLoad?: number
  recoveryTimeHours?: number
  vo2maxEstimate?: number
  hrZones?: { z1: number; z2: number; z3: number; z4: number; z5: number }
}

export interface GarminActivity {
  id: string
  workoutId: string
  storagePath: string
  metrics: GarminMetrics
  createdAt: string
}

export interface TrainingEvaluation {
  id: string
  garminActivityId: string
  readinessLevel: 'low' | 'medium' | 'high'
  trainingSummary: string
  nextSuggestion: string
  createdAt: string
}

export interface ImportResult {
  garminActivityId: string
  metrics: GarminMetrics
}
```

### React Component Tree (WorkoutDetailPage additions)

```
WorkoutDetailPage
  ├─ [existing workout card]
  ├─ GarminImportTrigger        ← "Import Garmin" button (isOwner && !garminActivityId)
  ├─ GarminImportModal          ← Dialog with file input + upload state
  ├─ TrainingMetricsPanel       ← shown when garminActivityId exists (metrics from query)
  │    └─ HRZoneBar             ← stacked bar of zone seconds
  └─ AIEvaluationCard           ← shown when training_evaluations row exists
       └─ AdaptationWarning     ← shown when next workout < recoveryTimeHours away
```

### Hooks

```ts
// src/features/garmin/hooks/useGarminImport.ts
export function useGarminImport(workoutId: string) {
  const queryClient = useQueryClient()

  const importMutation = useMutation({
    mutationFn: async (file: File): Promise<ImportResult> => {
      const formData = new FormData()
      formData.append('fit_file', file)
      formData.append('workout_id', workoutId)
      const { data, error } = await supabase.functions.invoke<ImportResult>('garmin-import', {
        body: formData,
      })
      if (error || !data) throw error
      return data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['workouts', workoutId] })
    },
  })

  const evalMutation = useMutation({
    mutationFn: async (garminActivityId: string): Promise<TrainingEvaluation> => {
      const { data, error } = await supabase.functions.invoke<TrainingEvaluation>(
        'training-evaluation',
        { body: { garmin_activity_id: garminActivityId } },
      )
      if (error || !data) throw error
      return data
    },
    onSuccess: (_, garminActivityId) => {
      void queryClient.invalidateQueries({ queryKey: ['garmin-activity', garminActivityId] })
    },
  })

  async function importAndEvaluate(file: File) {
    const result = await importMutation.mutateAsync(file)
    await evalMutation.mutateAsync(result.garminActivityId)
  }

  return {
    importAndEvaluate,
    isImporting: importMutation.isPending,
    isEvaluating: evalMutation.isPending,
    importResult: importMutation.data,
    evaluation: evalMutation.data,
    error: importMutation.error ?? evalMutation.error,
  }
}
```

### Adaptation Warning Logic

```ts
// src/features/garmin/hooks/useAdaptationWarning.ts
export function useAdaptationWarning(recoveryTimeHours: number | undefined, performedAt: string) {
  // Query next planned workout after performedAt
  const { data: nextWorkout } = useNextWorkout(performedAt)

  if (!recoveryTimeHours || !nextWorkout) return null

  const recoveryEnds = addHours(new Date(performedAt), recoveryTimeHours)
  const nextAt = new Date(nextWorkout.performedAt)

  return nextAt < recoveryEnds
    ? {
        message: `Next workout in ${formatDistanceToNow(nextAt)} — recovery ends ${format(recoveryEnds, 'HH:mm')}`,
      }
    : null
}
```

### State Flow

```
idle → uploading (importMutation.isPending)
     → metrics visible (importMutation.isSuccess) + evaluating (evalMutation.isPending)
     → fully loaded (evalMutation.isSuccess)
     → error (any mutation error)
```

---

## File Structure

### New Files

| Path                                                                 | Description                                |
| -------------------------------------------------------------------- | ------------------------------------------ |
| `supabase/functions/garmin-import/index.ts`                          | FIT parse + Storage upload + DB insert     |
| `supabase/functions/training-evaluation/index.ts`                    | LLM call + validation + DB insert          |
| `supabase/functions/_shared/garmin-schemas.ts`                       | Shared type-guards for evaluation response |
| `src/features/garmin/garmin.types.ts`                                | Client TypeScript types                    |
| `src/features/garmin/hooks/useGarminImport.ts`                       | Two-step mutation hook                     |
| `src/features/garmin/hooks/useGarminActivity.ts`                     | Query hook for garmin_activities row       |
| `src/features/garmin/hooks/useTrainingEvaluation.ts`                 | Query hook for training_evaluations row    |
| `src/features/garmin/hooks/useAdaptationWarning.ts`                  | Computes warning from next workout date    |
| `src/features/garmin/hooks/useNextWorkout.ts`                        | Queries next workout after given date      |
| `src/features/garmin/components/GarminImportModal.tsx`               | Dialog with file input + progress state    |
| `src/features/garmin/components/GarminImportTrigger.tsx`             | "Import Garmin" button                     |
| `src/features/garmin/components/TrainingMetricsPanel.tsx`            | HR + zones + load display                  |
| `src/features/garmin/components/HRZoneBar.tsx`                       | Stacked bar visualization                  |
| `src/features/garmin/components/AIEvaluationCard.tsx`                | Readiness + summary + suggestion           |
| `src/features/garmin/components/AdaptationWarning.tsx`               | Warning banner                             |
| `src/features/garmin/index.ts`                                       | Feature barrel export                      |
| `supabase/migrations/20260412000001_create_garmin_activities.sql`    | garmin_activities table + RLS              |
| `supabase/migrations/20260412000002_create_training_evaluations.sql` | training_evaluations table + RLS           |
| `supabase/migrations/20260412000003_workouts_garmin_activity_fk.sql` | workouts FK column                         |

### Modified Files

| Path                                                | Change                                                 |
| --------------------------------------------------- | ------------------------------------------------------ |
| `src/features/workouts/workout.types.ts`            | Add `garminActivityId?: string` to `Workout` interface |
| `src/features/workouts/hooks/mapRow.ts`             | Map `garmin_activity_id` from DB row                   |
| `src/features/workouts/pages/WorkoutDetailPage.tsx` | Add import trigger + conditional panels                |
| `src/types/supabase.ts`                             | Regenerate after migrations (`supabase gen types`)     |

---

## Migration Plan

| Order | File                                             | Action                             |
| ----- | ------------------------------------------------ | ---------------------------------- |
| 1     | `20260412000001_create_garmin_activities.sql`    | Create table + RLS + indexes       |
| 2     | `20260412000002_create_training_evaluations.sql` | Create table + RLS + indexes       |
| 3     | `20260412000003_workouts_garmin_activity_fk.sql` | Add nullable FK column to workouts |

**Rollback:**

1. `ALTER TABLE workouts DROP COLUMN garmin_activity_id`
2. `DROP TABLE training_evaluations`
3. `DROP TABLE garmin_activities`
4. Empty and delete `garmin-fits` bucket
5. Revert `workout.types.ts`, `mapRow.ts`, `WorkoutDetailPage.tsx`
6. Remove `src/features/garmin/` and both Edge Functions

---

## Testing Strategy

| Layer       | What                                | Approach                                                          |
| ----------- | ----------------------------------- | ----------------------------------------------------------------- |
| Unit        | `parseFit()` promisification        | Vitest with a sample `.fit` fixture                               |
| Unit        | `isValidEvaluationResponse()` guard | Vitest — valid + invalid inputs                                   |
| Unit        | `useAdaptationWarning` hook         | Vitest with mocked dates                                          |
| Integration | `garmin-import` function            | Deno test with real `.fit` sample + mocked Storage/DB             |
| Integration | `training-evaluation` function      | Deno test with mocked OpenAI response                             |
| E2E         | Full upload flow                    | Playwright: upload `.fit` → metrics panel visible → AI card loads |

---

## Open Questions

- [ ] `fit-file-parser` on `esm.sh`: verify `Buffer.from(arrayBuffer)` works in Deno (needs runtime spike before UI build)
- [ ] HR zone field names vary by Garmin device firmware — confirm field path from a real `.fit` sample
- [ ] `useNextWorkout`: needs calendar feature's workout query — confirm `performed_at > now` ordering is sufficient or if a "planned" status column is required
