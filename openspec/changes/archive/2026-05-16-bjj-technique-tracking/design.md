# Design: BJJ Technique Tracking & Learning Validation

## Technical Approach

This change extends the Iteration 6 Blue Belt Progression Tracker with data-driven practice validation. The AI enhance prompt is updated to emit bracketed `[Canonical Name]` tokens, which are parsed server-side and fed into a new `technique_practice_log` aggregate table via a database trigger. A `technique_learning_status` view joins the aggregate with configurable thresholds to produce `is_learned`. The frontend adds a `useTechniqueLearningStatus` hook, three new components (`TechniquePracticeBadge`, `TechniquePracticeModal`, `TechniqueSuggestionPanel`), and integrates them into `BeltProgressionPage`.

---

## Architecture Decisions

### Decision: Trigger on `bjj_section_techniques` AFTER INSERT (not on `bjj_sections`)

**Choice**: Fire trigger `AFTER INSERT ON bjj_section_techniques`, upserting `technique_practice_log` by joining through `bjj_sections` to get `user_id` and `performed_at`.

**Alternatives considered**:
- Trigger on `bjj_sections` AFTER INSERT/UPDATE of `ai_description` — rejected because the junction rows (`bjj_section_techniques`) are the source of truth for which techniques were linked, not the description text.
- Trigger on `bjj_sections` AFTER INSERT — rejected because a section may link multiple techniques; we'd need to re-parse `ai_description` which is fragile.

**Rationale**: `bjj_section_techniques` is the stable anchor row inserted by the frontend after the AI response arrives. The trigger fires once per technique, making the upsert logic straightforward (one technique per invocation). The join through `bjj_sections → workouts` to get `user_id` and `performed_at` is a single additional index lookup.

### Decision: Runtime name lookup for progression-item → technique mapping

**Choice**: At `BeltProgressionPage` render time, build an in-memory `Map<name | name_es, techniqueId>` from `bjj_techniques`, then match each Section 2 item's `label` (Spanish) against `name_es` and each `category` against `name` as fallback. No static `techniqueId` added to `PROGRESSION_SECTIONS`.

**Alternatives considered**:
- Add `techniqueId: string` field to every `ProgressionItem` in `belt-progression-sections.ts` — rejected because it duplicates data across files and requires syncing two sources of truth.
- Pre-compute a `Map<itemId, techniqueId>` via a DB view joining `belt_progression` and `bjj_techniques` — rejected; `belt_progression.technique_id` is optional and not yet populated; MVP uses runtime matching.

**Rationale**: The technique catalog has ~50 rows; a `Map` lookup is O(1). The matching logic (Spanish label → `name_es` → `name`) handles the case where `PROGRESSION_SECTIONS` labels are in Spanish while the catalog uses English canonical names.

### Decision: One-time historical backfill migration (not a continuous sync)

**Choice**: `20260514000004_backfill_practice_log.sql` runs once post-deployment using `INSERT ... ON CONFLICT DO NOTHING`.

**Alternatives considered**:
- Backfill as a standing Edge Function that re-runs on every deploy — rejected; idempotency is messy with upsert semantics.
- Backfill via a Supabase scheduled function running nightly until complete — rejected; unnecessary operational complexity for a one-time operation.

**Rationale**: `ON CONFLICT DO NOTHING` makes the migration safe to re-run (idempotent). If production already has live data from the trigger, `DO NOTHING` preserves it. If the trigger was backfilled incorrectly, re-running the migration has no effect — the trigger is the source of truth from deploy forward.

### Decision: Defer materialized view `technique_practice_workouts`

**Choice**: MVP uses a direct join query in `useTechniqueWorkoutHistory`; materialized view added only if p95 latency exceeds 500ms.

**Alternatives considered**:
- Create MV immediately — rejected; adds migration complexity and `refresh materialized view concurrently` trigger plumbing without evidence it is needed.
- MV refreshed on every `bjj_section_techniques` insert — rejected; refresh storm on bulk imports.

**Rationale**: The query is ` JOIN bjj_sections → workouts` with `user_id + technique_id` filters — both columns are indexed. For MVP (≤500 workouts per user, ≤20 techniques shown in modal), a direct query is sub-500ms. The MV is a non-breaking performance escape hatch.

---

## Data Flow

```
Athlete raw_description
         │
         ▼
  bjj-section-ai Edge Function
    │ prompt.ts updated → bracketed [Name] in ai_description
    │ regex /\[([^\]]+)\]/g extracts names → matches to bjj_techniques.id
    ▼
  Frontend stores ai_description + inserts bjj_section_techniques rows
         │
         ▼
  DB Trigger: update_technique_practice_log() on bjj_section_techniques INSERT
    │ upsert technique_practice_log (user_id derived from workout via bjj_sections)
    ▼
  technique_practice_log table (aggregate)
         │
         ├──► technique_learning_status VIEW (join thresholds + techniques)
         │              │
         │              ▼
         │    useTechniqueLearningStatus hook → BeltProgressionPage
         │              │
         │              ├──► TechniquePracticeBadge (inline counter per item)
         │              └──► TechniqueSuggestionPanel (top of page, last 30d)
         │
         └──► useTechniqueWorkoutHistory → TechniquePracticeModal (workout list)
```

---

## Database Migration Files

| File | Purpose |
|------|---------|
| `20260514000001_technique_practice_log.sql` | `technique_practice_log` table + trigger function + trigger |
| `20260514000002_technique_learning_thresholds.sql` | `technique_learning_thresholds` table + RLS |
| `20260514000003_technique_learning_status.sql` | `technique_learning_status` view |
| `20260514000004_backfill_practice_log.sql` | One-time historical backfill |

### Migration 1: `technique_practice_log` + trigger

```sql
-- supabase/migrations/20260514000001_technique_practice_log.sql

create table public.technique_practice_log (
  id                  uuid        primary key default gen_random_uuid(),
  user_id             uuid        not null references auth.users(id) on delete cascade,
  technique_id        uuid        not null references public.bjj_techniques(id) on delete cascade,
  total_practices     integer     not null default 1,
  first_practiced_at  timestamptz not null,
  last_practiced_at   timestamptz not null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint technique_practice_log_unique unique (user_id, technique_id)
);

create index technique_practice_log_user_id_idx      on public.technique_practice_log(user_id);
create index technique_practice_log_technique_id_idx on public.technique_practice_log(technique_id);

-- Auto-update updated_at
create or replace function public.set_technique_practice_log_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger technique_practice_log_updated_at
  before update on public.technique_practice_log
  for each row execute procedure public.set_technique_practice_log_updated_at();

-- RLS
alter table public.technique_practice_log enable row level security;

create policy "Users can read own technique_practice_log"
  on public.technique_practice_log for select
  using (auth.uid() = user_id);

-- Trigger function: upsert on bjj_section_techniques INSERT
create or replace function public.update_technique_practice_log()
returns trigger language plpgsql as $$
declare
  v_performed_at timestamptz;
  v_user_id      uuid;
begin
  select w.performed_at, w.user_id
    into v_performed_at, v_user_id
    from public.bjj_sections s
    join public.workouts w on w.id = s.workout_id
    where s.id = new.section_id;

  insert into public.technique_practice_log
    (user_id, technique_id, total_practices, first_practiced_at, last_practiced_at)
  values
    (v_user_id, new.technique_id, 1, v_performed_at, v_performed_at)
  on conflict (user_id, technique_id) do update set
    total_practices    = technique_practice_log.total_practices + 1,
    last_practiced_at  = greatest(technique_practice_log.last_practiced_at, v_performed_at),
    updated_at         = now();

  return new;
end;
$$ language plpgsql;

create trigger technique_practice_log_trigger
  after insert on public.bjj_section_techniques
  for each row execute function public.update_technique_practice_log();
```

### Migration 2: `technique_learning_thresholds`

```sql
-- supabase/migrations/20260514000002_technique_learning_thresholds.sql

create table public.technique_learning_thresholds (
  id                uuid        primary key default gen_random_uuid(),
  technique_id      uuid        not null unique references public.bjj_techniques(id) on delete cascade,
  required_practices integer    not null default 10,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index technique_learning_thresholds_technique_id_idx
  on public.technique_learning_thresholds(technique_id);

-- Auto-update updated_at
create or replace function public.set_technique_learning_thresholds_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger technique_learning_thresholds_updated_at
  before update on public.technique_learning_thresholds
  for each row execute procedure public.set_technique_learning_thresholds_updated_at();

-- RLS: anyone authenticated can read; only service role (admin) can write
alter table public.technique_learning_thresholds enable row level security;

create policy "Authenticated users can read thresholds"
  on public.technique_learning_thresholds for select
  to authenticated
  using (true);

create policy "Service role can manage thresholds"
  on public.technique_learning_thresholds for all
  to service_role
  using (true);
```

### Migration 3: `technique_learning_status` view

```sql
-- supabase/migrations/20260514000003_technique_learning_status.sql

create or replace view public.technique_learning_status as
select
  tpl.user_id,
  tpl.technique_id,
  t.name,
  t.name_es,
  t.category,
  tpl.total_practices,
  coalesce(tlt.required_practices, 10)  as required_practices,
  (tpl.total_practices >= coalesce(tlt.required_practices, 10)) as is_learned,
  tpl.first_practiced_at,
  tpl.last_practiced_at
from public.technique_practice_log tpl
join public.bjj_techniques t on t.id = tpl.technique_id
left join public.technique_learning_thresholds tlt on tlt.technique_id = tpl.technique_id;
```

### Migration 4: Historical backfill

```sql
-- supabase/migrations/20260514000004_backfill_practice_log.sql

insert into public.technique_practice_log
  (user_id, technique_id, total_practices, first_practiced_at, last_practiced_at)
select
  w.user_id,
  st.technique_id,
  count(*)                       as total_practices,
  min(w.performed_at)            as first_practiced_at,
  max(w.performed_at)            as last_practiced_at
from public.bjj_section_techniques st
join public.bjj_sections s       on s.id = st.section_id
join public.workouts w          on w.id = s.workout_id
group by w.user_id, st.technique_id
on conflict (user_id, technique_id) do nothing;
```

---

## Edge Function Changes

### `supabase/functions/bjj-section-ai/prompt.ts`

**Change**: Append bracketing instruction block after line 32 (after the catalog section in the prompt).

```typescript
// Add after line 32 (after "Technique catalog:\n${catalog}")
//
// After:
//   return `...Technique catalog:\n${catalog}\n\nReturn ONLY valid JSON...`
//
// New block appended before "Return ONLY valid JSON":
//
//   When you mention a technique, immediately append its canonical English name
//   in square brackets like this: "pasajes [Knee Slide Pass]".
//
//   Rules for bracketed technique names:
//   - Use ONLY canonical names from the technique catalog (the "name" field)
//   - Only bracket techniques you are confident the athlete practiced
//   - If uncertain, do not bracket — prefer precision over recall
```

No changes to `index.ts`. The AI response schema (`ai_description` + `matched_technique_ids`) is unchanged — parsing happens server-side by matching bracketed names in the frontend before inserting `bjj_section_techniques`.

---

## Frontend Architecture

### Component Tree

```
BeltProgressionPage
├── ProgressionProgressBar
├── TechniqueSuggestionPanel          ← NEW
│   └── SuggestionCard[]              (max 5)
├── ProgressionSection[]              (existing)
│   └── ProgressionChecklistItem      (existing, enhanced)
│       └── TechniquePracticeBadge    ← NEW (inline, clickable)
└── TechniquePracticeModal            ← NEW (Dialog, mounted at page level)
```

### New Hooks

| Hook | Query | Returns |
|------|-------|---------|
| `useTechniqueLearningStatus(userId)` | `technique_learning_status` view, `eq('user_id', userId)` | `TechniqueLearningStatus[]` |
| `useTechniqueWorkoutHistory(techniqueId, userId)` | `bjj_section_techniques JOIN bjj_sections JOIN workouts` filtered by `(technique_id, user_id)`, ordered by `performed_at desc`, limit 20 | `WorkoutHistoryEntry[]` |
| `useTechniqueSuggestions(userId)` | `technique_practice_log` filtered by `user_id` AND `last_practiced_at > now() - interval '30 days'`, joined with `bjj_techniques` AND `belt_progression` to exclude already-completed items, ordered by `last_practiced_at desc`, limit 5 | `TechniqueSuggestion[]` |

### New Components

**`TechniquePracticeBadge`** — inline badge next to each Section 2 checklist item:
```typescript
interface TechniquePracticeBadgeProps {
  count: number
  threshold: number
  isLearned: boolean
  onClick: () => void
}
// Color: gray (0), amber (0 < count < threshold), green (count >= threshold)
// aria-label: "{name} practiced {count} out of {threshold} times, {validated|not validated}"
```

**`TechniquePracticeModal`** — dialog listing workout history for a technique:
```typescript
interface TechniquePracticeModalProps {
  techniqueId: string
  techniqueName: string
  open: boolean
  onClose: () => void
}
// Fetches via useTechniqueWorkoutHistory
// Renders: Card per workout (date, goal, truncated ai_description, link to workout)
```

**`TechniqueSuggestionPanel`** — collapsible card at top of progression page:
```typescript
interface TechniqueSuggestionPanelProps {
  userId: string
}
// Fetches via useTechniqueSuggestions
// "Mark as Complete" button calls useBeltProgression.toggleItem()
// Dismissal: per-item button + "Dismiss all" → localStorage key `suggestions_dismissed_${userId}`
```

### Type Definitions

```typescript
// New types in src/features/bjj/progression/types/technique-tracking.types.ts

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

export interface WorkoutHistoryEntry {
  workout_id: string
  performed_at: string
  section_number: number
  goal: string
  ai_description: string
}

export interface TechniqueSuggestion {
  technique_id: string
  name: string
  name_es: string | null
  total_practices: number
  last_practiced_at: string
}
```

### `ProgressionChecklistItem` modification

The existing component is extended to accept an optional `practiceData` prop:

```typescript
// Added to existing interface:
practiceData?: {
  count: number
  threshold: number
  isLearned: boolean
} | null

// When practiceData is present:
// - Render TechniquePracticeBadge inline after the label
// - Make the entire row clickable → onClick opens TechniquePracticeModal
// - aria-label on badge includes count/threshold/validation status
```

### `BeltProgressionPage` modification

1. Import and call `useTechniqueLearningStatus(userId)` and `useTechniqueSuggestions(userId)`
2. Build `Map<techniqueId, TechniqueLearningStatus>` from the status query
3. At render time for Section 2 items, match `item.label` → `name_es` / `name` in the map
4. If a match is found, pass `practiceData` to `ProgressionChecklistItem`
5. Mount `TechniqueSuggestionPanel` above the global progress bar
6. Mount `TechniquePracticeModal` at page root (not inside a section)

---

## File Touch List

| File | Action | Notes |
|------|--------|-------|
| `supabase/migrations/20260514000001_technique_practice_log.sql` | Create | Table + trigger + function |
| `supabase/migrations/20260514000002_technique_learning_thresholds.sql` | Create | Table + RLS |
| `supabase/migrations/20260514000003_technique_learning_status.sql` | Create | View |
| `supabase/migrations/20260514000004_backfill_practice_log.sql` | Create | One-time backfill |
| `supabase/functions/bjj-section-ai/prompt.ts` | Modify | Add bracketing instruction block to system prompt |
| `src/features/bjj/progression/types/technique-tracking.types.ts` | Create | New type definitions |
| `src/features/bjj/progression/hooks/useTechniqueLearningStatus.ts` | Create | Fetch `technique_learning_status` view |
| `src/features/bjj/progression/hooks/useTechniqueWorkoutHistory.ts` | Create | Fetch workouts per technique |
| `src/features/bjj/progression/hooks/useTechniqueSuggestions.ts` | Create | Fetch last-30d suggestions |
| `src/features/bjj/progression/components/TechniquePracticeBadge.tsx` | Create | Inline counter badge |
| `src/features/bjj/progression/components/TechniquePracticeModal.tsx` | Create | Workout history dialog |
| `src/features/bjj/progression/components/TechniqueSuggestionPanel.tsx` | Create | Suggestion card panel |
| `src/features/bjj/progression/components/ProgressionChecklistItem.tsx` | Modify | Accept + render `practiceData` prop |
| `src/features/bjj/progression/pages/BeltProgressionPage.tsx` | Modify | Integrate badges, panel, modal |

---

## Migration Strategy and Rollback Plan

### Migration Order (forward)

```
1. 20260514000001_technique_practice_log.sql
     └─ creates table + trigger (depends on: bjj_techniques, bjj_sections, workouts)
2. 20260514000002_technique_learning_thresholds.sql
     └─ creates table (depends on: bjj_techniques)
3. 20260514000003_technique_learning_status.sql
     └─ creates view (depends on: tables created in 1 + 2)
4. 20260514000004_backfill_practice_log.sql
     └─ backfills aggregate from historical bjj_section_techniques rows
5. Edge function deploy (prompt.ts change) — no migration
6. Frontend deploy — no migration
```

### Rollback Order (reverse)

```
1. Frontend revert — new components/hooks are additive; existing components unchanged except ProgressionChecklistItem (additive prop)
2. Edge function revert — single file revert in prompt.ts
3. Drop trigger + tables in reverse order:
     drop trigger if exists technique_practice_log_trigger on bjj_section_techniques;
     drop function if exists public.update_technique_practice_log();
     drop table if exists public.technique_learning_status;        -- view
     drop table if exists public.technique_learning_thresholds;
     drop table if exists public.technique_practice_log;
```

**No destructive data loss**: `bjj_section_techniques` is unchanged; `technique_practice_log` is derived and rebuildable from it via the backfill or future workout activity.

---

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| DB trigger | Practice log upsert logic | SQL test: insert into `bjj_section_techniques` with known `section_id`, verify `technique_practice_log` row created/incremented |
| View | `is_learned` computation | SQL test: insert practice log rows with known counts, verify view returns correct `is_learned` |
| `useTechniqueLearningStatus` | Returns typed array | Unit test with mocked Supabase client |
| `TechniquePracticeBadge` | Color coding | Unit test: verify correct Tailwind classes for gray/amber/green cases |
| E2E | Full flow: workout → badge → modal → suggestion panel | Playwright: create BJJ workout → AI enhance → open progression page → assert badge count |

---

## Open Questions

- [ ] **Manual adjustment**: Should coaches be able to manually increment/decrement practice counts (e.g., for off-platform training)? Decision deferred to coach feedback post-MVP.
- [ ] **Per-athlete threshold override**: Start with global thresholds. If coaches request per-athlete overrides, add a `coach_athlete_threshold_overrides` table in Iteration 7.2.
- [ ] **Suggestion auto-dismiss**: Panel dismissal is session-only (localStorage). Confirm this is acceptable before adding a persistent dismissal table.