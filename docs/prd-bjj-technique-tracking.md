# Product Requirements Document: BJJ Technique Tracking & Learning Validation

## 1. Document control

| Field       | Value                                                                                  |
| ----------- | -------------------------------------------------------------------------------------- |
| **Title**   | BJJ Technique Tracking & Learning Validation — Iteration 7                             |
| **Version** | 0.1                                                                                    |
| **Date**    | 2026-05-14                                                                             |
| **Author**  | Francisco José Seva Mora                                                               |
| **Status**  | Draft — Requirements definition for AI-enhanced technique tracking and belt validation |

**Related links**

- Parent PRD: [docs/PRD.md](PRD.md)
- Product context: [docs/PRODUCT.md](PRODUCT.md)
- Architecture: [docs/ARCHITECTURE.md](ARCHITECTURE.md)
- Related PRD: [prd-bjj-blue-belt-progression.md](prd-bjj-blue-belt-progression.md) (Iteration 6)
- Related PRD: [BJJ extension.md](BJJ%20extension.md) (Iteration 4)

**Terminology:**
- **Technique catalog**: The `bjj_techniques` table — canonical list of BJJ techniques with English/Spanish names
- **AI enhance**: The existing `bjj-section-ai` Edge Function that improves workout section descriptions
- **Technique tracking**: Counting how many times a technique appears across workout history
- **Learning validation**: Logic that determines if an athlete has "learned" a technique based on practice frequency
- **Blue belt progression tracker**: The checklist feature from Iteration 6 (see `prd-bjj-blue-belt-progression.md`)

---

## 2. Summary

This initiative enhances the existing **BJJ section AI enhancement** feature to:

1. **Force explicit technique mentions** in AI-generated descriptions using bracketed canonical names from the technique catalog (e.g., _"Trabajamos pasajes [Knee Slide Pass] [Leg Drag Pass] desde media guardia"_)
2. **Track technique practice frequency** across all BJJ workout history
3. **Validate learning** with configurable thresholds per technique (e.g., "Triangle Choke requires 10 practices to be considered learned")
4. **Surface insights in the Blue Belt Progression Tracker** via:
   - Practice counters next to each checklist item (_"Triangle Choke — practiced 12 times"_)
   - Suggestion panel showing techniques detected in recent workouts with one-click marking

This creates a **data-driven progression system** where belt advancement is backed by verifiable practice history, not just self-assessment.

---

## 3. Problem and goals

### Problem

**Current state (Iteration 6):**
- The Blue Belt Progression Tracker is **self-assessment only** — athletes check off techniques manually with no validation
- The AI enhance feature detects techniques mentioned in workout notes, but:
  - Detection is **passive** (AI infers techniques but doesn't emphasize them in the output)
  - No **historical tracking** of technique frequency across workouts
  - No **link between workout history and progression checklist**
- Coaches cannot assess readiness objectively — they must trust the athlete's self-reporting

**Pain points:**
1. Athletes may check off techniques they've only practiced once or twice
2. No way to prove mastery or identify gaps in training history
3. AI-enhanced descriptions are readable but don't create structured data for analytics
4. Progression tracker and workout logs exist in silos with no connection

### Goals

- **G1:** AI-enhanced descriptions **explicitly mention techniques** from the catalog using bracketed canonical names, making them machine-parseable.
- **G2:** The system **tracks practice frequency** for every technique across all BJJ workout history.
- **G3:** Admins can **configure learning thresholds** per technique (e.g., "Kimura requires 8 practices, Triangle Choke requires 10").
- **G4:** The Blue Belt Progression Tracker shows **practice counters** next to each technique item (_"Practiced 12/10 times — ✅ Validated"_).
- **G5:** A **suggestion panel** surfaces recently practiced techniques with one-click marking in the progression tracker.
- **G6:** Coaches can see **practice history** per technique when reviewing athlete progression (links to specific workouts).
- **G7:** The system remains **conservative** — AI only mentions techniques with clear evidence in the athlete's raw description.

### Non-goals

- **NG1:** Automatic progression item marking without athlete/coach confirmation — this remains a manual approval flow.
- **NG2:** Video analysis or movement tracking — detection is text-based only.
- **NG3:** Skill level assessment (beginner/intermediate/advanced) — we track frequency, not proficiency.
- **NG4:** Technique dependencies or learning paths — this is a flat frequency tracker, not a curriculum engine.
- **NG5:** Multi-belt support in MVP — focus on blue belt only (purple/brown/black deferred to Iteration 8).

---

## 4. Users and stakeholders

| Role                           | Needs                                                                                                                                 |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Athlete (BJJ practitioner)** | See how many times I've practiced each technique; get suggestions for progression checklist items; understand which techniques I need to work on. |
| **Coach / instructor**         | Validate athlete readiness objectively using practice frequency data; see which techniques an athlete has actually worked on with links to workout history. |
| **Administrator**              | Configure learning thresholds per technique (e.g., 10 practices = learned); manage the technique catalog.                            |

**Approvers:** product owner / sponsor — TBD.

---

## 5. User stories

- **US-31:** As a BJJ athlete, I want my AI-enhanced workout descriptions to **explicitly name the techniques** I practiced, so I can clearly see what I worked on.
- **US-32:** As a BJJ athlete, I want to **see practice counters** next to each technique in my blue belt progression checklist, so I know how many times I've trained each one.
- **US-33:** As a BJJ athlete, I want a **suggestion panel** that shows techniques I recently practiced, so I can quickly mark them in my progression tracker.
- **US-34:** As a BJJ athlete, I want to **click a technique counter** to see the list of workouts where I practiced it, so I can review my training history.
- **US-35:** As a coach, I want to **see practice frequency** for each technique when reviewing an athlete's progression, so I can validate their readiness objectively.
- **US-36:** As a coach, I want to **configure learning thresholds** per technique (e.g., "Triangle requires 10 practices"), so I can define mastery criteria.
- **US-37:** As an athlete, I want the AI to **only mention techniques I actually described**, so I don't get false positives in my tracking data.
- **US-38:** As an athlete, I want to **see when I first and last practiced a technique**, so I can identify stale skills that need refreshing.

---

## 6. Functional requirements

### 6.1. Enhanced AI prompt — Bracketed technique names

**Change to `bjj-section-ai` Edge Function:**

The system prompt (in `supabase/functions/bjj-section-ai/prompt.ts`) must be updated to:

1. **Instruct the AI to write natural Spanish text**
2. **Append canonical technique names in brackets** immediately after mentioning them

**Example output format:**

```
"Trabajamos pasajes [Knee Slide Pass] [Leg Drag Pass] desde media guardia [Half Guard], enfocándonos en mantener postura dominante. Finalizamos con sumisiones [Triangle Choke] [Armbar] desde guardia cerrada."
```

**Rules:**
- Bracketed names must **exactly match** `bjj_techniques.name` (English canonical name)
- AI should **only bracket techniques with clear evidence** in the athlete's `raw_description`
- If multiple techniques of the same type are practiced, bracket each separately
- Brackets are **machine-parseable** — the backend will extract them for tracking

**Updated prompt section:**

```
Return natural Spanish text that describes the training session.
When you mention a technique, immediately append its canonical English name
in square brackets like this: "pasajes [Knee Slide Pass]".

Rules for bracketed technique names:
- Use ONLY canonical names from the technique catalog (the "name" field)
- Only bracket techniques you are confident the athlete practiced based on their description
- If uncertain, do not bracket — prefer precision over recall
- You can mention the same technique multiple times if it appears in different contexts
```

**AI response schema remains unchanged:**

```json
{
  "ai_description": "Trabajamos pasajes [Knee Slide Pass] desde media guardia [Half Guard]...",
  "matched_technique_ids": ["uuid-1", "uuid-2"]
}
```

**Backend parsing:**
- Extract all bracketed names via regex: `/\[([^\]]+)\]/g`
- Match extracted names against `bjj_techniques.name` to get UUIDs
- Store in `bjj_section_techniques` junction table (existing)

---

### 6.2. Technique practice frequency tracking

**New database table: `technique_practice_log`**

This table aggregates practice frequency per technique per user.

**Schema:**

```sql
create table public.technique_practice_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  technique_id uuid references public.bjj_techniques(id) on delete cascade not null,
  
  -- Aggregate counts
  total_practices integer not null default 1,
  first_practiced_at timestamptz not null,
  last_practiced_at timestamptz not null,
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  constraint technique_practice_log_unique unique (user_id, technique_id)
);

create index technique_practice_log_user_id_idx on public.technique_practice_log(user_id);
create index technique_practice_log_technique_id_idx on public.technique_practice_log(technique_id);
```

**Materialized view: `technique_practice_workouts`** (optional optimization)

For querying "which workouts included technique X":

```sql
create materialized view public.technique_practice_workouts as
select
  w.user_id,
  st.technique_id,
  w.id as workout_id,
  w.performed_at,
  s.section_number,
  s.goal,
  s.ai_description
from public.workouts w
join public.bjj_sections s on s.workout_id = w.id
join public.bjj_section_techniques st on st.section_id = s.id
where w.type = 'bjj'
order by w.user_id, st.technique_id, w.performed_at desc;

create index technique_practice_workouts_user_technique_idx 
  on public.technique_practice_workouts(user_id, technique_id);

-- Refresh trigger (run after workout insert/update)
create or replace function refresh_technique_practice_workouts()
returns trigger as $$
begin
  refresh materialized view concurrently technique_practice_workouts;
  return null;
end;
$$ language plpgsql;
```

**Update trigger on `bjj_section_techniques`:**

When a technique is linked to a section (via AI enhance or manual selection):

1. **Upsert `technique_practice_log`**:
   - If row exists: increment `total_practices`, update `last_practiced_at`
   - If new: create row with `total_practices = 1`, set `first_practiced_at` and `last_practiced_at` to workout's `performed_at`

```sql
create or replace function update_technique_practice_log()
returns trigger as $$
declare
  v_performed_at timestamptz;
begin
  -- Get workout performed_at via section -> workout
  select w.performed_at into v_performed_at
  from public.bjj_sections s
  join public.workouts w on w.id = s.workout_id
  where s.id = new.section_id;

  insert into public.technique_practice_log (user_id, technique_id, total_practices, first_practiced_at, last_practiced_at)
  select w.user_id, new.technique_id, 1, v_performed_at, v_performed_at
  from public.bjj_sections s
  join public.workouts w on w.id = s.workout_id
  where s.id = new.section_id
  on conflict (user_id, technique_id) do update set
    total_practices = technique_practice_log.total_practices + 1,
    last_practiced_at = greatest(technique_practice_log.last_practiced_at, v_performed_at),
    updated_at = now();

  return new;
end;
$$ language plpgsql;

create trigger technique_practice_log_trigger
  after insert on public.bjj_section_techniques
  for each row execute function update_technique_practice_log();
```

**Historical backfill:**

Run once after deploying this feature to populate `technique_practice_log` from existing `bjj_section_techniques`:

```sql
insert into public.technique_practice_log (user_id, technique_id, total_practices, first_practiced_at, last_practiced_at)
select
  w.user_id,
  st.technique_id,
  count(*) as total_practices,
  min(w.performed_at) as first_practiced_at,
  max(w.performed_at) as last_practiced_at
from public.bjj_section_techniques st
join public.bjj_sections s on s.id = st.section_id
join public.workouts w on w.id = s.workout_id
group by w.user_id, st.technique_id
on conflict (user_id, technique_id) do nothing;
```

---

### 6.3. Learning thresholds — Configurable per technique

**New table: `technique_learning_thresholds`**

```sql
create table public.technique_learning_thresholds (
  id uuid primary key default gen_random_uuid(),
  technique_id uuid references public.bjj_techniques(id) on delete cascade not null unique,
  required_practices integer not null default 10,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index technique_learning_thresholds_technique_id_idx on public.technique_learning_thresholds(technique_id);
```

**RLS:**
- Authenticated users can **read** thresholds
- Only **admins** can write (insert/update/delete)

**Default threshold:**
- If a technique has no explicit threshold, default to **10 practices**
- Admins can override per technique (e.g., "Triangle Choke" → 12, "Armbar" → 8)

**View: `technique_learning_status`**

Combines practice log + thresholds to compute "learned" status:

```sql
create view public.technique_learning_status as
select
  tpl.user_id,
  tpl.technique_id,
  t.name,
  t.name_es,
  t.category,
  tpl.total_practices,
  coalesce(tlt.required_practices, 10) as required_practices,
  (tpl.total_practices >= coalesce(tlt.required_practices, 10)) as is_learned,
  tpl.first_practiced_at,
  tpl.last_practiced_at
from public.technique_practice_log tpl
join public.bjj_techniques t on t.id = tpl.technique_id
left join public.technique_learning_thresholds tlt on tlt.technique_id = tpl.technique_id;
```

---

### 6.4. Blue Belt Progression Tracker — Practice counters

**Changes to `BlueBeltProgressionPage` component:**

For each checkable item in **Section 2: Required Techniques** (32 techniques):

1. **Fetch practice data** via new hook `useTechniqueLearningStatus(userId)`
2. **Display counter badge** next to the checkbox:
   - Format: `"Practiced X/Y times"` where X = actual, Y = threshold
   - Color:
     - Gray if X = 0
     - Amber if 0 < X < Y (in progress)
     - Green if X >= Y (learned/validated)
   - Example: `"Practiced 12/10 times — ✅ Validated"`

3. **Make counter clickable** → opens a modal showing:
   - List of workouts where the technique was practiced
   - Date, section goal, AI description (truncated)
   - Link to full workout detail page

**UI mockup (text representation):**

```
[x] Triangle Choke  [Badge: Practiced 12/10 ✅]
[ ] Armbar          [Badge: Practiced 3/8]
[ ] Kimura          [Badge: Practiced 0/10]
```

**New hook: `useTechniqueLearningStatus.ts`**

```typescript
export function useTechniqueLearningStatus(userId: string) {
  return useQuery({
    queryKey: ['technique-learning-status', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('technique_learning_status')
        .select('*')
        .eq('user_id', userId)

      if (error) throw error
      return data as TechniqueLearningStatus[]
    },
    staleTime: 60_000, // Cache for 1 minute
  })
}
```

**New component: `TechniquePracticeModal.tsx`**

Shows workout history for a specific technique. Triggered when user clicks the practice counter badge.

---

### 6.5. Suggestion panel — Recently practiced techniques

**New component: `TechniqueSuggestionPanel.tsx`**

Displayed at the top of the Blue Belt Progression page (above the global progress bar).

**Logic:**
1. Query `technique_practice_log` for techniques practiced in the **last 30 days**
2. Filter to techniques that:
   - Are part of the blue belt requirements (match `BLUE_BELT_SECTIONS` technique list)
   - Are **not yet marked complete** in `belt_progression`
3. Show up to **5 suggestions** ordered by `last_practiced_at` desc

**UI:**

```
┌─────────────────────────────────────────────────────────────────┐
│ 🔔 Recently Practiced Techniques                                │
├─────────────────────────────────────────────────────────────────┤
│ Triangle Choke (practiced 12 times) — last on May 10, 2026      │
│ [Mark as Complete in Progress Tracker]                          │
├─────────────────────────────────────────────────────────────────┤
│ Knee Slide Pass (practiced 6 times) — last on May 8, 2026       │
│ [Mark as Complete in Progress Tracker]                          │
└─────────────────────────────────────────────────────────────────┘
```

**One-click marking:**
- Button triggers the same `useBeltProgression` mutation that the checkbox uses
- Marks `belt_progression.is_complete = true`, sets `completed_at = now()`
- Panel refreshes and removes the marked item from suggestions

**Dismissal:**
- User can dismiss suggestions individually or dismiss the entire panel for the session (localStorage flag)

---

### 6.6. Coach visibility — Practice history per athlete

**Extension to admin/coach dashboard (post-MVP):**

When a coach views an athlete's blue belt progression:

1. **Show practice counters** (same as athlete view)
2. **Clickable counters** open the same workout history modal
3. **Additional coach-only view**: Aggregate analytics
   - "Which techniques are most/least practiced across all athletes?"
   - "Which athletes have low practice counts for required techniques?"

**RLS policy update (deferred to post-MVP):**

```sql
-- Coaches can read technique_practice_log for their assigned athletes
create policy "Coaches can read athlete practice logs"
  on public.technique_practice_log for select
  using (
    exists (
      select 1 from public.coach_athlete_permissions
      where coach_id = auth.uid() and athlete_id = technique_practice_log.user_id
    )
  );
```

---

## 7. User interface requirements

### 7.1. Visual design

**Practice counter badge:**
- Inline badge next to checkbox label
- Badge colors:
  - `bg-gray-200 text-gray-700` (dark mode: `bg-gray-700 text-gray-300`) if count = 0
  - `bg-amber-100 text-amber-800` (dark mode: `bg-amber-900 text-amber-200`) if 0 < count < threshold
  - `bg-green-100 text-green-800` (dark mode: `bg-green-900 text-green-200`) if count >= threshold
- Badge text: `"X/Y"` or `"X/Y ✅"` if validated

**Suggestion panel:**
- Card component at top of progression page
- Collapsible (expand/collapse button)
- Dismiss button per suggestion and global "Dismiss all" button
- Shows max 5 suggestions

**Workout history modal:**
- Dialog component (shadcn/ui `Dialog`)
- Header: Technique name + total count
- Body: Scrollable list of workouts (date, goal, truncated AI description)
- Footer: "View full workout" link

### 7.2. Accessibility

- Practice counter badges have `aria-label`: `"Triangle Choke practiced 12 out of 10 times, validated"`
- Workout history modal is keyboard-navigable (Esc to close, Tab to cycle links)
- Suggestion panel cards are focusable with keyboard (Enter to mark complete)

---

## 8. Non-functional requirements

### NFR-001: Performance

- Technique practice aggregation query must return in < 500ms for users with 100+ workouts
- Use materialized view `technique_practice_workouts` for workout history queries
- Cache `technique_learning_status` view results in React Query (60s stale time)

### NFR-002: Data consistency

- `technique_practice_log` must be **eventually consistent** with `bjj_section_techniques`
- Trigger updates are synchronous — no race conditions on practice count increments
- Historical backfill runs once after deployment via migration script

### NFR-003: Scalability

- Support 1000+ techniques in catalog (current: ~50)
- Support athletes with 500+ BJJ workouts (practice log remains performant)

### NFR-004: Configurability

- Admins can change learning thresholds without code changes (via admin UI)
- Default threshold (10 practices) is configurable via env var or app config table

### NFR-005: Backward compatibility

- Existing workouts without AI-enhanced descriptions remain queryable
- Techniques manually added (not via AI) count toward practice frequency
- No breaking changes to `bjj_techniques` or `bjj_section_techniques` tables

---

## 9. Technical approach

### 9.1. Stack

- **Backend:** Supabase PostgreSQL with triggers + views
- **Edge Function:** Modify `bjj-section-ai` prompt template (no API changes)
- **Frontend:** React 18+ with TypeScript, TanStack Query, Tailwind CSS v4
- **UI Components:** shadcn/ui (Dialog, Badge, Card)

### 9.2. Migration strategy

**Migration 1:** Create `technique_practice_log` table + trigger

```sql
-- File: supabase/migrations/20260514000001_technique_practice_log.sql
-- (SQL from §6.2 above)
```

**Migration 2:** Create `technique_learning_thresholds` table

```sql
-- File: supabase/migrations/20260514000002_technique_learning_thresholds.sql
-- (SQL from §6.3 above)
```

**Migration 3:** Create `technique_learning_status` view

```sql
-- File: supabase/migrations/20260514000003_technique_learning_status.sql
-- (SQL from §6.3 above)
```

**Migration 4:** Historical backfill of `technique_practice_log`

```sql
-- File: supabase/migrations/20260514000004_backfill_practice_log.sql
-- (SQL from §6.2 above)
```

**Migration 5 (optional):** Materialized view for workout history queries

```sql
-- File: supabase/migrations/20260514000005_technique_practice_workouts_mv.sql
-- (SQL from §6.2 above)
```

### 9.3. Edge Function changes

**File:** `supabase/functions/bjj-section-ai/prompt.ts`

Update the system prompt to include bracketing instructions (see §6.1).

**File:** `supabase/functions/bjj-section-ai/index.ts`

No changes needed — the prompt template is the only modification.

### 9.4. Frontend architecture

**New hooks:**

```
src/features/bjj/hooks/
├── useTechniqueLearningStatus.ts     # Fetch learning status per user
├── useTechniqueWorkoutHistory.ts     # Fetch workout history per technique
└── useTechniqueSuggestions.ts        # Fetch recently practiced techniques
```

**New components:**

```
src/features/bjj/components/
├── TechniquePracticeBadge.tsx        # Inline counter badge
├── TechniquePracticeModal.tsx        # Workout history modal
└── TechniqueSuggestionPanel.tsx      # Suggestion card at top of progression page
```

**Modified components:**

```
src/features/bjj/pages/BlueBeltProgressionPage.tsx  # Add practice badges + suggestion panel
src/features/bjj/components/ProgressionChecklistItem.tsx  # Render practice badge
```

**New admin page (post-MVP):**

```
src/features/admin/technique-thresholds/
└── pages/TechniqueThresholdsPage.tsx  # Configure learning thresholds
```

---

## 10. Dependencies and risks

### Dependencies

- **Iteration 6 (Blue Belt Progression Tracker)** must be deployed — this feature extends it
- **Existing `bjj_techniques` table** must have all 32+ blue belt techniques seeded
- **AI enhance feature** must be functional (MiniMax or OpenAI API configured)

### Risks

| Risk                                                                 | Impact | Mitigation                                                                                                                     |
| -------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------ |
| AI may bracket techniques incorrectly (false positives)             | Medium | Conservative prompt: "Only bracket if confident." Allow athletes to manually remove mis-detected techniques from workout logs. |
| Practice count inflation if athlete logs same workout multiple times | Low    | Accept as manual entry system — no automatic deduplication. Coach visibility helps catch anomalies.                            |
| Materialized view refresh may lag (eventual consistency)             | Low    | Refresh is triggered after insert — latency < 1s. Use direct query as fallback if MV is stale.                                |
| Learning thresholds may be too high/low for some techniques         | Medium | Make thresholds configurable per technique. Start with 10 as default, iterate based on coach feedback.                        |
| Historical backfill may be slow for large datasets                   | Low    | Run as one-time migration script. Index on `(user_id, technique_id)` ensures fast upsert.                                     |
| Suggestion panel may be noisy if athlete practices many techniques   | Low    | Limit to 5 suggestions, order by `last_practiced_at`. Add dismissal feature.                                                  |

---

## 11. Success metrics

### Adoption metrics

- **Practice counter visibility:** % of athletes who click a practice counter badge within 7 days of feature launch
- **Suggestion panel engagement:** % of athletes who mark a technique via the suggestion panel (vs. manual checkbox)

### Data quality metrics

- **Technique detection accuracy:** Manual audit of 50 random AI-enhanced descriptions → % of bracketed techniques that are correct
- **Practice log completeness:** % of BJJ workouts with at least 1 detected technique (target: >70%)

### Progression metrics

- **Validation rate:** % of checked progression items that have practice count >= threshold (target: >60% after 90 days)
- **Coach confidence:** Qualitative feedback — do coaches trust the practice data for promotion decisions?

### Technical metrics

- **Query performance:** p95 latency for `technique_learning_status` query < 500ms
- **Trigger reliability:** 0 missed updates to `technique_practice_log` (monitor with row count vs. expected count)

---

## 12. Milestones and release criteria

### Iteration 7 — MVP (Technique Tracking & Learning Validation)

**Scope:**

- AI prompt update with bracketed technique names
- `technique_practice_log` table + trigger
- `technique_learning_thresholds` table with admin UI (deferred to post-MVP if time-constrained)
- Practice counter badges in Blue Belt Progression Tracker
- Suggestion panel at top of progression page
- Workout history modal per technique

**Release criteria:**

- AI-enhanced descriptions include bracketed technique names (verified in 10 test workouts)
- `technique_practice_log` updates correctly after workout creation (E2E test)
- Practice counters display in progression tracker with correct color coding
- Suggestion panel shows recently practiced techniques and marks them on click
- Workout history modal opens and displays correct workouts per technique
- Historical backfill completes for existing workouts (verified via DB query)
- Manual testing: Create workout → enhance with AI → verify practice count increments

### Post-MVP (Future iterations)

**Iteration 7.1 — Coach Visibility:**

- Coach dashboard with athlete practice analytics
- RLS policies for coach read access to `technique_practice_log`

**Iteration 7.2 — Admin Threshold Configuration:**

- Admin UI to set learning thresholds per technique
- Bulk update feature for thresholds by category (e.g., "All submissions require 12 practices")

**Iteration 7.3 — Advanced Analytics:**

- Technique gap analysis: "You haven't practiced Omoplata in 60 days"
- Heatmap: Technique frequency over time
- Export practice data as CSV for external analysis

---

## 13. Open questions

1. **Should we allow manual adjustment of practice counts?**
   - Current: Practice count is auto-computed from `bjj_section_techniques`
   - Alternative: Allow coaches to manually increment/decrement counts (e.g., if athlete practiced outside of logged workouts)
   - **Decision needed:** Manual adjustment adds complexity — defer to coach feedback after MVP?

2. **Should learning thresholds be per athlete or global?**
   - Current: Global threshold per technique (e.g., "Triangle Choke = 10 practices" for everyone)
   - Alternative: Coaches can override thresholds per athlete (e.g., "This athlete needs 15 Triangle practices")
   - **Decision needed:** Start global, add per-athlete overrides if coaches request it?

3. **Should the suggestion panel auto-dismiss after X days?**
   - Current: Manual dismissal only
   - Alternative: Auto-hide suggestions older than 30 days
   - **Decision needed:** Auto-dismiss may frustrate users who want to mark older techniques later

4. **Should we track "declined" suggestions?**
   - Current: If athlete dismisses a suggestion, it disappears forever
   - Alternative: Track dismissals in a separate table, allow "Show dismissed suggestions" toggle
   - **Decision needed:** Adds complexity — start simple (no tracking), iterate if users complain

5. **Should validation status block progression item marking?**
   - Current: Athletes can still check progression items even if practice count < threshold (soft validation)
   - Alternative: Hard block — checkbox is disabled until threshold is met
   - **Decision needed:** Hard block may frustrate athletes who trained outside of logged workouts. Start with soft validation + coach review.

---

## 14. Integration with existing BJJ features

### 14.1. BJJ workout form — No changes required

The `BJJWorkoutFormPage` and `BJJSectionEditor` components remain unchanged. The AI enhance flow already stores `matched_technique_ids` in `bjj_section_techniques` — this is the source of truth for practice tracking.

### 14.2. Blue Belt Progression Tracker — Extensions

**File:** `src/features/bjj/pages/BlueBeltProgressionPage.tsx`

**Changes:**
1. Import `useTechniqueLearningStatus()` hook
2. Match progression items to technique IDs (via `BLUE_BELT_SECTIONS` technique name → `bjj_techniques.name` lookup)
3. Render `<TechniquePracticeBadge />` next to each checkable item in Section 2
4. Render `<TechniqueSuggestionPanel />` at the top of the page

**File:** `src/features/bjj/components/ProgressionChecklistItem.tsx`

**Changes:**
1. Accept `practiceData?: { count: number; threshold: number; isLearned: boolean }` prop
2. If `practiceData` is present, render badge next to checkbox label
3. Badge is clickable → opens `<TechniquePracticeModal />`

### 14.3. Admin panel — New threshold management page

**Route:** `/admin/technique-thresholds`

**Component:** `TechniqueThresholdsPage.tsx`

**UI:**
- Table: Technique name | Category | Current threshold (editable input) | Save button
- Bulk actions: "Set all submissions to 12 practices"
- Default threshold setting at the top

**Mutations:**
- `useUpdateTechniqueThreshold()` — upserts `technique_learning_thresholds` row

---

## 15. Data flow diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    Athlete logs BJJ workout                      │
│        "Practicamos triangulo y kimura desde guardia"            │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              AI Enhance (bjj-section-ai function)                │
│  1. Query bjj_techniques catalog                                 │
│  2. Detect "Triangle Choke" + "Kimura" in raw_description        │
│  3. Generate enhanced text with bracketed names:                 │
│     "Trabajamos sumisiones [Triangle Choke] [Kimura]..."         │
│  4. Return matched_technique_ids: [uuid-1, uuid-2]               │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Frontend applies AI result                      │
│  1. Store ai_description in bjj_sections.ai_description          │
│  2. Insert rows into bjj_section_techniques (junction table)     │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│       DB Trigger: update_technique_practice_log()                │
│  1. Upsert technique_practice_log:                               │
│     - Increment total_practices                                  │
│     - Update last_practiced_at                                   │
│  2. Refresh materialized view (optional)                         │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│            Blue Belt Progression Tracker page loads              │
│  1. Query technique_learning_status view                         │
│  2. Render practice counter badges:                              │
│     - "Triangle Choke: Practiced 12/10 ✅"                       │
│  3. Render suggestion panel:                                     │
│     - "Recently practiced: Triangle, Kimura, Armbar"             │
│  4. User clicks badge → open workout history modal               │
└─────────────────────────────────────────────────────────────────┘
```

---

## 16. Appendix: Example AI-enhanced descriptions

### Before (current):

**Input:**
- `section_goal`: "Guard passing"
- `raw_description`: "Practicamos pasajes desde media guardia con presion"

**AI output (current):**
```json
{
  "ai_description": "Trabajamos pasajes de guardia desde media guardia, enfocándonos en mantener presión constante y evitar que el oponente recupere la guardia completa.",
  "matched_technique_ids": ["uuid-half-guard", "uuid-knee-slide"]
}
```

**Issue:** Technique names are not explicit in the text. "Knee Slide" is inferred but not mentioned.

---

### After (with bracketed names):

**Input:**
- `section_goal`: "Guard passing"
- `raw_description`: "Practicamos pasajes desde media guardia con presion"

**AI output (new):**
```json
{
  "ai_description": "Trabajamos pasajes [Knee Slide Pass] [Leg Drag Pass] desde media guardia [Half Guard], enfocándonos en mantener presión constante y evitar que el oponente recupere la guardia completa.",
  "matched_technique_ids": ["uuid-knee-slide", "uuid-leg-drag", "uuid-half-guard"]
}
```

**Improvement:** Bracketed names are machine-parseable. Backend extracts `["Knee Slide Pass", "Leg Drag Pass", "Half Guard"]` → matches to UUIDs → updates practice log.

---

## 17. Next steps

1. **Review and approval:** Share PRD with stakeholders (coaches, athletes) for feedback
2. **Design mockups:** Create Figma designs for practice counter badge, suggestion panel, workout history modal
3. **Technical planning:** Break down into implementation tasks (SDD workflow)
4. **Database migrations:** Write and test migration files for new tables + triggers
5. **AI prompt iteration:** Update `bjj-section-ai/prompt.ts` and test with 20+ real workout descriptions
6. **Frontend implementation:** Build new hooks, components, and integrate into progression tracker
7. **Historical backfill:** Run one-time script to populate `technique_practice_log` from existing data
8. **E2E tests:** Playwright tests for AI enhance → practice log update → badge display → suggestion panel
9. **Manual testing:** Validate with 10+ real BJJ workouts across multiple athletes
10. **Deployment:** Feature flag rollout to beta users (coaches + 5 athletes)
11. **Feedback iteration:** Collect feedback on threshold values, badge UX, suggestion panel usefulness
12. **Documentation:** Update user-facing docs with screenshots and usage guide

---

**Document end**
