# Code Reference — Training Records

Deep documentation of classes, methods, patterns, and data flows. For architecture overview see [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## Table of Contents

1. [Type System](#type-system)
2. [TanStack Query Hooks](#tanstack-query-hooks)
3. [Zod Schemas](#zod-schemas)
4. [UI Components](#ui-components)
5. [Registry Pattern (WOD Formats)](#registry-pattern-wod-formats)
6. [Edge Functions (AI)](#edge-functions-ai)
7. [Auth Guards](#auth-guards)
8. [Data Flows](#data-flows)

---

## Type System

### Workout Types — `src/features/workouts/workout.types.ts`

```typescript
export type WorkoutType = 'crossfit' | 'functional' | 'bjj'

export interface Workout {
  id: string
  userId: string
  title: string
  type: WorkoutType
  performedAt: string    // ISO8601, e.g. "2026-04-05T10:00:00.000Z"
  durationMinutes: number
  rpe?: number          // 1–10, optional
  notes?: string       // Original user notes (never overwritten by AI)
  enhancedNotes?: string // AI-improved version of notes
  wodText?: string      // Raw WOD description text
  wodFormat?: string    // 'amrap' | 'for_time' | 'emom' | 'tabata' | 'ladder' | 'rft'
  payload?: Record<string, unknown> // Format-specific structured data
  garminActivityId?: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateWorkoutInput {
  title: string
  type: WorkoutType
  performedAt: string
  durationMinutes: number
  rpe?: number
  notes?: string
  enhancedNotes?: string
  wodText?: string
  wodFormat?: string
  payload?: Record<string, unknown>
}

export interface UpdateWorkoutInput extends Partial<CreateWorkoutInput> {
  id: string
}
```

**Key invariant:** `notes` and `enhancedNotes` are stored as **two separate fields**. The AI flow writes to `enhancedNotes` and never modifies `notes`.

---

### BJJ Types — `src/features/bjj/bjj.types.ts`

```typescript
export type BJJCategory = 'guard' | 'takedown' | 'submission' | 'escape' | 'transition' | 'guard_pass' | 'other'

export interface BJJTechnique {
  id: string
  name: string
  name_es?: string      // Spanish name (optional)
  description?: string
  category?: BJJCategory
  youtubeUrl?: string
  createdAt: string
  updatedAt: string
}

export interface BJJSection {
  id: string
  workoutId: string
  sectionNumber: number   // 1-indexed position within the workout
  goal: string           // What was drilled (e.g. "Guard passing from half guard")
  rawDescription?: string // User's free-text notes
  enhancedNotes?: string  // AI-enhanced version of rawDescription
  aiDescription?: string // Legacy field from older BJJ AI flow
  durationMinutes?: number
  techniques: BJJTechnique[] // Resolved via bjj_section_techniques JOIN
  createdAt: string
}

export interface BJJWorkout {
  id: string
  userId: string
  title: string
  type: 'bjj'           // Always literal 'bjj'
  performedAt: string
  durationMinutes: number
  rpe?: number
  notes?: string         // Top-level session notes (separate from section notes)
  createdAt: string
  updatedAt: string
  sections: BJJSection[] // Fetched separately — NOT a column on workouts
}
```

**Architectural note:** `BJJWorkout.sections` is **not** stored as a column on the `workouts` table. It's a resolved relationship — after fetching the workout row, a second query loads `bjj_sections` rows.

---

## TanStack Query Hooks

### `useWorkouts` — `src/features/workouts/hooks/useWorkouts.ts`

```typescript
export function useWorkouts(options: { type?: WorkoutType | 'all' } = {}): UseQueryResult<Workout[], Error>
```

**How it works:**
1. Builds a Supabase query on `workouts` table
2. Orders by `performed_at DESC` (most recent first)
3. If `options.type` is set, adds `.eq('type', type)` filter
4. Executes via `queryOptions({ queryKey: ['workouts', options.type], queryFn: ... })`
5. Returns `Workout[]` — DB rows mapped via `mapRow()` (snake_case → camelCase)

**Cache invalidation:** `['workouts']` is invalidated on create/update/delete mutations.

**`mapRow` translation:**
```typescript
// DB row → Workout domain object
{
  id: row.id,
  user_id: row.user_id,        → userId
  performed_at: row.performed_at, → performedAt
  enhanced_notes: row.enhanced_notes, → enhancedNotes
  // ... all other fields
}
```

---

### `useWorkout(id)` — `src/features/workouts/hooks/useWorkouts.ts`

```typescript
export function useWorkout(id: string): UseQueryResult<Workout, Error>
```

**How it works:** Fetches a single workout by UUID. If `data` is `null` after fetch, throws `{ error: { code: 'NOT_FOUND', message: '...' } }` — callers handle this to show a 404.

---

### `useCreateWorkout()` — `src/features/workouts/hooks/useWorkoutMutations.ts`

```typescript
export function useCreateWorkout(): UseMutation<Workout, Error, WorkoutFormValues>
```

**How it works:**
1. Calls `supabase.auth.getUser()` — throws `UNAUTHORIZED` if no session
2. Builds INSERT payload with all form fields (including `enhanced_notes` when AI was applied)
3. `.insert({ ... })` → `.select().single()` — returns the created row
4. On success: `queryClient.invalidateQueries({ queryKey: ['workouts'] })`
5. On error: throws `{ error: { code, message, details } }`

**Payload shape sent to Supabase:**
```typescript
{
  title: data.title,
  type: data.type,
  performed_at: normalizeDateTime(data.performedAt),
  duration_minutes: data.durationMinutes,
  notes: data.notes ?? null,
  enhanced_notes: data.enhancedNotes ?? null,  // AI result stored here
  rpe: data.rpe ?? null,
  wod_text: data.wodText ?? null,
  wod_format: data.wodFormat ?? null,
  payload: data.payload ?? null,
  user_id: user.id,          // from supabase.auth.getUser()
}
```

---

### `useUpdateWorkout()` — `src/features/workouts/hooks/useWorkoutMutations.ts`

```typescript
export function useUpdateWorkout(): UseMutation<Workout, Error, { id: string; data: WorkoutFormValues }>
```

**How it works:** Same as create but uses `.update().eq('id', id)`. Invalidates **both** `['workouts']` (list refresh) and `['workouts', id]` (detail page refresh) on success.

---

### `useDeleteWorkout()` — `src/features/workouts/hooks/useWorkoutMutations.ts`

```typescript
export function useDeleteWorkout(): UseMutation<void, Error, string>  // id as input
```

Simple delete. On success: invalidates `['workouts']`.

---

### `useWorkoutNotesAI()` — `src/features/workouts/hooks/useWorkoutNotesAI.ts`

```typescript
export function useWorkoutNotesAI(): {
  enhance: (input: { notes: string }, opts?: MutateOptions) => void
  enhanceAsync: (input: { notes: string }) => Promise<{ enhanced_notes: string }>
  isPending: boolean
  error: Error | null
  reset: () => void
}
```

**How it works:**
- `supabase.functions.invoke<WorkoutNotesAIResult>('workout-notes-ai', { body: { notes } })`
- Returns `{ enhanced_notes: string }` — the AI-improved version
- `isPending` = TanStack Query mutation is in flight
- `error` = failed call (network, AI provider error, etc.)

**Usage pattern:**
```typescript
const { enhance, isPending } = useWorkoutNotesAI()

// Fire-and-forget
enhance({ notes: 'squats 3x5 at 100kg' }, {
  onSuccess: (result) => setPreview(result.enhanced_notes),
  onError: (err) => setError(err.message)
})

// Promise-based
const result = await enhanceAsync({ notes: 'squats 3x5 at 100kg' })
```

---

### `useBJJSectionAI()` — `src/features/bjj/hooks/useBJJSectionAI.ts`

```typescript
export function useBJJSectionAI(): {
  enhance: (input: BJJSectionAIInput, opts?: MutateOptions) => void
  enhanceAsync: (input: BJJSectionAIInput) => Promise<BJJSectionAIResult>
  isPending: boolean
  error: Error | null
  reset: () => void
}

interface BJJSectionAIInput {
  section_goal: string    // The drilling goal, e.g. "Guard passing from half guard"
  raw_description: string // Free-text notes about what was drilled
}

interface BJJSectionAIResult {
  ai_description: string         // AI-improved description
  matched_technique_ids: string[] // Technique UUIDs matched by AI
}
```

**Same pattern as `useWorkoutNotesAI`** — wraps `supabase.functions.invoke('bjj-section-ai', { body: input })`.

---

### `useCreateBJJWorkout()` — `src/features/bjj/hooks/useBJJWorkoutMutations.ts`

```typescript
export function useCreateBJJWorkout(): UseMutation<string, Error, BJJWorkoutFormValues>
```

**How it works:** Does NOT use PostgREST insert. Instead calls the `bjj_create_workout` RPC:

```typescript
supabase.rpc('bjj_create_workout', {
  p_title: data.title,
  p_performed_at: data.performedAt,
  p_duration_min: data.durationMinutes,
  p_notes: data.notes ?? null,
  p_rpe: data.rpe ?? null,
  p_sections: data.sections.map((s, idx) => ({
    section_number: idx + 1,
    goal: s.goal,
    raw_description: s.rawDescription ?? null,
    duration_minutes: s.durationMinutes ?? null,
    technique_ids: s.techniqueIds,
    enhanced_notes: s.enhancedNotes ?? null,  // Per-section AI notes
  })),
  // p_enhanced_notes: not used at workout level (AI button was removed from BJJ form)
})
```

Returns the new workout's `uuid` as a string. On success: invalidates `['workouts']`.

---

## Zod Schemas

### `workout.schema.ts`

```typescript
export function normalizeDateTime(value: string): string
// Converts "2026-04-05T10:00" (datetime-local) → "2026-04-05T10:00:00.000Z" (ISO8601)
// Already-complete ISO strings pass through unchanged

export const workoutSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  type: z.enum(['crossfit', 'functional', 'bjj']),
  performedAt: z.string()
    .transform(normalizeDateTime)           // datetime-local → ISO8601
    .pipe(z.string().datetime({ message: 'Invalid date' })),
  durationMinutes: z.number().int().min(1).max(300),
  notes: z.string().max(2000).optional(),
  enhancedNotes: z.string().max(4000).optional(),  // AI result, max is higher than notes
  wodText: z.string().max(5000).optional(),
  rpe: z.number().int().min(1).max(10).optional(),
  wodFormat: z.enum(['amrap', 'for_time', 'emom', 'tabata', 'ladder', 'rft']).optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
})

export type WorkoutFormValues = z.infer<typeof workoutSchema>
```

**Key transformation:** `normalizeDateTime` handles the browser's native `datetime-local` input format. Without it, times like `"2026-04-05T10:00"` would be stored ambiguously (midnight in user's timezone, not UTC).

### `bjj.schema.ts`

```typescript
export const bjjSectionSchema = z.object({
  goal: z.string().min(1).max(300),
  rawDescription: z.string().max(2000).optional(),
  durationMinutes: z.number().int().min(1).max(300).optional(),
  techniqueIds: z.array(z.string().uuid()).default([]),
  enhancedNotes: z.string().max(4000).optional(),  // AI-enhanced section notes
})

export const bjjWorkoutSchema = z.object({
  title: z.string().min(1).max(200),
  performedAt: z.string()
    .transform(val => /[Z+-]/.test(val) ? val : val.length === 16 ? `${val}:00.000Z` : `${val}.000Z`)
    .pipe(z.string().datetime()),
  durationMinutes: z.number().int().min(1).max(300),
  notes: z.string().max(2000).optional(),
  // NOTE: enhancedNotes is NOT on bjjWorkoutSchema — it's per-section only
  rpe: z.number().int().min(1).max(10).optional(),
  sections: z.array(bjjSectionSchema).min(1, 'At least one section is required'),
})
```

---

## UI Components

### `BJJSectionEditor.tsx`

**Location:** `src/features/bjj/components/BJJSectionEditor.tsx`

**Props:**
```typescript
interface BJJSectionEditorProps {
  index: number              // Section position (0-based) — used for form field naming
  control: Control<BJJWorkoutFormValues>  // react-hook-form control from parent
  onRemove: () => void       // Called when "Remove" is clicked
  removeDisabled: boolean   // Prevents removing the last section
  isPending: boolean         // Form-level loading state (while saving entire workout)
}
```

**State inside component:**
```typescript
const [preview, setPreview] = useState<AIPreview | null>(null)
// AIPreview = { ai_description: string, matched_technique_ids: string[] }

const [aiError, setAiError] = useState<string | null>(null)
const enhanceInFlightRef = useRef(false)  // Sync double-submit guard
```

**Form fields** (all driven by `useWatch` + `control` from parent RHF):

| Field | RHF name | Type | Notes |
|-------|----------|------|-------|
| Goal | `sections.${index}.goal` | string (required) | "What was drilled?" |
| Notes | `sections.${index}.rawDescription` | string (optional) | User's free-text notes |
| Enhanced Notes | `sections.${index}.enhancedNotes` | string (optional) | AI result, shown below Notes |
| Duration | `sections.${index}.durationMinutes` | number (optional) | Minutes spent on this section |
| Techniques | `sections.${index}.techniqueIds` | string[] (optional) | UUIDs from `bjj_techniques` |

**AI flow — `handleEnhance`:**
```typescript
function handleEnhance() {
  if (enhanceInFlightRef.current || isAIPending || !hasGoalOrDescription) return
  enhanceInFlightRef.current = true
  setAiError(null)
  enhance(
    { section_goal: sectionGoal ?? '', raw_description: rawDescription ?? '' },
    {
      onSuccess: (result) => setPreview(result),  // Show AIPreviewPanel
      onError: (err) => setAiError(err.message),
      onSettled: () => { enhanceInFlightRef.current = false }
    }
  )
}
```

**AI flow — `handleApply`:**
```typescript
function handleApply() {
  if (!preview) return
  setValue(`sections.${index}.enhancedNotes`, preview.ai_description)
  // If AI found technique matches, update them too
  if (preview.matched_technique_ids.length > 0) {
    setValue(`sections.${index}.techniqueIds`, preview.matched_technique_ids)
  }
  setPreview(null)
}
```

**Key guard pattern:** `enhanceInFlightRef.current` is set synchronously before the async `enhance()` call. This prevents a second click from firing while React is still rendering (TanStack Query's `isPending` only becomes `true` after the async re-render cycle).

---

### `AINotesPreviewPanel.tsx`

**Location:** `src/features/workouts/components/AINotesPreviewPanel.tsx`

**Props:**
```typescript
interface AINotesPreviewPanelProps {
  enhanced_notes: string
  onApply: (notes: string) => void    // Called with the enhanced text
  onDiscard: () => void
}
```

**What it does:** Renders the AI result in a styled panel with "Apply" and "Discard" buttons. No state — purely presentational. Used by `WorkoutNotesSection` (generic workouts) and indirectly by the form flow.

```tsx
export function AINotesPreviewPanel({ enhanced_notes, onApply, onDiscard }) {
  return (
    <div className="rounded-md border bg-muted/50 px-3 py-3 space-y-3">
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-1">AI Enhanced</p>
        <p className="text-sm whitespace-pre-wrap">{enhanced_notes}</p>
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={() => onApply(enhanced_notes)}>Apply</Button>
        <Button size="sm" variant="outline" onClick={onDiscard}>Discard</Button>
      </div>
    </div>
  )
}
```

---

### `WorkoutNotesSection.tsx`

**Location:** `src/features/workouts/components/WorkoutNotesSection.tsx`

**Props:** `{ workout: Workout }`

Used on `WorkoutDetailPage` — displays `notes` and `enhancedNotes` with AI enhance capability for existing workouts.

**AI flow:**
```
handleEnhance() → enhance({ notes: workout.notes })
  → onSuccess: setPreview(result.enhanced_notes)  → AINotesPreviewPanel shown
  → onError: setAiError(message)

handleApply(enhancedNotes)
  → updateMutation.mutateAsync({ id: workout.id, data: { ..., enhancedNotes } })
  → DB UPDATE workouts SET enhanced_notes = '...' WHERE id = workout.id
  → setPreview(null)

handleDiscard() → setPreview(null)
```

**Display logic:**
```tsx
{workout.notes && <p className="text-sm whitespace-pre-wrap">{workout.notes}</p>}
{hasNotes && <Button>✦ Enhance with AI</Button>}   {/* Only when notes exist */}
{aiPreview && <AINotesPreviewPanel preview={aiPreview} onApply={handleApply} onDiscard={handleDiscard} />}
{workout.enhancedNotes && !aiPreview && (
  <div className="rounded-md border bg-muted/50 px-3 py-3">
    <Badge variant="secondary" className="text-xs">AI Enhanced</Badge>
    <p className="text-sm whitespace-pre-wrap">{workout.enhancedNotes}</p>
  </div>
)}
```

---

## Registry Pattern (WOD Formats)

### `src/features/workouts/registry/index.ts`

```typescript
const registry = new Map<WodFormat, WodFormatHandler<unknown>>()

export function registerFormat<T>(handler: WodFormatHandler<T>): void {
  registry.set(handler.id, handler)
}

export function getFormat(id: WodFormat): WodFormatHandler<any> {
  const handler = registry.get(id)
  if (!handler) throw new Error(`Unknown WOD format: ${id}`)
  return handler
}

export function getAllFormats(): WodFormatHandler<any>[] {
  return Array.from(registry.values())
}
```

**Self-registration via side-effect import:**
```typescript
// registry/formats/index.ts
import './amrap'
import './for-time'
import './emom'
import './tabata'
import './ladder'
import './rft'
// Each of these files calls registerFormat() when imported
```

**Usage in `WorkoutFormPage`:**
```typescript
const wodFormat = form.watch('wodFormat')
// ...
{hasFormat && (() => {
  const handler = getFormat(wodFormat)  // Throws if unknown format
  const FormSection = handler.FormSection
  return <FormSection control={form.control} name="payload" disabled={isPending} />
})()}
```

### `WodFormatHandler<TPayload>` interface

```typescript
export interface WodFormatHandler<TPayload = unknown> {
  id: WodFormat                         // 'amrap' | 'for_time' | ...
  label: string                         // 'AMRAP' | 'For Time' | ...
  scoreType: ScoreType                  // 'rounds' | 'time' | 'reps' | 'weight'
  defaultPayload: TPayload             // e.g. { timeCap: 20, movements: [] }
  schema: ZodType<TPayload>             // Validates the payload on submit
  FormSection: React.FC<WodFormSectionProps<TPayload>>  // Format-specific form fields
  normalizeScore?: (payload: TPayload) => Score
  // normalizeScore converts format-specific payload to a unified { type, value, unit? } score
  // e.g. AMRAP payload { roundsCompleted: 8, partialReps: 3 } → { type: 'rounds', value: 8.03 }
}
```

---

## Edge Functions (AI)

### `bjj-section-ai/index.ts`

**Purpose:** Enhance BJJ section notes + match techniques from catalog.

**Request:**
```json
POST /functions/v1/bjj-section-ai
{ "section_goal": "...", "raw_description": "..." }
```

**Response:**
```json
{ "ai_description": "...", "matched_technique_ids": ["uuid1", "uuid2"] }
```

**AIProviderAdapter class:**
```typescript
class AIProviderAdapter {
  constructor(private config: AIConfig) {}

  async complete(messages: ChatMessage[]): Promise<string> {
    // 1. 30s AbortController timeout
    // 2. POST to ${baseUrl}/chat/completions
    // 3. Headers: Authorization: Bearer <key>, Content-Type: application/json
    // 4. Body: { model, messages, temperature: 0.3, stream: false, extra_body: { reasoning_split: true } }
    // 5. Parse response — extract from choices[0].message.content
    // 6. Strip <think>...</think> reasoning blocks
    // 7. Strip ```json ... ``` markdown fences
    // 8. JSON.parse() → return string
  }
}
```

**Config resolution (3-tier fallback):**
```
1. Query ai_settings DB table → use OPENAI_API_KEY env var
2. Fall back to OPENAI_API_KEY env var + MiniMax defaults (https://api.minimax.io/v1, MiniMax-M3)
3. Return null → mock response { ai_description: "... [AI unavailable]", matched_technique_ids: [] }
```

**Technique matching flow:**
1. `extractKeywords()` — pull significant words from goal + description
2. `SELECT FROM bjj_techniques WHERE name.ilike '%keyword%' OR name_es.ilike '%keyword%' LIMIT 30`
3. If zero matches → fetch full catalog (50 rows) so AI still has options to match from
4. Pass ALL matching techniques to AI in the prompt for technique matching

**Key design: `reasoning_split: true`**
MiniMax-specific flag that separates reasoning/thinking from the final output in the response. The adapter strips `<think>...</think>` blocks to get clean content.

---

### `workout-notes-ai/index.ts`

**Purpose:** Enhance free-form workout notes with AI (grammar, clarity, bullet structure).

**Request:**
```json
POST /functions/v1/workout-notes-ai
{ "notes": "squats 3x5 at 100kg felt heavy" }
```

**Response:**
```json
{ "enhanced_notes": "• Squats: 3×5 @ 100kg\n• Felt heavy — consider deload next session" }
```

**Same `AIProviderAdapter` pattern** as `bjj-section-ai`, but:
- Uses `【】` (full-width brackets) instead of `<think>...</think>` for reasoning strip
- System prompt: fitness coach that improves clarity/grammar/structure, preserves technical fitness terms
- Mock fallback: `notes + ' [AI enhancement unavailable]'`
- No technique matching (simpler than BJJ)

**System prompt design:**
```
You are an expert fitness coach and technical editor. Your job is to enhance workout notes by improving clarity, grammar, and structure.
Rules:
- Use bullet points for sets, reps, weights, and exercises
- Keep all technical fitness terms (rep, set, EMOM, AMRAP, RPE, etc.) unchanged
- Preserve specific numbers, weights, distances, and time domains exactly as written
- Improve flow and readability without changing the actual content
- Keep the tone practical and coach-like
- Return ONLY {"enhanced_notes": "..."} — no markdown fences or explanation
```

---

### `garmin-import/index.ts`

**Purpose:** Parse uploaded `.fit` files from Garmin Connect, create garmin_activities and linked workouts.

**Auth:** Validates JWT + verifies workout ownership before processing.

**File validation:**
```typescript
if (!(file instanceof File)) return error('BAD_REQUEST', 'No file provided', 400)
if (file.size > 10 * 1024 * 1024) return error('BAD_REQUEST', 'File too large (max 10MB)', 400)
```

---

## Auth Guards

### `ProtectedRoute.tsx`

```typescript
export function ProtectedRoute() {
  const { session, isLoading } = useAuth()

  if (isLoading) return <Spinner />
  if (!session) return <Navigate to="/login" replace />

  return <Outlet />
}
```

Wraps all authenticated routes. If no session, redirects to `/login`.

### `AdminRoute.tsx`

```typescript
export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { role, isLoading } = useAuth()

  if (isLoading) return null  // Don't flash content during auth check
  if (role !== 'admin') return <Navigate to="/" replace />

  return <>{children}</>
}
```

Used for BJJ technique management (`/admin/bjj-techniques/*`) and AI settings.

### `useAuth()` — `src/features/auth/AuthContext.tsx`

```typescript
const { session, user, role, isLoading } = useAuth()
// role = user?.user_metadata?.role as 'athlete' | 'admin'
// role is undefined while isLoading, null if not set
```

Role is stored in `auth.users` metadata via `user_metadata.role`. Admin is set manually in Supabase dashboard or via admin panel.

---

## Data Flows

### Flow: BJJ AI Enhance + Save

```
User on /bjj/new
  ├── Fills section fields (goal, notes)
  ├── Clicks "✦ Enhance with AI"
  │     ├── BJJSectionEditor.handleEnhance()
  │     │     ├── enhanceInFlightRef.current = true (sync guard)
  │     │     └── useBJJSectionAI().enhance({ section_goal, raw_description })
  │     │           └── supabase.functions.invoke('bjj-section-ai', { body: {...} })
  │     │                 └── HTTP POST to Edge Function (auth via Bearer token)
  │     │                 └── Edge Function:
  │     │                       1. Validate auth (supabase.auth.getUser)
  │     │                       2. resolveAIConfig() → AI config or mock
  │     │                       3. extractKeywords() from goal + description
  │     │                       4. Query bjj_techniques (ILIKE matching)
  │     │                       5. AIProviderAdapter.complete([system, user]) → raw string
  │     │                       6. Strip <think>...</think>, strip ``` fences
  │     │                       7. JSON.parse() → { ai_description, matched_technique_ids }
  │     │                       8. Return { ai_description, matched_technique_ids }
  │     │                 └── onSuccess: setPreview({ ai_description, matched_technique_ids })
  │     │                 └── onSettled: enhanceInFlightRef.current = false
  │     └── AIPreviewPanel shows with "Apply" / "Discard" buttons
  ├── User clicks "Apply"
  │     ├── handleApply()
  │     │     ├── setValue('enhancedNotes', preview.ai_description)
  │     │     ├── setValue('techniqueIds', preview.matched_technique_ids)
  │     │     └── setPreview(null)
  │     └── Form state updated — enhancedNotes now has AI result
  └── User clicks "Save Workout"
        ├── BJJWorkoutFormPage.onSubmit(values)
        │     └── useCreateBJJWorkout().mutateAsync(values)
        │           └── supabase.rpc('bjj_create_workout', {
        │                 p_sections: [{
        │                   enhanced_notes: values.sections[0].enhancedNotes,
        │                   // ...other section fields
        │                 }]
        │               })
        │                 └── PostgreSQL transaction:
        │                       INSERT workouts → uuid
        │                       INSERT bjj_sections → uuid (includes enhanced_notes)
        │                       INSERT bjj_section_techniques (for matched techniques)
        │                       RETURN workout_id
        └── Navigate to /workouts/{newId}
```

### Flow: Workout AI Enhance (non-BJJ)

```
User on /workouts/:id (detail page)
  ├── Has existing workout with notes = "squats 3x5 at 100kg"
  ├── Clicks "✦ Enhance with AI"
  │     ├── WorkoutNotesSection.handleEnhance()
  │     │     └── useWorkoutNotesAI().enhance({ notes: workout.notes })
  │     │           └── supabase.functions.invoke('workout-notes-ai', { body: { notes } })
  │     │                 └── Edge Function: same AIProviderAdapter pattern
  │     │                 └── Returns: { enhanced_notes: "• Squats 3×5 @ 100kg..." }
  │     └── AINotesPreviewPanel shown below notes field
  ├── User clicks "Apply"
  │     ├── handleApply(enhancedNotes)
  │     │     └── useUpdateWorkout().mutateAsync({ id: workout.id, data: { ..., enhancedNotes } })
  │     │           └── UPDATE workouts SET enhanced_notes = '...' WHERE id = workout.id
  │     └── Preview dismissed — workout now shows badge + enhanced notes
  └── User clicks "Discard"
        └── Preview dismissed — notes unchanged
```

### Flow: WOD Format Selection

```
User on /workouts/new/crossfit
  ├── Selects "AMRAP" from WodFormatSelector
  │     ├── form.setValue('wodFormat', 'amrap')
  │     ├── form.setValue('payload', undefined)  // Clear previous format's payload
  │     └── wodFormat = 'amrap' (watched)
  ├── Dynamic section renders below:
  │     └── getFormat('amrap').FormSection — renders AMRAP-specific fields
  │           (time cap, movement list with reps/weight)
  ├── User fills AMRAP payload
  └── On submit:
        ├── workoutSchema.safeParse(form.getValues())
        │     └── Validates payload against amrapSchema
        └── useCreateWorkout().mutateAsync({ ...payload: { timeCap: 20, movements: [...] } })
```

---

## Security Posture

| Area | Status | Details |
|------|--------|---------|
| SQL Injection | ✅ Safe | All DB via Supabase client (parameterized) — no raw SQL |
| XSS | ✅ Safe | No `dangerouslySetInnerHTML` anywhere; React auto-escapes |
| Auth | ✅ Secure | All Edge Functions validate `supabase.auth.getUser()` |
| RLS | ✅ Active | All tables: workouts, bjj_sections, bjj_techniques, profiles, etc. |
| Secrets | ✅ Safe | API keys are env vars only (server-side); `VITE_*` vars are non-sensitive |
| Input Validation | ✅ Zod | All form inputs validated via Zod schemas before DB |
| CORS | ⚠️ Acceptable | `'Access-Control-Allow-Origin': '*'` on Edge Functions — acceptable for authenticated APIs |
| Rate Limiting | ❌ None | AI Edge Functions have no rate limiting — low priority for internal app |
| CSRF | ✅ Handled | Supabase SameSite cookie policy |

For full security audit see `security/audit-findings` in Engram.

---

## Directory Structure Reference

```
src/features/
├── auth/
│   ├── AuthContext.tsx         — useAuth() hook + session provider
│   ├── LoginPage.tsx           — Email/password login
│   ├── ProtectedRoute.tsx       — Auth guard (redirects to /login)
│   └── AdminRoute.tsx          — Admin role guard (redirects to /)
├── workouts/
│   ├── workout.types.ts         — Workout, CreateWorkoutInput, UpdateWorkoutInput
│   ├── workout.schema.ts        — workoutSchema + normalizeDateTime
│   ├── hooks/
│   │   ├── useWorkouts.ts       — useWorkouts(), useWorkout()
│   │   ├── useWorkoutMutations.ts — useCreateWorkout, useUpdateWorkout, useDeleteWorkout
│   │   ├── useWorkoutNotesAI.ts — useWorkoutNotesAI() for workout-level AI
│   │   └── mapRow.ts            — DB row → Workout domain mapper
│   ├── pages/
│   │   ├── WorkoutListPage.tsx  — /workouts — paginated list
│   │   ├── WorkoutDetailPage.tsx — /workouts/:id — detail + WorkoutNotesSection
│   │   └── WorkoutFormPage.tsx  — /workouts/new/:type + /workouts/:id/edit
│   ├── components/
│   │   ├── WorkoutNotesSection.tsx   — Notes display + AI enhance button + AINotesPreviewPanel
│   │   ├── AINotesPreviewPanel.tsx   — Apply/Discard UI for AI result
│   │   ├── WorkoutTypePicker.tsx     — CrossFit / Functional / BJJ type selector
│   │   └── WodFormatSelector.tsx    — AMRAP / For Time / EMOM / ... picker
│   └── registry/                     — Code-first WOD format system
│       ├── index.ts                  — getFormat(), getAllFormats(), registerFormat()
│       ├── types.ts                  — WodFormatHandler<T>, WodFormat, ScoreType
│       └── formats/                  — One file per format (amrap, for-time, etc.)
├── bjj/
│   ├── bjj.types.ts             — BJJTechnique, BJJSection, BJJWorkout
│   ├── bjj.schema.ts           — bjjSectionSchema, bjjWorkoutSchema
│   ├── hooks/
│   │   ├── useBJJSectionAI.ts  — useBJJSectionAI() for section-level AI
│   │   ├── useBJJWorkoutMutations.ts — useCreateBJJWorkout() (RPC call)
│   │   └── useBJJTechniques.ts — fetch/search technique catalog
│   ├── pages/
│   │   └── BJJWorkoutFormPage.tsx — /bjj/new
│   └── components/
│       ├── BJJSectionEditor.tsx — Section card with AI enhance (goal, notes, techniques)
│       ├── AIPreviewPanel.tsx   — BJJ-specific preview panel with technique badges
│       └── TechniqueSearch.tsx  — ILIKE search combobox for technique catalog
├── calendar/
│   ├── calendar.types.ts       — CalendarView, CalendarDay
│   ├── hooks/useWorkoutsByMonth.ts — fetch workouts for visible month
│   ├── pages/CalendarPage.tsx  — /calendar — month/week/day views
│   └── components/
│       ├── CalendarHeader.tsx   — Month/year nav
│       ├── CalendarGrid.tsx     — 7-column grid
│       ├── DayView.tsx         — Single day expanded view
│       └── WorkoutChip.tsx     — Colored dot on calendar cells
├── exercises/
│   ├── exercise.types.ts
│   ├── exercise.schema.ts
│   ├── hooks/ — useExercises, useExerciseMutations
│   └── pages/ — ExerciseListPage, ExerciseFormPage
├── garmin/
│   ├── hooks/useAdaptationWarning.ts — Recovery time warning
│   └── pages/GarminImportPage.tsx  — .fit file upload
└── ai/
    └── AIChatPage.tsx         — /ai — workout generation via AI

supabase/functions/
├── bjj-section-ai/            — Section AI enhancement + technique matching
├── workout-notes-ai/          — Workout notes AI enhancement
├── garmin-import/             — .fit file processing
├── exercises/                 — Admin CRUD for exercises/categories/equipment
├── ai-generate/               — Full workout generation from prompt
└── training-evaluation/       — AI coaching feedback

supabase/migrations/
├── YYYYMMDDHHMMSS_*.sql       — All schema changes versioned
└── seed.sql                    — Dev fixtures (3 users, sample workouts)
```