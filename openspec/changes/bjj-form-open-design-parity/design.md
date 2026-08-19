# Design: BJJ Workout Form — Open Design Parity

> **Change**: `bjj-form-open-design-parity`
> **Spec**: `openspec/changes/bjj-form-open-design-parity/specs/bjj-workout-form/spec.md`
> **Feature doc**: `docs/features/bjj-workout-form-open-design.md`
> **OD source**: Open Design `forms.html` (`5e17c655-dae0-443c-b191-c1967d177f4b`)

---

## Technical approach

Implement Open Design **Registrar** UX as a **presentation layer** over the existing section-based RHF form. No change to workout RPC shape or `bjj_roll_events` schema in Phases A–C. Phases D–E may add optional workout metadata columns after product approval.

**Core pattern**: AI enhance stays in `BJJSectionEditor`; aggregated roll UI moves to `#cardRolls`; save pipeline unchanged.

---

## Architecture decisions

| # | Decision | Choice | Alternatives | Rationale |
|---|----------|--------|--------------|-----------|
| D1 | Data model | Keep `sections[]` | Flat OD session | DB + AI already section-scoped |
| D2 | Roll card data | `useWatch('sections')` → flatMap rolls | Separate roll store | Single RHF source of truth |
| D3 | Confirm state | Client-only `confirmed?: boolean` on draft | DB `proposed` status pre-save | Rolls persist only after save via `useConfirmRolls` |
| D4 | Flow display | Read-only string from position labels | Free-text chain | Dashboard RPC requires canonical keys |
| D5 | Section editor rolls | Hide inline panel when `#cardRolls` ships | Duplicate panels | Avoid two review UIs |
| D6 | Draft persistence | Phase E localStorage | Supabase draft table | Smaller MVP; no migration |
| D7 | Session type | Phase D optional column | JSON in notes | Queryable if product wants Gi/No-Gi stats |

---

## Component layout (target)

```text
BJJWorkoutFormPage (.bjj-form)
├── BJJFormStepper → scrollToFormSection(targetId)
├── form-grid
│   ├── main
│   │   ├── #cardSession
│   │   ├── #cardSections → BJJSectionEditor[] (AI enhance only)
│   │   ├── #cardRolls → AggregatedRollReview (new wrapper)
│   │   └── #cardReview
│   └── aside → BJJFormSummarySidebar (+ prefs Phase E)
└── BJJFormActionBar (fixed)
```

---

## Phase A — `#cardRolls` anchor

### New / modified files

| File | Change |
|------|--------|
| `BJJWorkoutFormPage.tsx` | Add `<section id="cardRolls">`; pass aggregated rolls |
| `RollReviewPanel.tsx` | Accept `sectionLabel?`; support aggregated mode |
| `BJJSectionEditor.tsx` | Remove inline `RollReviewPanel` when global card present (prop `hideRollReview?: boolean`) |
| `useBJJFormProgress.ts` | Add `confirmedRolls` count; summary foot roll ratio |

### Data flow

```text
sections[i].rolls[]  (RHF)
        │
        ├─ BJJSectionEditor: AI enhance writes rolls
        │
        └─ #cardRolls: useWatch → flatMap with { sectionIndex, sectionGoal, roll, rollIndex }
                │
                └─ RollReviewPanel onChange → setValue(`sections.${i}.rolls.${j}`, ...)
```

### Aggregated roll type (client)

```typescript
interface AggregatedRollRow {
  sectionIndex: number
  rollIndex: number
  sectionGoal: string
  roll: BJJRollDraft
}
```

---

## Phase B — Per-roll interaction

### RollReviewPanel states

| Mode | UI | Actions |
|------|-----|---------|
| Read | role, outcome, `.flow-read` string | Confirm, Edit, Discard |
| Edit | existing Select fields | Save row / Cancel edit |

- **Confirm**: sets `confirmed: true` on draft (local); does not call API
- **Discard**: `remove` from field array
- **Batch "Confirm all"**: demote to secondary or remove when per-row confirm exists

### Flow read string

Build from `bjj_positions` lookup (same source as Select labels):

```typescript
const flowRead = [labelFrom, labelTo].filter(Boolean).join(' → ')
```

---

## Phase C — TechniqueSearch chips

- Derive unique categories from catalog prop
- Render `.chip-filters` row; active chip sets filter state
- Combine with existing search string (AND)
- Add `.empty-note` when filtered list empty
- `aria-live="polite"` region for selection feedback (OD `pickStatus` pattern)

CSS already partially present in `material-dashboard.css`; add `.chip-filters`, `.chip-filter`, `.empty-note` if missing.

---

## Phase D — Session polish

1. Move notes textarea to `#cardReview` or new `#cardNotes` with `.field-foot` + `.count` (500 max)
2. Optional RPE as `<input type="range">` with `.range-scale` labels (maps to existing `rpe` number)
3. **If approved**: migration `workouts.session_type text` + `.seg-radio` UI (Gi / No-Gi / Open mat / Comp prep)

---

## Phase E — Draft + preferences

### Draft hook

```typescript
// useBJJWorkoutDraft.ts
const DRAFT_KEY = (userId: string) => `bjj-workout-draft:${userId}`
// save: JSON.stringify(getValues())
// restore: reset(parsed) on mount with confirm dialog
```

### Preferences sidebar

UI-only switches in `BJJFormSummarySidebar` second card; wire dashboard window when settings API exists.

---

## Testing strategy

| Phase | Tests |
|-------|-------|
| A | `BJJWorkoutFormPage.test.tsx`: `#cardRolls` exists; stepper scroll target |
| A | `useBJJFormProgress` unit: confirmed/total counts |
| B | `RollReviewPanel.test.tsx`: confirm toggle, discard, edit mode |
| C | `TechniqueSearch` or section editor: chip filter, empty state |
| D | Form page: notes counter, range input |
| E | Draft hook unit tests with mocked localStorage |

Run: `pnpm exec vitest run src/features/bjj`

---

## Rollout

- **Chained PRs** recommended (one per phase)
- No feature flag required — incremental UI improvements
- Phase D session_type requires migration deploy before UI enable

---

## Risks

| Risk | Mitigation |
|------|------------|
| Dual roll panels | Hide section inline panel after Phase A |
| Confirm state lost on refresh | Accept for MVP; Phase E draft can include flags |
| Scope creep on gym/coach | Explicit non-goal until product request |
