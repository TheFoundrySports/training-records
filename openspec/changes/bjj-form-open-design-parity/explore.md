# Exploration: BJJ Workout Form — Open Design Parity

> **Change**: `bjj-form-open-design-parity`
> **Design source**: Open Design project `TheFoundry - Training Records` (`5e17c655-dae0-443c-b191-c1967d177f4b`), artifact **`forms.html`** (Material design system, 2026-08-16)
> **Related shipped work**: `bjj-form-material-review` (roll review, MaterialScope, hybrid shell v1 — commits `895336a`, `39ae9b7`)
> **Scope**: investigation only — compare OD prototype to current React form and list gaps

---

## Executive summary

Open Design **`forms.html`** proposes a **flat session-registration** experience (one session, global technique picker, dedicated roll-review card). Training Records implements a **section-based workout model** (multiple training blocks, AI enhance per section, canonical position keys). A **hybrid shell** (stepper, sidebar summary, fixed action bar, Material CSS) was partially ported in `bjj-form-material-review` follow-up work, but **information architecture and several UX patterns still diverge** from the OD artifact.

The recommended path is **visual + interaction parity where it fits the section model**, not a literal rewrite of OD’s flat data model.

---

## Open Design artifact (`forms.html`)

### Page structure

| Region | OD element | Purpose |
|--------|------------|---------|
| Top bar | `Registrar` tab + theme toggle | App chrome; links to dashboard / train |
| Page head | Eyebrow, title, subtitle, **4-step stepper** | Orientation + scroll-to-section nav |
| Main column | 4 cards: `#cardSession`, `#cardTech`, `#cardRolls`, `#cardNotes` | Progressive disclosure |
| Sidebar | Summary card + **Preferences** card | Live progress + toggles |
| Footer | Version stamp + link to dashboard | Context |
| Fixed bar | Status message + Cancel / **Save draft** / Save session | Primary actions |

### Step 1 — Session (`#cardSession`)

- Date (required), duration 10–240 min (required)
- Session type: Gi / No-Gi / Open mat / Comp prep (segmented radio)
- Gym (select), coach (text)
- Intensity: range slider 1–10 with verbal labels

### Step 2 — Techniques (`#cardTech`)

- Global catalog search + **category chip filters**
- Pick list rows (name + category + add/check)
- Selected chips with remove
- Tag: “N vinculadas”

### Step 3 — Rolls (`#cardRolls`)

- Banner explaining AI-proposed rolls feed dashboard
- Per-roll cards: read view + hidden edit view
- Actions per roll: **Confirm**, **Edit**, **Discard**
- Flow shown as **free-text arrow chain** (not position dropdowns)
- Tag: “N de M confirmados”
- Skip review link (removes all rolls; warns dashboard incomplete)

### Step 4 — Notes (`#cardNotes`)

- Session notes textarea, 500 char counter
- Hint: AI uses notes for roll proposals

### Sidebar preferences (prototype only)

- AI enhance toggle, include in dashboard, reminder notification
- Default dashboard time window select

### Completion logic (JS)

Three checks for 100% progress: valid duration, ≥1 technique, all rolls confirmed or review skipped.

---

## Current implementation (React)

### Files

| Area | Path |
|------|------|
| Page | `src/features/bjj/pages/BJJWorkoutFormPage.tsx` |
| Section editor | `src/features/bjj/components/BJJSectionEditor.tsx` |
| Roll review | `src/features/bjj/components/RollReviewPanel.tsx` |
| Technique search | `src/features/bjj/components/TechniqueSearch.tsx` |
| Form shell | `src/features/bjj/components/form/*` |
| CSS | `src/theme/material-dashboard.css` (`.bjj-form` block) |

### What already matches OD

| OD pattern | App status |
|------------|------------|
| 4-step stepper + scroll targets | ✅ `BJJFormStepper`, `useBJJFormProgress` |
| Two-column grid + sticky sidebar | ✅ `form-grid`, `BJJFormSummarySidebar` |
| Fixed action bar + contextual status | ✅ `BJJFormActionBar` |
| Material tokens (cards, inputs, tags, banners) | ✅ `.bjj-form` CSS |
| Technique picker rows/chips | ✅ `TechniqueSearch` (per section) |
| Roll list styling | ✅ `.roll`, `.roll-head`, `.flow-read` CSS |
| Progress bar in summary | ✅ `sum-track` / `sum-fill` |
| Save blocked until validation | ✅ zod + `canSubmit` |

### Material gaps vs OD

| OD feature | App today | Gap severity |
|------------|-----------|--------------|
| Dedicated `#cardRolls` section | Rolls live inside `BJJSectionEditor` after AI enhance | **Medium** — stepper target `cardRolls` missing as top-level card |
| Per-roll Confirm / Edit / Discard | Batch “Confirm all” + inline editors | **Medium** — different interaction model |
| Free-text position flow chain | Canonical `position_from` / `position_to` selects | **By design** — dashboard RPC needs keys |
| Session type (Gi/No-Gi/…) | Not in schema | **Low** — needs product decision + DB field |
| Gym + coach fields | Not in schema | **Low** — optional metadata |
| Intensity slider + word labels | RPE number input | **Low** — UX polish |
| Global technique picker (`#cardTech`) | Per-section techniques + goals | **High IA mismatch** — keep sections, adapt OD picker UX |
| Preferences sidebar | Not implemented | **Low** — mostly future settings |
| Save draft | Not implemented | **Medium** — needs persistence strategy |
| In-app theme toggle | `prefers-color-scheme` only | **Low** — product chose system theme |
| Spanish copy | English copy | **Low** — i18n follow-up |
| Notes as Step 4 card | Notes in Step 1 session card | **Low** — reorder only |
| Confirmed roll count in summary | “N ready” / “N need fix” | **Low** — copy alignment |

---

## Architectural constraint (do not break)

1. **Section-based workouts** — `bjj_sections`, per-section goals, AI enhance, technique links.
2. **Canonical positions** — `bjj_positions.key` for roll flow aggregation (see dashboard RPC).
3. **Option A validation** — unmappable rolls block save (`bjjWorkoutSchema.superRefine`).
4. **Save order** — workout RPC first, then `useConfirmRolls` (REQ-RE10).

OD’s flat session model is a **UX prototype**; the app’s **domain model stays section-based**.

---

## Risks

| Risk | Mitigation |
|------|------------|
| Literal OD port breaks section AI flow | Map OD cards onto section model; don’t collapse sections |
| Free-text flows break dashboard | Keep canonical selects; optional read-only flow summary string |
| Scope creep (preferences, drafts, gym) | Phase delivery; ship shell parity before settings |
| Duplicate technique pickers | One OD-style picker component reused in section editor |

---

## Recommended next phase

Run **proposal** with phased delivery:

- **Phase A** — Layout parity: `#cardRolls` anchor, summary copy, action bar draft button (stub)
- **Phase B** — Roll UX: per-roll confirm states aligned with OD where compatible with Option A
- **Phase C** — Session metadata + polish (session type, intensity slider, notes card split)
- **Phase D** — Preferences + draft persistence (settings table / localStorage)

See `docs/features/bjj-workout-form-open-design.md` for the full design ↔ implementation matrix.
