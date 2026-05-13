# Proposal: BJJ Blue Belt Progression Tracker

## Intent

Allow BJJ athletes to track their blue belt requirements (45 items across 5 sections) with Supabase-persisted checkmarks, collapsible sections, and real-time progress percentages. Migrates from localStorage to backend storage for cross-device sync.

## Scope

### In Scope
- Supabase migration: `belt_progression` + `belt_progression_ui_state` tables with RLS
- New route: `/bjj/blue-belt-progression`
- React page + components: `ProgressionPage`, `ProgressionSection`, `ProgressionChecklistItem`, `ProgressionProgressBar`, `ProgressionResetButton`
- TanStack Query hooks: `useBeltProgression`, `useBeltProgressionUIState` with toggle/reset mutations
- Static section definitions: 45 items across 5 sections (Section 1 informational only, no checkboxes)
- E2E tests: check item, collapse section, progress calculation, reset with confirmation
- Unit tests: progress calculation utilities
- WCAG 2.2 AA accessibility (keyboard nav, aria attributes, axe-core)

### Out of Scope
- Coach visibility permissions (post-MVP 6.1)
- Many-to-many technique linking (single optional `technique_id` FK per MVP)
- AI-suggested progression from workout logs (post-MVP)
- Other belt levels (purple, brown, black)

## Capabilities

### New Capabilities
- `belt-progression-tracking`: Self-service checklist for 45 blue belt requirements with real-time progress bars and section collapse state persisted per user

### Modified Capabilities
- None

## Approach

- **Feature structure**: `src/features/bjj/progression/` following existing BJJ patterns
- **Tables**: `belt_progression` (user checkmarks) + `belt_progression_ui_state` (collapse state), both with RLS enforcing user isolation
- **UI**: React + Tailwind CSS v4 + shadcn/ui (Card, Button, Dialog); custom ProgressBar and Collapsible components
- **State**: TanStack Query for server state; React state for UI (collapse is optimistic with backend persistence)
- **technique_id FK**: Optional link to `bjj_techniques` for future AI detection and analytics; single FK per item (MVP decision)
- **No localStorage migration**: Users re-check manually (acceptable per PRD risk)
- **Seed**: 45 progression items defined as static TypeScript constants in `belt-progression-sections.ts`

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `supabase/migrations/` | New | `20260512000001_belt_progression.sql` — tables, RLS, triggers |
| `src/features/bjj/` | New | `progression/` subdirectory with page, components, hooks, types, utils |
| `src/lib/supabase.ts` | Modified | Add `belt_progression`, `belt_progression_ui_state` table types |
| `src/features/bjj/bjj.schema.ts` | Modified | Add Zod schemas for belt progression |
| `src/routes.ts` | Modified | Add `/bjj/blue-belt-progression` route |
| `e2e/` | New | Playwright tests for progression tracker |
| `src/utils/__tests__/` | New | Unit tests for progress calculation |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| 45 checkboxes + 5 collapsibles = heavy a11y surface | Medium | Test keyboard nav + screen reader (VoiceOver/NVDA) during verify; add aria-expanded/aria-checked |
| Amber progress bars on dark background — WCAG AA contrast | Low | Use `amber-400` (#fbbf24) not `amber-500`; verify with axe-core |
| Multi-technique items ("Spider Guard + Lasso") link to only one technique | Low | Accept MVP limitation; future many-to-many resolves |

## Rollback Plan

1. Revert migration: `DROP TABLE IF EXISTS belt_progression_ui_state; DROP TABLE IF EXISTS belt_progression;`
2. Remove `src/features/bjj/progression/` directory
3. Revert route changes in `src/routes.ts`
4. Deploy — users return to no progression tracker

## Dependencies

- Existing `bjj_techniques` table fully seeded (33 techniques, confirmed complete)
- Supabase Auth functional (RLS depends on `auth.uid()`)

## Success Criteria

- [ ] Page loads at `/bjj/blue-belt-progression` with all 5 sections rendered
- [ ] Checking an item persists to Supabase and survives page refresh
- [ ] Global progress = `(checked / 45) * 100` — Section 1 excluded from denominator
- [ ] Section collapse state persists across sessions per user
- [ ] Reset with confirmation clears all user progress
- [ ] axe-core reports 0 critical violations
- [ ] E2E tests pass: check → collapse → progress calc → reset flow
