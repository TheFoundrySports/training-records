# Proposal: BJJ Workout Form — Open Design Parity

> **Change**: `bjj-form-open-design-parity`
> **Design source**: Open Design `forms.html` (project `5e17c655-dae0-443c-b191-c1967d177f4b`)
> **Builds on**: `bjj-form-material-review` (merged), hybrid shell commits on `main`

---

## Intent

Close the gap between the Open Design **Registrar** prototype and the production BJJ workout form while **preserving the section-based domain model** and dashboard roll-flow contracts. Athletes get the same guided registration flow OD shows (stepper, summary, roll review prominence, Material polish) without losing multi-section workouts or canonical position validation.

---

## Goals

1. **Visual and IA parity** with `forms.html` for shell components already partially ported.
2. **Prominent roll review** — dedicated `#cardRolls` region visible in the stepper journey.
3. **Technique picker UX** — OD search + category chips within each section (or shared component).
4. **Action bar parity** — contextual status messages; optional draft save in a later phase.
5. **Documented mapping** — single source of truth in `docs/features/bjj-workout-form-open-design.md`.

## Non-goals (this change)

- Replacing sections with a flat session form
- Free-text position flows instead of canonical keys
- Full app shell / topbar from OD (`Registrar` tab navigation)
- Reminder notifications and dashboard preference toggles (defer)
- Spanish localization (defer)

---

## Phased delivery

| Phase | Scope | ~Lines | Ships alone? |
|-------|--------|--------|--------------|
| **A — Roll card anchor** | Extract roll review into `#cardRolls` section; wire stepper; summary “N/M confirmed” | ~250 | Yes |
| **B — Roll interaction** | Per-roll confirm/discard UI; read/edit toggle; align tags with OD | ~300 | Needs A |
| **C — Technique picker** | Category chip filters + OD empty states on `TechniqueSearch` | ~200 | Yes |
| **D — Session polish** | Split notes to Step 4 card; optional intensity slider; session-type field (if approved) | ~250 | Yes |
| **E — Draft + prefs** | Save draft (localStorage MVP); preferences sidebar stubs | ~350 | Yes |

**Review budget risk**: High if combined — recommend chained PRs per phase.

---

## Key decisions (proposed defaults)

| # | Decision | Default | Rationale |
|---|----------|---------|-----------|
| D1 | Keep section model | Yes | DB + AI enhance already section-scoped |
| D2 | `#cardRolls` content | Aggregate rolls from all sections | OD single card; app shows combined review |
| D3 | Per-roll confirm | Map to `rolls[]` draft state + save on submit | Compatible with Option A gate |
| D4 | Flow display | Read-only arrow summary from position labels | OD visual without breaking keys |
| D5 | Save draft | Phase E; localStorage keyed by user | No schema change for MVP |
| D6 | Session type | Phase D; optional column on `workouts` | Product approval required |

---

## Success criteria

- Stepper step 3 scrolls to a visible `#cardRolls` card when any section has proposed rolls
- Summary sidebar shows confirmed/total roll counts matching OD copy pattern
- Visual comparison of form page vs `forms.html` shows matching shell (stepper, grid, action bar)
- All existing BJJ form tests pass; new tests for roll card anchor and per-roll states
- Feature doc updated and linked from GitHub issue

---

## Traceability

| Artifact | Location |
|----------|----------|
| GitHub issue | [#78](https://github.com/TheFoundrySports/training-records/issues/78) |
| Exploration | `openspec/changes/bjj-form-open-design-parity/explore.md` |
| Spec | `openspec/changes/bjj-form-open-design-parity/specs/bjj-workout-form/spec.md` |
| Design | `openspec/changes/bjj-form-open-design-parity/design.md` |
| Tasks | `openspec/changes/bjj-form-open-design-parity/tasks.md` |
| Feature doc | `docs/features/bjj-workout-form-open-design.md` |
| OD source | Open Design `forms.html` |
| Prior change | Engram `sdd/bjj-form-material-review/*` |
