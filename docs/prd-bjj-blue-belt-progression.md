# Product Requirements Document: BJJ Blue Belt Progression Tracker

## 1. Document control


| Field       | Value                                                            |
| ----------- | ---------------------------------------------------------------- |
| **Title**   | BJJ Blue Belt Progression Tracker — Iteration 6                  |
| **Version** | 0.1                                                              |
| **Date**    | 2026-05-12                                                       |
| **Author**  | Francisco José Seva Mora                                         |
| **Status**  | Draft — Requirements definition for BJJ belt progression feature |


**Related links**

- Parent PRD: [docs/PRD.md](PRD.md)
- Product context: [docs/PRODUCT.md](PRODUCT.md)
- Architecture: [docs/ARCHITECTURE.md](ARCHITECTURE.md)
- Reference implementation: [https://bjj.juanjeojeda.com/cinturon_azul_bjj.html](https://bjj.juanjeojeda.com/cinturon_azul_bjj.html)

**Terminology:** This feature tracks **BJJ belt progression requirements** for athletes working toward their **blue belt**.

---

## 2. Summary

This initiative defines a **BJJ Blue Belt Progression Tracker** feature for the Training Records application. The feature allows BJJ practitioners to **track their progress toward blue belt** by checking off techniques, skills, and requirements across five structured sections: **Foundations (Pillars)**, **Required Techniques**, **Sparring Skills**, **Additional Requirements**, and **Bonus (optional)**.

The feature will be built using the existing **React + TypeScript + Tailwind CSS** stack with **Supabase** as the backend. Progress data will be stored in **Supabase PostgreSQL** (migrating from the reference implementation's browser localStorage) to enable:

- **Cross-device synchronization**
- **Historical tracking and analytics**
- **Coach visibility** (when permissions allow)
- **Data persistence and backup**

---

## 3. Problem and goals

### Problem

BJJ practitioners working toward their blue belt need a **structured way to track their technical and behavioral progress** across dozens of techniques and requirements. The current reference implementation ([https://bjj.juanjeojeda.com/cinturon_azul_bjj.html](https://bjj.juanjeojeda.com/cinturon_azul_bjj.html)) stores progress in **browser localStorage**, which means:

- Progress is **device-locked** and cannot be accessed from other devices
- No **historical tracking** or analytics over time
- No **coach or administrator visibility**
- Risk of **data loss** if browser cache is cleared

### Goals

- **G1:** Athletes can **view a structured checklist** of blue belt requirements organized by category (Foundations, Techniques, Sparring, Additional Requirements, Bonus).
- **G2:** Athletes can **check off individual items** as they master them, with progress persisted to Supabase.
- **G3:** Athletes can **see progress percentages** at both the section level and global level.
- **G4:** Progress is **synchronized across devices** via Supabase (vs. localStorage in reference implementation).
- **G5:** Progress can be **viewed by coaches or administrators** when permissions allow.
- **G6:** The UI follows the existing **Training Records design system** (Tailwind + shadcn/ui) with dark mode support.
- **G7:** Sections are **collapsible** with state persisted in the backend.
- **G8:** Athletes can **reset their progress** with confirmation (destructive action).
- **G9:** The feature is **accessible** with keyboard navigation and screen reader support per WCAG 2.2 AA.

### Non-goals

- **NG1:** Support for other belt levels (purple, brown, black) in this iteration — blue belt only.
- **NG2:** AI-generated technique recommendations or training plans — focus is manual self-assessment.
- **NG3:** Integration with actual workout logs (linking sparring sessions to progression) — may come in future iterations.
- **NG4:** Gamification features (badges, streaks, leaderboards) — focus is utilitarian tracking.
- **NG5:** Custom requirement definitions per gym/academy — requirements are fixed based on the reference implementation (La Cúpula academy standards).

---

## 4. Users and stakeholders


| Role                           | Needs                                                                                                          |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| **Athlete (BJJ practitioner)** | Track personal progress toward blue belt; see what techniques remain; measure readiness for promotion.         |
| **Coach / instructor**         | Review athlete progress across all requirements; identify gaps; decide when an athlete is ready for promotion. |
| **Administrator**              | Manage progression requirements (future: customize per academy).                                               |


**Approvers:** product owner / sponsor — TBD.

---

## 5. User stories

- **US-21:** As a BJJ athlete, I want to **see a structured checklist of blue belt requirements** organized by section, so I can understand what I need to master.
- **US-22:** As a BJJ athlete, I want to **check off individual techniques and skills** as I master them, so I can track my progress over time.
- **US-23:** As a BJJ athlete, I want to **see my progress percentage** for each section and globally, so I can measure how close I am to promotion.
- **US-24:** As a BJJ athlete, I want my progress to **sync across devices**, so I can check my status from my phone, tablet, or desktop.
- **US-25:** As a BJJ athlete, I want to **collapse and expand sections** to focus on areas I'm actively working on.
- **US-26:** As a BJJ athlete, I want to **reset my progress** with confirmation, so I can start fresh if needed (e.g., switching gyms or belt levels).
- **US-27:** As a coach, I want to **view an athlete's progression checklist**, so I can assess their readiness for promotion.
- **US-28:** As a coach, I want to **see completion percentages per section**, so I can identify which areas need more work.
- **US-29:** As an athlete, I want the progression tracker to follow the **same visual design** as the rest of the Training Records app, so the experience is consistent.
- **US-30:** As an athlete, I want to **navigate the progression tracker with my keyboard**, so I can check off items without using a mouse.

---

## 6. Functional requirements

### 6.1. Progression sections

The progression tracker is divided into **5 sections** based on the reference implementation:

#### Section 1: Foundations (Pilares del JiuJitsu)

- **Description**: 10 fundamental principles of BJJ
- **Checkboxes**: No checkboxes — this is an **informational section** only (principles to understand and apply)
- **Progress calculation**: Not included in global progress percentage

**Principles** (display only, not checkable):

1. Si estás arriba, mantente arriba.
2. Ponte de pie.
3. Lucha en las transiciones.
4. Si estás en el suelo, usa tus pies.
5. Posición antes que sumisión.
6. Tus amigos cerca, los codos más cerca.
7. Siempre hay algo que hacer.
8. La espalda, recta.
9. Compite, aunque no compitas.
10. Lucha en serio.

#### Section 2: Required Techniques (Técnicas requeridas)

- **Subsections**: 6 categories with checkable items
- **Total items**: 32 techniques
- **Progress calculation**: Included in global progress

**2.1. Comienzo de la lucha (4 items)**:

- Double Leg
- Single Leg
- Collar Drag / Arm Drag
- Guard Pull

**2.2. Pasados (5 items)**:

- Abrir la Guardia Cerrada
- Knee Slide & Leg Weave
- Double Under
- Leg Drag
- Toreando

**2.3. Guardia (8 items)**:

- Retención Básica de Guardia
- Collar y Manga
- De La Riva
- Guardia Araña y Lasso
- Guardia Mariposa
- Media Guardia
- Guardia Cerrada
- Guardia X & Single X

**2.4. Sumisiones (7 items)**:

- Triángulo
- Palanca de Brazo (Armbar)
- Kimura
- Omoplata
- Cross Choke (Estrangulación Cruzada)
- Mataleón (Rear Naked Choke)
- Llave de Pie (Botinha / Straight Ankle Lock)

**2.5. Escapes y salidas (6 items)**:

- Escape de Montada
- Escape de Control Lateral
- Escape de Espalda
- Escape de Triángulo
- Escape de Guillotina
- Escape de Palanca de Brazo (Armbar)

**2.6. Jerarquía de las posiciones (1 item)**:

- Conocer la jerarquía de las posiciones y cómo transicionar en ellas (with sub-bullets showing position hierarchy: Espalda → Montada → Control Lateral → Guardia Cerrada → Media Guardia → Guardia Abierta)

#### Section 3: Sparring Skills (Sparring)

- **Subsections**: 4 categories with checkable items
- **Total items**: 6 skills
- **Progress calculation**: Included in global progress

**3.1. Defensa y mantenimiento de la guardia (1 item)**:

- Demostrar capacidad para defender y mantener la guardia razonablemente.

**3.2. Evitar errores comunes de cinturón blanco (3 items)**:

- No pasar la guardia de rodillas.
- No abrazar al compañero en posiciones desfavorables.
- No usar técnicas ineficaces que solo funcionan contra cinturones blancos.

**3.3. Dominio de posición (1 item)**:

- Si llegas a una posición dominante, ser capaz de mantenerla.

**3.4. Actitud en sparring contra superiores (1 item)**:

- Plantar cara a compañeros con más experiencia, confiar en tu técnica.

#### Section 4: Additional Requirements (Requisitos adicionales)

- **Subsections**: 3 categories with checkable items
- **Total items**: 6 requirements
- **Progress calculation**: Included in global progress

**4.1. Ser buen compañerx (4 items)**:

- Ayudar a los demás a aprender.
- No intimidar.
- No ser el que lesiona a los demás.
- Preocuparse de que todo el mundo esté bien y aprenda.

**4.2. Edad (1 item)**:

- Ser mayor de 15 años.

**4.3. Tiempo de entrenamiento (1 item)**:

- Haber entrenado en La Cúpula al menos 1.5 a 2 años.

#### Section 5: Bonus (optional, not required)

- **Subsections**: None
- **Total items**: 1
- **Progress calculation**: Included in global progress but marked as optional

**Bonus item**:

- Competir en al menos un torneo local antes de la graduación.

---

### 6.2. Progress tracking

- **Global progress bar**: Shows overall completion percentage across all checkable items (excluding Section 1: Foundations)
- **Section progress bars**: Each section (except Foundations) displays its own completion percentage
- **Calculation**: `(checked items / total items) * 100`, rounded to nearest integer
- **Real-time updates**: Progress bars update immediately when items are checked/unchecked

**Total checkable items**: 32 (techniques) + 6 (sparring) + 6 (additional) + 1 (bonus) = **45 items**

---

### 6.3. Collapsible sections

- All sections start **collapsed by default** on first visit
- Clicking a section header **toggles expand/collapse** with smooth animation
- Collapse state is **persisted per user** in the backend
- Visual indicator: Arrow icon changes from `▶` (collapsed) to `▼` (expanded)

---

### 6.4. Reset functionality

- A **"Reiniciar Progreso"** button at the bottom allows users to reset all progress
- Clicking the button shows a **confirmation dialog**: "¿Estás seguro de que quieres reiniciar todo tu progreso? Esta acción no se puede deshacer."
- On confirmation: all checkboxes are unchecked, progress bars reset to 0%
- **Destructive action**: Cannot be undone (may add soft-delete in future iterations)

---

### 6.5. Data persistence (migration from localStorage to Supabase)

**Reference implementation**: Stores progress in browser `localStorage` with keys:
- `bjjBlueBeltProgress_LaCupula_Checkboxes_v2` (checkbox states as JSON object)
- `bjjBlueBeltProgress_LaCupula_Collapsible_v2` (section collapse states as JSON object)

**New implementation**: Store in Supabase PostgreSQL with:

**Table: `belt_progression`**
| Column         | Type      | Description                                                      |
|----------------|-----------|------------------------------------------------------------------|
| `id`           | `uuid`    | Primary key                                                      |
| `user_id`      | `uuid`    | Foreign key to `auth.users` (RLS enforced)                       |
| `belt_level`   | `text`    | Belt level (e.g., `'blue'` for MVP; enum for future iterations) |
| `section_id`   | `text`    | Section identifier (e.g., `'tecnicas'`, `'sparring'`, `'requisitos'`, `'bonus'`) |
| `item_id`      | `text`    | Item identifier (e.g., `'tecnicas-comienzo-item-0'`)             |
| `is_complete`  | `boolean` | Completion status                                                |
| `completed_at` | `timestamptz` | When the item was marked complete (null if not complete)     |
| `technique_id` | `uuid`    | **Optional** foreign key to `bjj_techniques(id)` — links progression items to the existing technique catalog for AI detection and future analytics |
| `created_at`   | `timestamptz` | Row creation timestamp                                       |
| `updated_at`   | `timestamptz` | Row update timestamp                                         |

**Unique constraint**: `(user_id, belt_level, section_id, item_id)`

**Integration with existing `bjj_techniques` table**:
- The progression tracker **does NOT duplicate** technique data
- Technique items in Section 2 (Required Techniques) **reference** the existing `bjj_techniques` table via `technique_id`
- This enables:
  - **AI enhance** can detect techniques mentioned in workout descriptions and link them to progression items
  - **Future feature**: Auto-suggest marking techniques as "practiced" when logged in BJJ workouts
  - **Analytics**: Show workout history per technique (e.g., "You practiced Triangle 12 times in the last 3 months")
  - **Bilingual support**: Use `name` and `name_es` from `bjj_techniques` for display

**Table: `belt_progression_ui_state`**


| Column        | Type          | Description                                          |
| ------------- | ------------- | ---------------------------------------------------- |
| `id`          | `uuid`        | Primary key                                          |
| `user_id`     | `uuid`        | Foreign key to `auth.users` (RLS enforced)           |
| `belt_level`  | `text`        | Belt level (e.g., `'blue'`)                          |
| `section_id`  | `text`        | Section identifier (e.g., `'pilares'`, `'tecnicas'`) |
| `is_expanded` | `boolean`     | Whether the section is expanded                      |
| `updated_at`  | `timestamptz` | Last update timestamp                                |


**Unique constraint**: `(user_id, belt_level, section_id)`

**RLS Policies**:

- Athletes can **CRUD their own progression records**
- Coaches/admins can **read** athlete progression records (future: with explicit permission grants)

---

## 7. User interface requirements

### 7.1. Visual design

- **Dark mode by default** (matches existing Training Records theme)
- **Color palette**:
  - Background: `bg-gray-900` or `#1a1a1a`
  - Card background: `bg-gray-800` or `#2a2a2a`
  - Primary accent: `amber-500` (`#f59e0b`) for progress bars, section titles, arrows
  - Text primary: `text-gray-100` or `#e0e0e0`
  - Text secondary: `text-gray-300` or `#d1d5db`
- **Typography**: Follow existing Training Records font stack (likely Inter or system sans-serif)
- **Progress bars**: Rounded, height `h-6` for sections, `h-8` for global; amber fill with percentage text centered in white

### 7.2. Layout

- **Header**:
  - Page title: "Progreso a Cinturón Azul — BJJ"
  - Subtitle: "La Cúpula" (academy name, future: make configurable)
- **Global progress card**: Displayed prominently at the top before sections
- **Notice card**: Inform user about data persistence: "Tu progreso se guarda automáticamente en tu cuenta y se sincroniza entre dispositivos."
- **Section cards**: Each section is a `section-card` with header and collapsible content
- **Reset button**: Positioned at bottom, red destructive style (`bg-red-600 hover:bg-red-700`)

### 7.3. Accessibility

- **Keyboard navigation**: All checkboxes and section headers are keyboard-accessible
- **Screen reader support**:
  - Section headers have proper `<h3>` tags
  - Progress bars include `aria-valuenow`, `aria-valuemin`, `aria-valuemax`
  - Checkboxes have associated `<label>` elements
- **Focus indicators**: Visible focus rings on interactive elements
- **Color contrast**: Meets WCAG 2.2 AA standards (amber on dark gray tested)

---

## 8. Non-functional requirements

### NFR-001: Performance

- Page load time < 2 seconds on 3G connection
- Checkbox state change < 100ms round-trip to Supabase
- Progress bar animation smooth at 60fps

### NFR-002: Scalability

- Schema supports multiple belt levels (future: purple, brown, black)
- Schema supports custom requirements per academy (future: multi-tenant)

### NFR-003: Data integrity

- No orphaned progression records (user deletion cascades)
- Checkbox state changes are atomic (no partial updates)

### NFR-004: Security

- RLS enforces user isolation (users can only access their own progression)
- Coaches/admins require explicit permission grants (future: role-based access)

### NFR-005: Accessibility

- Passes axe-core audit with 0 critical violations
- Keyboard navigation covers 100% of functionality
- Screen reader tested with VoiceOver (macOS) and NVDA (Windows)

### NFR-006: Maintainability

- Progression data schema is versioned (future: support requirement changes over time)
- UI components follow existing Training Records component library (shadcn/ui)

---

## 9. Technical approach

### 9.1. Stack

- **Frontend**: React 18+ with TypeScript
- **Styling**: Tailwind CSS v4 + shadcn/ui components
- **State management**: React Query (TanStack Query) for server state; Zustand or Context API for UI state
- **Backend**: Supabase PostgreSQL + PostgREST
- **Authentication**: Supabase Auth (existing)
- **Deployment**: Vercel (existing)

### 9.2. Database schema

**Migration file**: `supabase/migrations/20260512000001_belt_progression.sql`

```sql
-- Belt progression tracking tables

-- Main progression data
create table public.belt_progression (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  belt_level text not null,
  section_id text not null,
  item_id text not null,
  is_complete boolean not null default false,
  completed_at timestamptz,
  
  -- Link to existing bjj_techniques table for technique-based items
  -- This enables AI detection, analytics, and future auto-completion features
  technique_id uuid references public.bjj_techniques(id) on delete set null,
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  constraint belt_progression_unique_item unique (user_id, belt_level, section_id, item_id)
);

-- UI state persistence
create table public.belt_progression_ui_state (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  belt_level text not null,
  section_id text not null,
  is_expanded boolean not null default false,
  updated_at timestamptz not null default now(),
  
  constraint belt_progression_ui_state_unique unique (user_id, belt_level, section_id)
);

-- Indexes
create index belt_progression_user_id_idx on public.belt_progression(user_id);
create index belt_progression_ui_state_user_id_idx on public.belt_progression_ui_state(user_id);

-- RLS policies
alter table public.belt_progression enable row level security;
alter table public.belt_progression_ui_state enable row level security;

-- Users can CRUD their own progression
create policy "Users can manage own progression"
  on public.belt_progression
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage own UI state"
  on public.belt_progression_ui_state
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Future: Coach/admin read access
-- create policy "Coaches can read athlete progression"
--   on public.belt_progression
--   for select
--   using (
--     exists (
--       select 1 from public.coach_athlete_permissions
--       where coach_id = auth.uid() and athlete_id = belt_progression.user_id
--     )
--   );

-- Updated_at trigger
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger belt_progression_updated_at
  before update on public.belt_progression
  for each row
  execute function public.handle_updated_at();

create trigger belt_progression_ui_state_updated_at
  before update on public.belt_progression_ui_state
  for each row
  execute function public.handle_updated_at();
```

### 9.3. Frontend architecture

**Route**: `/bjj/blue-belt-progression`

**Component structure**:

```
src/features/bjj/
├── pages/
│   └── BlueBeltProgressionPage.tsx          # Main page
├── components/
│   ├── ProgressionHeader.tsx                # Header with title + global progress
│   ├── ProgressionSection.tsx               # Collapsible section card
│   ├── ProgressionChecklistItem.tsx         # Individual checkbox item
│   ├── ProgressionProgressBar.tsx           # Reusable progress bar
│   └── ProgressionResetButton.tsx           # Reset button with confirmation
├── hooks/
│   ├── useBeltProgression.ts                # React Query hook for progression data
│   └── useBeltProgressionUIState.ts         # React Query hook for UI state
├── types/
│   └── belt-progression.types.ts            # TypeScript types
└── utils/
    └── belt-progression-sections.ts         # Section definitions (constant data)
```

**Key hooks**:

```typescript
// useBeltProgression.ts
export function useBeltProgression(beltLevel: 'blue') {
  const { data, isLoading } = useQuery({
    queryKey: ['belt-progression', beltLevel],
    queryFn: () => supabase
      .from('belt_progression')
      .select('*')
      .eq('belt_level', beltLevel)
  });

  const toggleItemMutation = useMutation({
    mutationFn: ({ sectionId, itemId, isComplete }) => 
      supabase
        .from('belt_progression')
        .upsert({
          user_id: user.id,
          belt_level: beltLevel,
          section_id: sectionId,
          item_id: itemId,
          is_complete: isComplete,
          completed_at: isComplete ? new Date().toISOString() : null
        })
  });

  return { data, isLoading, toggleItem: toggleItemMutation.mutate };
}
```

### 9.4. Section definitions (static data)

**File**: `src/features/bjj/utils/belt-progression-sections.ts`

This file defines the structure of all 5 sections. For technique-based items in Section 2, each item includes a `techniqueName` field that maps to `bjj_techniques.name` for linking.

```typescript
export const BLUE_BELT_SECTIONS = [
  {
    id: 'pilares',
    title: '1. Pilares del JiuJitsu',
    description: 'Es necesario entender los pilares del JiuJitsu y aplicarlos durante las luchas.',
    isCheckable: false, // No progress tracking
    items: [
      { text: 'Si estás arriba, mantente arriba.' },
      { text: 'Ponte de pie.' },
      // ... all 10 pillars
    ]
  },
  {
    id: 'tecnicas',
    title: '2. Técnicas requeridas',
    isCheckable: true,
    subsections: [
      {
        id: 'comienzo',
        title: '2.1. Comienzo de la lucha',
        items: [
          { 
            id: 'tecnicas-comienzo-item-0', 
            text: 'Double Leg',
            techniqueName: 'Double Leg Takedown' // Links to bjj_techniques.name
          },
          { 
            id: 'tecnicas-comienzo-item-1', 
            text: 'Single Leg',
            techniqueName: 'Single Leg Takedown'
          },
          { 
            id: 'tecnicas-comienzo-item-2', 
            text: 'Collar Drag / Arm Drag',
            techniqueNames: ['Collar Drag', 'Arm Drag'] // Multiple techniques for one item
          },
          { 
            id: 'tecnicas-comienzo-item-3', 
            text: 'Guard Pull',
            techniqueName: 'Guard Pull'
          }
        ]
      },
      // ... all subsections with technique mappings
    ]
  },
  // ... all 5 sections
];
```

**Technique ID resolution**: On component mount, the frontend will:
1. Fetch all `bjj_techniques` from Supabase
2. Match `techniqueName` to `bjj_techniques.name` to get UUIDs
3. Store `technique_id` when creating/updating `belt_progression` records

This enables:
- **AI enhance** to detect when a user mentions "Triangle" in their workout notes and suggest marking the progression item
- **Future analytics**: "You've practiced Triangle in 8 workouts over the last 2 months"
- **Bilingual display**: Show `name_es` from `bjj_techniques` if user prefers Spanish

### 9.5. Migration from reference implementation

**For existing users of the reference app** (if any):

1. **Export functionality**: Provide a utility to export localStorage data to JSON
2. **Import functionality**: Provide a one-time import in Training Records to seed Supabase from exported JSON
3. **Migration guide**: Document the export/import process in `docs/`

**Not in MVP**: Automatic detection and migration (requires browser extension or server-side scraping, out of scope).

---

## 10. Dependencies and risks

### Dependencies

- Supabase migration must be applied before frontend deployment
- **Existing `bjj_techniques` table** must be populated with all 33 blue belt techniques (already done via seed.sql)
- ✅ "Leg Weave Pass" was added to seed.sql (line 1105)
- Existing authentication and authorization system must be functional
- AI enhance feature already queries `bjj_techniques` — no changes needed there

### Risks

| Risk                                           | Impact | Mitigation                                                                                                 |
| ---------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------- |
| Reference requirements may change over time    | Medium | Version the requirements in the schema; support multiple versions per belt level                           |
| Users expect customization per academy         | Medium | Design schema to support multi-tenant requirements (future); communicate fixed requirements clearly in MVP |
| Coaches need visibility but RLS is user-scoped | Medium | Defer coach visibility to post-MVP; add explicit permission grants table in future iteration               |
| Progress data is subjective (self-reported)    | Low    | Accept as self-assessment tool; communicate that instructor approval is still required for promotion       |
| ~~**"Leg Weave Pass" is missing from `bjj_techniques`**~~ | ~~**Low**~~ | ~~**Add to seed.sql before MVP deployment.**~~ ✅ **RESOLVED: Added to seed.sql line 1105** |
| Technique names in progression tracker don't match `bjj_techniques` exactly | Low | Use fuzzy matching or maintain a mapping table. For MVP, progression item text can differ from technique name (e.g., "Double Leg" → "Double Leg Takedown") |


---

## 11. Success metrics

### Adoption metrics

- **Active users**: % of BJJ athletes who access the progression tracker within 30 days of account creation
- **Engagement**: Average number of items checked per user per month

### Completion metrics

- **Section completion rate**: % of users who complete each section
- **Global completion rate**: % of users who check off all 45 items (100% progress)
- **Time to completion**: Days from first access to 100% progress (median)

### Technical metrics

- **Page load time**: p95 < 2 seconds
- **Mutation latency**: p95 < 200ms for checkbox toggle
- **Error rate**: < 0.1% for progression mutations

---

## 12. Milestones and release criteria

### Iteration 6 — MVP (Blue Belt Progression Tracker)

**Scope**:

- Schema migration and RLS policies
- Blue belt progression page with all 5 sections
- Checkbox state persistence and sync
- Section collapse state persistence
- Global and section-level progress bars
- Reset functionality with confirmation
- Accessible keyboard navigation and screen reader support

**Release criteria**:

- Database migration applied and tested
- All 5 sections render with correct content
- Checkbox state persists to Supabase and syncs across devices
- Progress bars calculate correctly (global + per-section)
- Section collapse state persists per user
- Reset button works with confirmation dialog
- Passes axe-core accessibility audit (0 critical violations)
- Manual keyboard navigation test passes
- E2E test coverage for happy path (load page → check items → verify progress → reset)

### Post-MVP (Future iterations)

**Iteration 6.1 — Coach Visibility**:

- Coach dashboard to view athlete progression
- Permission grants table and RLS policies
- Athlete-coach association UI

**Iteration 7 — Multi-Belt Support**:

- Extend schema to support purple, brown, black belt requirements
- Belt-level navigation UI
- Requirement versioning (track requirement changes over time)

**Iteration 8 — Analytics and Insights**:

- Historical progress charts (completion rate over time)
- Technique gap analysis (which techniques are least completed across all users)
- Integration with workout logs (auto-check techniques when logged in BJJ workouts)

---

## 13. Open questions

1. **Should the "Bonus" section count toward global progress?**
  - Current: Yes (1 item in denominator)
  - Alternative: Exclude from global progress, show separately as "Bonus: 0/1"
2. **Should we track completion timestamps for each item?**
  - Current: Yes (schema includes `completed_at`)
  - Use case: Future analytics, progress charts
  - Tradeoff: Adds complexity but provides historical data
3. **Should users be able to uncomplete items?**
  - Current: Yes (toggle checkbox)
  - Alternative: Only allow forward progress (checkbox becomes read-only once checked)
  - Decision: Allow toggle for self-correction
4. **Should we show a "Last updated" timestamp on the page?**
  - Current: No
  - Alternative: Display last modification timestamp below global progress
5. **Should the academy name ("La Cúpula") be configurable?**
  - Current: Hardcoded for MVP
  - Future: Support multi-tenant requirements per academy

---

## 14. Appendix: Reference implementation comparison


| Feature              | Reference (localStorage)  | New (Supabase)            |
| -------------------- | ------------------------- | ------------------------- |
| Data persistence     | Browser localStorage      | PostgreSQL (Supabase)     |
| Cross-device sync    | ❌ No                      | ✅ Yes                     |
| Historical tracking  | ❌ No                      | ✅ Yes (timestamps)        |
| Coach visibility     | ❌ No                      | 🟡 Post-MVP               |
| Multi-belt support   | ❌ No (blue only)          | 🟡 Post-MVP               |
| Progress bars        | ✅ Yes (global + section)  | ✅ Yes (global + section)  |
| Collapsible sections | ✅ Yes (localStorage)      | ✅ Yes (backend)           |
| Reset functionality  | ✅ Yes (with confirmation) | ✅ Yes (with confirmation) |
| Dark mode            | ✅ Yes                     | ✅ Yes                     |
| Accessibility        | 🟡 Partial                | ✅ WCAG 2.2 AA             |


---

## 15. Integration with existing BJJ features

### 15.1. Technique catalog (`bjj_techniques`)

The progression tracker **does NOT duplicate** technique data. Instead, it references the existing `bjj_techniques` table:

**Current state**:
- ✅ 32 techniques already in `bjj_techniques` (seeded)
- ✅ Bilingual names: `name` (English) + `name_es` (Spanish)
- ✅ Categories: `takedown`, `guard_pass`, `guard`, `submission`, `escape`
- ✅ AI enhance already queries this table to detect techniques in workout descriptions

**Required additions for MVP**:
✅ **COMPLETED**: "Leg Weave Pass" was added to `supabase/seed.sql` (line 1105)
```sql
('Leg Weave Pass', 'Paso tejido de pierna', 'Tejer la rodilla entre las piernas del oponente para establecer presión y pasar la guardia.', 'guard_pass')
```

### 15.2. AI enhance integration

The AI enhance feature (for BJJ workout sections) already:
1. Queries `bjj_techniques` to get the technique catalog
2. Uses NLP to detect mentioned techniques in `raw_description`
3. Generates enhanced descriptions with proper terminology

**How progression tracker enables AI detection**:
- When a user writes "practicamos triangulo" in their BJJ workout notes
- AI enhance detects "Triangle Choke" from `bjj_techniques`
- **Future feature**: AI can suggest: "✅ Mark 'Triángulo' as practiced in your Blue Belt progression tracker"
- This links workout history to progression items via `technique_id`

### 15.3. Future features enabled by `technique_id` linking

#### Post-MVP: Auto-suggest progression updates
- When a user logs a BJJ workout with detected techniques
- Show notification: "You practiced Triangle in today's workout. Mark it in your Blue Belt tracker?"
- One-click mark as complete with `completed_at` timestamp

#### Post-MVP: Technique practice analytics
- Per-technique view: "Triangle Choke — practiced 12 times in last 3 months"
- Show list of workouts where the technique was detected
- Chart: technique frequency over time
- Gap analysis: "You haven't practiced Omoplata in 45 days"

#### Post-MVP: Progression-driven training suggestions
- AI training evaluations can reference progression status
- Suggestion: "You haven't marked 'Leg Drag' as complete. Consider focusing on this technique in your next training session."
- Personalized workout plans based on progression gaps

### 15.4. Data flow diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     User logs BJJ workout                    │
│              "Practicamos triángulo y kimura"                │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  AI Enhance (Edge Function)                  │
│  1. Query bjj_techniques                                     │
│  2. Detect "Triangle Choke" + "Kimura"                       │
│  3. Generate enhanced description                            │
│  4. Link via bjj_section_techniques junction table           │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│            Future: Progression Auto-Suggest Service          │
│  1. Check if techniques exist in belt_progression            │
│  2. If incomplete → show notification                        │
│  3. User clicks "Mark complete"                              │
│  4. Update belt_progression.is_complete = true               │
│     + belt_progression.technique_id = <uuid>                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 16. Appendix: Technique mapping table

This table maps progression tracker items (Section 2: Required Techniques) to existing `bjj_techniques` records.

| Progression Item (display text)       | `bjj_techniques.name` (DB)      | Category      | Notes                                      |
| ------------------------------------- | ------------------------------- | ------------- | ------------------------------------------ |
| **2.1. Comienzo de la lucha**         |                                 |               |                                            |
| Double Leg                            | Double Leg Takedown             | `takedown`    | ✅ Exists                                   |
| Single Leg                            | Single Leg Takedown             | `takedown`    | ✅ Exists                                   |
| Collar Drag / Arm Drag                | Collar Drag + Arm Drag          | `takedown`    | ✅ Exists (2 techniques, 1 progression item) |
| Guard Pull                            | Guard Pull                      | `takedown`    | ✅ Exists                                   |
| **2.2. Pasados**                      |                                 |               |                                            |
| Abrir la Guardia Cerrada              | Closed Guard Break              | `guard_pass`  | ✅ Exists                                   |
| Knee Slide & Leg Weave                | Knee Slide Pass + Leg Weave Pass| `guard_pass`  | ✅ Both exist (Leg Weave Pass added)       |
| Double Under                          | Double Under Pass               | `guard_pass`  | ✅ Exists                                   |
| Leg Drag                              | Leg Drag Pass                   | `guard_pass`  | ✅ Exists                                   |
| Toreando                              | Toreando Pass                   | `guard_pass`  | ✅ Exists                                   |
| **2.3. Guardia**                      |                                 |               |                                            |
| Retención Básica de Guardia           | Basic Guard Retention           | `guard`       | ✅ Exists                                   |
| Collar y Manga                        | Collar and Sleeve Guard         | `guard`       | ✅ Exists                                   |
| De La Riva                            | De La Riva Guard                | `guard`       | ✅ Exists                                   |
| Guardia Araña y Lasso                 | Spider Guard + Lasso Guard      | `guard`       | ✅ Exists (2 techniques, 1 progression item) |
| Guardia Mariposa                      | Butterfly Guard                 | `guard`       | ✅ Exists                                   |
| Media Guardia                         | Half Guard                      | `guard`       | ✅ Exists                                   |
| Guardia Cerrada                       | Closed Guard                    | `guard`       | ✅ Exists                                   |
| Guardia X & Single X                  | X Guard + Single Leg X Guard    | `guard`       | ✅ Exists (2 techniques, 1 progression item) |
| **2.4. Sumisiones**                   |                                 |               |                                            |
| Triángulo                             | Triangle Choke                  | `submission`  | ✅ Exists                                   |
| Palanca de Brazo (Armbar)             | Armbar                          | `submission`  | ✅ Exists                                   |
| Kimura                                | Kimura                          | `submission`  | ✅ Exists                                   |
| Omoplata                              | Omoplata                        | `submission`  | ✅ Exists                                   |
| Cross Choke (Estrangulación Cruzada)  | Cross Collar Choke              | `submission`  | ✅ Exists                                   |
| Mataleón (Rear Naked Choke)           | Rear Naked Choke                | `submission`  | ✅ Exists                                   |
| Llave de Pie (Botinha / Straight Ankle Lock) | Straight Ankle Lock     | `submission`  | ✅ Exists                                   |
| **2.5. Escapes y salidas**            |                                 |               |                                            |
| Escape de Montada                     | Mount Escape                    | `escape`      | ✅ Exists                                   |
| Escape de Control Lateral             | Side Control Escape             | `escape`      | ✅ Exists                                   |
| Escape de Espalda                     | Back Escape                     | `escape`      | ✅ Exists                                   |
| Escape de Triángulo                   | Triangle Escape                 | `escape`      | ✅ Exists                                   |
| Escape de Guillotina                  | Guillotine Escape               | `escape`      | ✅ Exists                                   |
| Escape de Palanca de Brazo (Armbar)   | Armbar Escape                   | `escape`      | ✅ Exists                                   |
| **2.6. Jerarquía de las posiciones**  |                                 |               |                                            |
| Conocer la jerarquía...               | (not a technique)               | N/A           | Conceptual item, no technique link         |

**Summary**:
- **32 progression items** in Section 2 (Required Techniques)
- **33 technique records** in `bjj_techniques` (some items map to multiple techniques)
- ✅ **All techniques present** — "Leg Weave Pass" was added to seed.sql

---

## 17. Next steps

1. **Review and approval**: Share PRD with stakeholders for feedback
2. **Design mockups**: Create high-fidelity designs in Figma (optional — reference implementation is sufficient)
3. **Technical planning**: Break down into implementation tasks (SDD workflow)
4. **Database migration**: Write and test migration file
5. **Frontend implementation**: Build components, hooks, and page
6. **E2E tests**: Playwright tests for happy path and edge cases
7. **Accessibility audit**: Run axe-core and manual keyboard/screen reader tests
8. **Deployment**: Feature flag rollout to beta users
9. **Documentation**: Update user-facing docs and changelog

---

**Document end**