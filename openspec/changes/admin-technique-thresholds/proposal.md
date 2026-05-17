# Proposal: admin-technique-thresholds

## Intent

Coaches need to configure per-technique learning thresholds (how many practices = "learned") to define mastery criteria. The database table `technique_learning_thresholds` exists (migration 20260514000002) but has no admin UI. This change builds that UI at `/admin/technique-thresholds`.

## Scope

### In Scope
- Admin page at `/admin/technique-thresholds` listing all BJJ techniques with editable threshold inputs
- `useUpdateTechniqueThreshold()` hook (TanStack Query mutation, upsert pattern)
- Threshold editing per technique with immediate save
- Default threshold display and setting (fallback is 10)

### Out of Scope
- Bulk update by category (Iteration 7.2, future work)
- Per-athlete threshold overrides
- Coach/athlete-facing views (those use existing `technique_learning_status` view)

## Capabilities

### New Capabilities
- `admin-technique-thresholds`: Admin UI for configuring per-technique learning thresholds

### Modified Capabilities
- None

## Approach

Follow the existing admin pattern in `src/features/admin/bjj-techniques/`:

```
src/features/admin/technique-thresholds/
├── pages/TechniqueThresholdsPage.tsx   # Main page component
├── hooks/
│   └── useTechniqueThresholds.ts        # Fetch all techniques + thresholds
│   └── useUpdateTechniqueThreshold.ts   # Upsert mutation
└── components/
    └── ThresholdRow.tsx                  # Table row with inline edit
```

**Data flow:**
1. Page loads → fetch all `bjj_techniques` joined with `technique_learning_thresholds`
2. Each row shows technique name, category, current threshold (input), save button
3. Save triggers `useUpdateTechniqueThreshold` → upsert to `technique_learning_thresholds`
4. Invalidate `['technique-learning-status']` query on save to refresh athlete views

**UI pattern:** Table layout with inline numeric inputs (shadcn/ui `Input` type="number"), save per row. Sort by category then name.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/features/admin/technique-thresholds/` | New | Full feature directory |
| `src/features/bjj/progression/hooks/useTechniqueLearningStatus.ts` | Modified | Query key must be invalidated after threshold updates |
| `openspec/specs/technique-tracking/spec.md` | Modified | Add requirement for admin threshold UI |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Concurrent edits by multiple admins | Low | Last-write-wins on upsert; acceptable for admin config |
| Threshold changes affect live athlete views | Medium | Invalidate query cache on save; threshold change is intentional |

## Rollback Plan

1. Delete the `src/features/admin/technique-thresholds/` directory
2. No database changes (table already exists, is not modified)
3. Deploy previous version — athletes see existing thresholds with no UI change

## Dependencies

- `bjj_techniques` table must be seeded with techniques (already exists from Iteration 7)
- `technique_learning_thresholds` table must exist (migration 20260514000002 — already applied)

## Success Criteria

- [ ] `/admin/technique-thresholds` renders a table of all techniques with threshold inputs
- [ ] Editing threshold and clicking Save persists to `technique_learning_thresholds` table
- [ ] Athletes' `technique_learning_status` queries reflect updated thresholds after admin saves
- [ ] Page follows project conventions (Tailwind v4, shadcn/ui, TanStack Query mutation pattern)