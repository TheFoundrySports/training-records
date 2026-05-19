# Design: workout-export-import

## Technical Approach

Pure client-side: no new Edge Functions, no new DB tables. Export serializes data fetched via Supabase client. Import reads a JSON file via `FileReader` and recreates rows via sequential Supabase mutations.

## Architecture Decisions

| Decision | Choice | Rejected | Rationale |
|----------|--------|----------|-----------|
| Export mechanism | `URL.createObjectURL(new Blob([json], {type: 'application/json'}))` + programmatic `<a>` click + `URL.revokeObjectURL` | FileSaver library, Edge Function | No new dependencies; idiomatic browser API; no server round-trip |
| Import file input | `<input type="file" accept=".json">` + `FileReader.readAsText` | Drag-and-drop | Simpler to implement; covers the use case; consistent with browser file pickers |
| BJJ technique matching | Match by `name` (case-sensitive) in `bjj_techniques` | Match by `nameEs` or `category` | `name` is the canonical identifier in the catalog; exported data includes `name` and `nameEs` |
| Import: skip vs error on unmatched technique | Silently skip | Show error or block import | Proposal spec explicitly requires silent omission; section is still valid |
| Export all: include nested sections? | Yes, nested via Supabase `select` with joins | No — just workout rows | Export must be self-contained; import needs sections to reconstruct full workout |
| Import: duplicate handling | Always insert new row (no dedup) | Upsert by title+performedAt | Proposal spec explicitly states no deduplication |

## Export Flow

### Single workout (useExportWorkout)

```
User clicks "Export"
  → useExportWorkout.exportWorkout(workoutId)
  → supabase.from('workouts').select('*').eq('id', workoutId).single()
  → if type === 'bjj': supabase.from('bjj_sections').select(`..., bjj_section_techniques(bjj_techniques(name, name_es, category))`).eq('workout_id', workoutId)
  → serialize to JSON (only included fields per REQ-EX4)
  → URL.createObjectURL(new Blob([json], {type: 'application/json'}))
  → <a href={url} download={filename}> click
  → URL.revokeObjectURL(url)
```

### All workouts (useExportAllWorkouts)

```
User clicks "Export All"
  → useExportAllWorkouts.exportAll()
  → supabase.from('workouts').select('*').order('performed_at', {ascending: false})
  → Promise.all(workouts.map(w => fetchSections(w)))  // only for type==='bjj'
  → serialize root { version, exportedAt, workouts }
  → same Blob + <a> download mechanism
```

## Import Flow (useImportWorkouts)

```
User selects file
  → FileReader.readAsText(file) → raw string
  → JSON.parse(raw) → validate version === 1
  → for each workout in workouts[]:
      → supabase.from('workouts').insert({ title, type, performed_at, duration_minutes, rpe, notes, enhanced_notes, wod_format, wod_text, payload, user_id: auth.uid() }) → get workoutId
      → if type === 'bjj' and sections:
          → for each section in sections:
              → supabase.from('bjj_sections').insert({ workout_id, section_number, goal, raw_description, ai_description, duration_minutes }) → get sectionId
              → for each technique in section.techniques:
                  → supabase.from('bjj_techniques').select('id').eq('name', technique.name).single() → techniqueId (if found)
                  → if techniqueId: supabase.from('bjj_section_techniques').insert({ section_id, technique_id })
  → on success: invalidate workouts query, return count
  → on error: throw with code and message
```

## Supabase Nested Select for Export (BJJ)

```typescript
// Fetch single BJJ workout with sections + techniques
supabase
  .from('bjj_sections')
  .select(`
    section_number, goal, raw_description, ai_description, duration_minutes,
    bjj_section_techniques (
      bjj_techniques ( name, name_es, category )
    )
  `)
  .eq('workout_id', workoutId)
  .order('section_number', { ascending: true })
```

**Note**: The `bjj_section_techniques` junction table is included implicitly via the FK relationship. The join fetches `bjj_techniques` fields needed for export and import re-matching.

## JSON Shape (Export)

```json
{
  "version": 1,
  "exportedAt": "2026-05-18T14:30:00.000Z",
  "workouts": [
    {
      "title": "Morning BJJ",
      "type": "bjj",
      "performedAt": "2026-05-18T09:00:00.000Z",
      "durationMinutes": 60,
      "rpe": 7,
      "notes": "Focused on guard passing",
      "enhancedNotes": null,
      "wodFormat": null,
      "wodText": null,
      "payload": null,
      "sections": [
        {
          "sectionNumber": 1,
          "goal": "Warmup",
          "rawDescription": "10 min easy flow",
          "aiDescription": null,
          "durationMinutes": 10,
          "techniques": [
            { "name": "Hip Escape", "nameEs": "Escape de cadera", "category": "defense" },
            { "name": "Technical Stand-up", "nameEs": "Parada técnica", "category": "transition" }
          ]
        }
      ]
    },
    {
      "title": "Fran",
      "type": "crossfit",
      "performedAt": "2026-05-17T08:00:00.000Z",
      "durationMinutes": 20,
      "rpe": 9,
      "notes": null,
      "enhancedNotes": null,
      "wodFormat": "for_time",
      "wodText": "21-15-9 Thrusters and Pull-ups",
      "payload": { "exercises": [...] },
      "sections": null
    }
  ]
}
```

## File Locations

```
src/features/workouts/
  hooks/
    useExportWorkout.ts          # single workout export hook
    useExportAllWorkouts.ts      # all workouts export hook
    useImportWorkouts.ts         # import with mutation logic
  components/
    ExportWorkoutButton.tsx       # Button + Download icon, wraps useExportWorkout
    ExportAllWorkoutsButton.tsx  # Button + Download icon, wraps useExportAllWorkouts
    ImportWorkoutsModal.tsx       # Dialog with file input + progress/success/error
src/features/workouts/pages/
  WorkoutListPage.tsx             # MODIFIED: add ExportAll button + ImportWorkoutsModal
  WorkoutDetailPage.tsx           # MODIFIED: add ExportWorkoutButton
```

## Hook Signatures

### useExportWorkout(workoutId)

```typescript
export function useExportWorkout(workoutId: string) {
  return useMutation({
    mutationFn: async () => {
      const { data: workout, error } = await supabase
        .from('workouts').select('*').eq('id', workoutId).single()
      if (error || !workout) throw error

      let sections = null
      if (workout.type === 'bjj') {
        const { data: sectionsData } = await supabase
          .from('bjj_sections')
          .select(`section_number, goal, raw_description, ai_description, duration_minutes,
                   bjj_section_techniques(bjj_techniques(name, name_es, category))`)
          .eq('workout_id', workoutId)
          .order('section_number')
        sections = sectionsData
      }

      const exportData = buildExportWorkout(workout, sections)
      const json = JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), workouts: [exportData] }, null, 2)

      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const filename = `workout-${slugify(workout.title)}-${formatDate(workout.performed_at)}.json`
      const a = document.createElement('a')
      a.href = url; a.download = filename; a.click()
      URL.revokeObjectURL(url)
    },
  })
}
```

### useExportAllWorkouts()

```typescript
export function useExportAllWorkouts() {
  return useMutation({
    mutationFn: async () => {
      const { data: workouts, error } = await supabase
        .from('workouts').select('*').order('performed_at', { ascending: false })
      if (error) throw error

      const withSections = await Promise.all(workouts.map(async (w) => {
        if (w.type !== 'bjj') return w
        const { data: sections } = await supabase
          .from('bjj_sections')
          .select(`...`)
          .eq('workout_id', w.id).order('section_number')
        return { ...w, sections }
      }))

      const root = { version: 1, exportedAt: new Date().toISOString(), workouts: withSections.map(buildExportWorkout) }
      const json = JSON.stringify(root, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `workouts-export-${formatDate(new Date())}.json`; a.click()
      URL.revokeObjectURL(url)
    },
  })
}
```

### useImportWorkouts()

```typescript
export function useImportWorkouts() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (file: File): Promise<number> => {
      const text = await file.text()
      const parsed = JSON.parse(text)

      if (parsed.version !== 1) {
        throw { code: 'UNSUPPORTED_VERSION', message: 'Unsupported format version' }
      }

      let count = 0
      const { data: user } = await supabase.auth.getUser()
      const userId = user?.user?.id
      if (!userId) throw { code: 'AUTH_ERROR', message: 'Not authenticated' }

      for (const w of parsed.workouts) {
        const { data: workoutRow, error: workoutError } = await supabase
          .from('workouts')
          .insert({
            title: w.title,
            type: w.type,
            performed_at: w.performedAt,
            duration_minutes: w.durationMinutes,
            rpe: w.rpe,
            notes: w.notes,
            enhanced_notes: w.enhancedNotes,
            wod_format: w.wodFormat,
            wod_text: w.wodText,
            payload: w.payload,
            user_id: userId,
          })
          .select().single()

        if (workoutError || !workoutRow) throw { code: 'INSERT_ERROR', message: workoutError?.message }

        if (w.type === 'bjj' && Array.isArray(w.sections)) {
          for (const sec of w.sections) {
            const { data: sectionRow } = await supabase
              .from('bjj_sections')
              .insert({ workout_id: workoutRow.id, section_number: sec.sectionNumber, goal: sec.goal, raw_description: sec.rawDescription, ai_description: sec.aiDescription, duration_minutes: sec.durationMinutes })
              .select().single()

            if (!sectionRow) continue

            for (const tech of sec.techniques ?? []) {
              const { data: techRow } = await supabase
                .from('bjj_techniques')
                .select('id')
                .eq('name', tech.name).single()

              if (techRow) {
                await supabase
                  .from('bjj_section_techniques')
                  .insert({ section_id: sectionRow.id, technique_id: techRow.id })
              }
            }
          }
        }
        count++
      }

      return count
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['workouts'] })
    },
  })
}
```

## Component Details

### ExportWorkoutButton

Wraps `useExportWorkout`. Renders a `Button` with `Download` icon. Props: `workoutId`, `className?`, `variant?`, `size?`. Shows spinner or disabled state while `isExporting`.

### ExportAllWorkoutsButton

Wraps `useExportAllWorkouts`. Renders a `Button` with `Download` icon + label "Export All". Props: `className?`, `variant?`, `size?`.

### ImportWorkoutsModal

Full `Dialog` with:
- File input (`<input type="file" accept=".json">`)
- "Import" button (disabled while no file selected or `isImporting`)
- Success state: green checkmark + "N workouts imported" + Close button
- Error state: red alert + specific error message + "Try again" button
- Idle state: drag-and-drop hint text + "Choose file" button

## Open Questions

None. Design is fully specified.