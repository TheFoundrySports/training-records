# Explore: BJJ Technique Tracking & Learning Validation (Iteration 7)

> **Change**: bjj-technique-tracking
> **Phase**: Explore
> **Artifact store**: hybrid (engram + openspec)
> **Topic key**: `sdd/bjj-technique-tracking/explore`

---

## 1. Existing BJJ Features

### 1.1 Edge Function — `bjj-section-ai`

**Location**: `supabase/functions/bjj-section-ai/`

**Files**:
- `index.ts` — main handler, AI provider adapter, config resolver, mock fallback
- `prompt.ts` — builds system prompt from technique catalog

**Current behavior**:
- Receives `{ section_goal, raw_description }` → returns `{ ai_description, matched_technique_ids }`
- Keyword search on `bjj_techniques` using ILIKE on both `name` and `name_es`
- Falls back to full catalog (50 rows) if no keywords match
- AI provider: MiniMax or OpenAI via `OPENAI_API_KEY`, configurable via `ai_settings` DB table
- Strips `<think>...</think>` thinking blocks from MiniMax responses
- Returns mock response when AI config unavailable

**Key pattern**: AI config resolved DB-first (`ai_settings` table), env var fallback.

**Prompt structure** (current in `prompt.ts`):
```
You are a Brazilian Jiu-Jitsu training assistant. Enhance the athlete's
raw section description to be clear, structured, and technically precise.
Identify which techniques from the catalog the athlete was working on...
Return ONLY valid JSON: { "ai_description": "...", "matched_technique_ids": ["uuid", ...] }
Rules: Respond always in Spanish, infer techniques from informal Spanish, only use UUIDs from catalog...
```

**What needs to change** (PRD §6.1):
- Add instruction to append bracketed canonical English names: `"pasajes [Knee Slide Pass]"`
- Bracket format: `[Canonical Name]` where name must exactly match `bjj_techniques.name`
- Only bracket techniques with clear evidence in raw description
- Max 500 chars for `ai_description` — must still be respected

### 1.2 Frontend — `src/features/bjj/`

**Structure**:
```
src/features/bjj/
├── bjj.types.ts          # BJJTechnique, BJJSection, BJJWorkout interfaces
├── bjj.schema.ts         # Zod schemas: beltProgressionItemSchema, bjjTechniqueSchema, bjjSectionSchema, bjjWorkoutSchema
├── components/
│   ├── AIPreviewPanel.tsx     # Shows AI-enhanced preview in workout form
│   ├── BJJSectionEditor.tsx  # Section editing with technique search + AI enhance button
│   ├── BJJWorkoutDetail.tsx   # Workout detail view
│   └── TechniqueSearch.tsx    # Technique autocomplete/picker
├── hooks/
│   ├── mapRow.ts              # mapTechniqueRow, mapSectionRow (DB row → TS types)
│   ├── useBJJSectionAI.ts     # Hook for AI enhance mutation
│   ├── useBJJSections.ts       # Fetch BJJ sections for a workout
│   ├── useBJJTechniques.ts     # Fetch technique catalog (with search)
│   └── useBJJWorkoutMutations.ts # CRUD for BJJ workouts
└── pages/
    └── BJJWorkoutFormPage.tsx  # Full workout form page

src/features/bjj/progression/  # Blue Belt Progression Tracker (Iteration 6)
├── pages/BeltProgressionPage.tsx
├── components/
│   ├── ProgressionChecklistItem.tsx  # Custom checkbox item
│   ├── ProgressionProgressBar.tsx     # Amber/gray progress bar
│   ├── ProgressionResetButton.tsx    # Reset dialog
│   └── ProgressionSection.tsx        # Collapsible section
├── hooks/
│   ├── useBeltProgression.ts         # Query + toggle + reset mutations
│   └── useBeltProgressionUIState.ts  # Section collapse state
├── types/belt-progression.types.ts   # BeltProgressionItem, ProgressionSection, ProgressionItem
├── utils/
│   ├── belt-progression-sections.ts  # 43 checkable items as constants
│   └── calculateProgress.ts
└── index.ts  # Barrel exports
```

### 1.3 Blue Belt Progression Tracker — Key Implementation Details

**`PROGRESSION_SECTIONS` constant** (`belt-progression-sections.ts`):
- 5 sections: Pilares (informational), Técnicas Requeridas (31 items), Sparring Skills (6), Requisitos Adicionales (5), Bonus (1)
- Each item has `id`, `label`, optional `category`, optional `techniqueId`
- **Gap**: Items do NOT currently have `techniqueId` populated (would be needed to link to `bjj_techniques.id` for badge lookup)

**`useBeltProgression` hook**:
- Query: fetches `belt_progression` rows for `belt_level = 'blue'`
- Toggle mutation: `supabase.upsert()` with `onConflict: 'user_id,belt_level,section_id,item_id'`
- Optimistic update with rollback on error
- Reset mutation: `supabase.from('belt_progression').delete().eq('belt_level', 'blue')`
- `staleTime: 60_000` (1 minute cache)

**ProgressionChecklistItem**:
- Custom checkbox (visually hidden `<input type="checkbox">` + custom div)
- No practice badge currently
- `techniqueId` is available on `ProgressionItem` but not used in the component

---

## 2. Database Schema

### 2.1 Existing Tables

**`bjj_techniques`** (`20260415000002_create_bjj_tables.sql`):
```sql
id uuid PK, name text unique, description text, category text,
youtube_url text, created_at, updated_at
```
- RLS: authenticated read, admin write
- Trigram GIN index on `name`

**`bjj_sections`** (`20260415000002_create_bjj_tables.sql`):
```sql
id uuid PK, workout_id FK→workouts, section_number int, goal text,
raw_description text, ai_description text, duration_minutes int, created_at
```

**`bjj_section_techniques`** (junction table):
```sql
section_id FK→bjj_sections, technique_id FK→bjj_techniques, PK(section_id, technique_id)
```
- RLS via section→workout→user chain

**`belt_progression`** (`20260513000001_belt_progression.sql`):
```sql
id uuid PK, user_id FK→users, belt_level text check='blue',
section_id text, item_id text, is_complete bool, completed_at timestamptz,
technique_id FK→bjj_techniques (nullable), created_at, updated_at
unique (user_id, belt_level, section_id, item_id)
```

**`belt_progression_ui_state`**:
```sql
id uuid PK, user_id FK→users, belt_level text check='blue',
section_id text, is_expanded bool, updated_at
unique (user_id, belt_level, section_id)
```

### 2.2 Required New Tables (from PRD §6.2–6.3)

**`technique_practice_log`** — aggregates practice frequency per user per technique:
```sql
id uuid PK, user_id FK→users, technique_id FK→bjj_techniques,
total_practices int default 1, first_practiced_at timestamptz,
last_practiced_at timestamptz, created_at, updated_at
unique (user_id, technique_id)
indexes on (user_id), (technique_id)
```

**`technique_learning_thresholds`** — configurable learning criteria per technique:
```sql
id uuid PK, technique_id FK→bjj_techniques unique, required_practices int default 10,
created_at, updated_at
index on (technique_id)
```

**`technique_learning_status`** (view, not table):
```sql
select tpl.user_id, tpl.technique_id, t.name, t.name_es, t.category,
  tpl.total_practices, coalesce(tlt.required_practices, 10) as required_practices,
  (tpl.total_practices >= coalesce(tlt.required_practices, 10)) as is_learned,
  tpl.first_practiced_at, tpl.last_practiced_at
from technique_practice_log tpl
join bjj_techniques t on t.id = tpl.technique_id
left join technique_learning_thresholds tlt on tlt.technique_id = tpl.technique_id
```

**Materialized view** (optional, for workout history queries):
```sql
create materialized view technique_practice_workouts as
select w.user_id, st.technique_id, w.id as workout_id, w.performed_at,
  s.section_number, s.goal, s.ai_description
from workouts w
join bjj_sections s on s.workout_id = w.id
join bjj_section_techniques st on st.section_id = s.id
where w.type = 'bjj'
```

**DB Trigger** (for automatic practice log updates):
```sql
create or replace function update_technique_practice_log()
returns trigger as $$
-- On insert to bjj_section_techniques: upsert technique_practice_log
-- increment total_practices, update last_practiced_at from workout's performed_at
$$ language plpgsql;

create trigger technique_practice_log_trigger
  after insert on public.bjj_section_techniques
  for each row execute function update_technique_practice_log();
```

---

## 3. Frontend Patterns

### 3.1 Hook Patterns

**TanStack Query conventions** (from existing hooks):
```tsx
// Query key format: ['feature-name', ...args]
queryKey: ['bjj-techniques', search ?? '']
staleTime: 60_000

// Error handling: throw { error: { code, message, details } }
if (error) throw { error: { code: error.code ?? 'UNKNOWN', message: error.message, details: error.details } }

// Row mapping: separate file (mapRow.ts) keeps mapping logic testable
```

**New hooks needed for Iteration 7** (PRD §9.4):
```
src/features/bjj/hooks/
├── useTechniqueLearningStatus.ts     # Fetch technique_learning_status view
├── useTechniqueWorkoutHistory.ts     # Fetch workouts per technique (for modal)
└── useTechniqueSuggestions.ts        # Fetch recently practiced techniques (last 30 days, ≤5, not yet checked)
```

**Proposed `useTechniqueLearningStatus`**:
```tsx
export function useTechniqueLearningStatus(userId: string) {
  return useQuery({
    queryKey: ['technique-learning-status', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('technique_learning_status')
        .select('*')
        .eq('user_id', userId)
      if (error) throw error
      return data
    },
    staleTime: 60_000,
  })
}
```

### 3.2 Component Patterns

**New components needed** (PRD §9.4):
```
src/features/bjj/components/
├── TechniquePracticeBadge.tsx        # Inline counter badge (gray/amber/green)
├── TechniquePracticeModal.tsx         # Workout history dialog
└── TechniqueSuggestionPanel.tsx        # Card at top of progression page

src/features/bjj/progression/components/
└── ProgressionChecklistItem.tsx       # MODIFIED: add practice badge
```

**Badge color logic** (PRD §7.1):
- `bg-gray-200 text-gray-700` / dark: `bg-gray-700 text-gray-300` if count = 0
- `bg-amber-100 text-amber-800` / dark: `bg-amber-900 text-amber-200` if 0 < count < threshold
- `bg-green-100 text-green-800` / dark: `bg-green-900 text-green-200` if count >= threshold
- Text: `"X/Y"` or `"X/Y ✅"` if validated

**Accessibility** (PRD §7.2):
- `aria-label`: `"Triangle Choke practiced 12 out of 10 times, validated"`
- Dialog keyboard-navigable (Esc to close)
- Suggestion panel cards focusable (Enter to mark complete)

### 3.3 Integration Points

**BeltProgressionPage** modifications (PRD §14.2):
1. Import `useTechniqueLearningStatus()` hook
2. Match progression items to technique IDs via `BLUE_BELT_SECTIONS` technique name → `bjj_techniques.name` lookup
   - **Issue**: `PROGRESSION_SECTIONS` items have `label` (Spanish) but not `techniqueId` — mapping needed
   - Current items have `category` but not `techniqueId`
   - Need to add `techniqueId` mapping to the 31 technique items in Section 2
3. Render `<TechniquePracticeBadge />` next to each checkable item in Section 2 (tecnicas section)
4. Render `<TechniqueSuggestionPanel />` at the top of the page (above global progress bar)

**ProgressionChecklistItem** modifications:
- Accept `practiceData?: { count: number; threshold: number; isLearned: boolean }` prop
- If `practiceData` present, render badge next to checkbox label
- Badge is clickable → opens `<TechniquePracticeModal />`

---

## 4. Key Risks & Observations

### 4.1 Gap: `techniqueId` Mapping Missing in Progression Items

The `PROGRESSION_SECTIONS` items in `belt-progression-sections.ts` do NOT have `techniqueId` populated. The 31 technique items in Section 2 need to be linked to `bjj_techniques.id` for the practice badge to work.

**Options**:
1. Add `techniqueId` field to `ProgressionItem` interface and populate for all 31 technique items
2. Match by name lookup (`bjj_techniques.name` → item label) at runtime
3. Create a separate mapping table/file

**Decision needed**: The PRD (§14.2) says "Match progression items to technique IDs (via `BLUE_BELT_SECTIONS` technique name → `bjj_techniques.name` lookup)" — implies option 2 (runtime lookup).

### 4.2 Prompt Engineering Risk

The AI must be instructed to:
1. Write natural Spanish (already does)
2. Append `[Canonical Name]` after mentioning a technique (new)
3. Only bracket techniques with clear evidence — conservative approach

The prompt change is minimal but critical. The existing `prompt.ts` structure is clean — just adding a rules block before the JSON instruction.

### 4.3 Backward Compatibility

- Existing workouts with AI-enhanced descriptions (without brackets) remain queryable
- The `bjj_section_techniques` junction table is the source of truth — bracket parsing is additive
- No breaking changes to existing tables

### 4.4 Historical Backfill

The PRD specifies a one-time migration to populate `technique_practice_log` from existing `bjj_section_techniques` data. This must be run after the trigger is deployed but before the frontend feature is enabled.

### 4.5 Mock Fallback in Edge Function

When AI config is unavailable, `buildMockResponse` returns a mock with fake UUIDs. This doesn't call the trigger (no `bjj_section_techniques` insert), so no practice log entry would be created in mock mode. This is fine for dev but worth noting.

---

## 5. Open Questions (from PRD §13)

| # | Question | Status |
|---|----------|--------|
| 1 | Manual adjustment of practice counts? | Deferred to post-MVP |
| 2 | Learning thresholds per athlete or global? | Start global (per technique) |
| 3 | Auto-dismiss suggestion panel after X days? | Manual dismissal only (no auto) |
| 4 | Track "declined" suggestions? | No tracking (start simple) |
| 5 | Hard block until threshold met? | Soft validation (athletes can still check) |

---

## 6. Summary of Exploration Findings

### Feasible
- Prompt update is straightforward — add bracketing rules to existing prompt.ts
- New tables follow existing migration patterns (UUID PK, timestamptz, RLS policies, updated_at trigger)
- Trigger pattern for `technique_practice_log` is well-specified in PRD
- Frontend hooks follow established conventions (query key format, row mapping, error handling)
- Badge component is self-contained

### Requires Design Decisions
1. **`techniqueId` mapping**: Runtime name lookup vs. static `techniqueId` field in progression items
2. **Materialized view**: PRD lists as optional — may defer unless workout history modal is slow
3. **Threshold admin UI**: Deferred to post-MVP, but table schema should exist in MVP

### Risks
1. **AI false positives**: Bracketing incorrect techniques pollutes practice data — conservative prompt is critical
2. **Historical backfill**: Large datasets may need batch processing or vacuum after
3. **RLS for coach visibility**: Deferred to post-MVP (7.1) but the `technique_practice_log` table should be designed with this in mind

---

*Exploration complete. Ready for SDD proposal phase.*