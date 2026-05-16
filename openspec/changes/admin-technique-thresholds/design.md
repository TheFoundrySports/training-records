# Design: admin-technique-thresholds

## Technical Approach

Build an admin page at `/admin/technique-thresholds` that displays all BJJ techniques in a table with inline numeric threshold inputs. Each row has a Save button that performs a Supabase upsert to `technique_learning_thresholds`. The page follows the existing `admin/bjj-techniques` directory structure and patterns.

## Architecture Decisions

### Decision: Fetch pattern — join in query vs separate queries

**Choice**: Single Supabase query joining `bjj_techniques` LEFT JOIN `technique_learning_thresholds`
**Alternatives considered**: Fetch techniques and thresholds separately, then merge client-side
**Rationale**: Avoids N+1, keeps the data-fetching simple. Supabase handles the LEFT JOIN efficiently.

### Decision: Per-row save vs bulk save

**Choice**: Save button per row (inline mutation)
**Alternatives considered**: Auto-save on blur, bulk "Save All" button
**Rationale**: Matches the existing admin pattern in `BJJTechniqueListPage` (per-row Edit/Delete). Auto-save adds complexity and risk of accidental submissions. Bulk save is out of scope.

### Decision: Query key for invalidation

**Choice**: Invalidate `['technique-learning-status', userId]` for all users after any threshold update
**Alternatives considered**: Invalidate only the specific user's query
**Rationale**: An admin threshold change affects ALL athletes' views. Invalidating per-user would require enumerating all users, which is expensive. A blanket invalidation is correct per REQ-TT-A1 scenario: "cache is invalidated on success."

## Data Flow

```
TechniqueThresholdsPage
  └── useTechniqueThresholds()     ← fetch (bjj_techniques LEFT JOIN technique_learning_thresholds)
  └── useUpdateTechniqueThreshold() ← upsert mutation
         │
         └── onSuccess: queryClient.invalidateQueries({ queryKey: ['technique-learning-status'] })
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/features/admin/technique-thresholds/pages/TechniqueThresholdsPage.tsx` | Create | Main admin page — table with skeleton loading, per-row save |
| `src/features/admin/technique-thresholds/hooks/useTechniqueThresholds.ts` | Create | Fetch hook: techniques + thresholds via LEFT JOIN |
| `src/features/admin/technique-thresholds/hooks/useUpdateTechniqueThreshold.ts` | Create | Upsert mutation hook, invalidates `['technique-learning-status']` |
| `src/features/admin/technique-thresholds/components/ThresholdRow.tsx` | Create | Table row: technique name, category, numeric input, save button |
| `src/app/router.tsx` | Modify | Add route `/admin/technique-thresholds` with `AdminRoute` wrapper |
| `src/features/bjj/progression/hooks/useTechniqueLearningStatus.ts` | No change | Already reads from view — threshold updates propagate via cache invalidation |

## Interfaces / Contracts

```typescript
// New types in useTechniqueThresholds.ts
interface TechniqueWithThreshold {
  techniqueId: string
  name: string
  category: string | null
  currentThreshold: number // null means no row yet → default 10
}

// useUpdateTechniqueThreshold.ts
interface UpdateThresholdInput {
  techniqueId: string
  requiredPractices: number
}
```

## Hook Patterns

### `useTechniqueThresholds.ts`
```typescript
export function useTechniqueThresholds() {
  // Query: bjj_techniques LEFT JOIN technique_learning_thresholds
  // Returns TechniqueWithThreshold[] sorted by category, then name
  // staleTime: 60_000
}
```

### `useUpdateTechniqueThreshold.ts`
```typescript
export function useUpdateTechniqueThreshold() {
  // mutationFn: supabase.from('technique_learning_thresholds').upsert({ technique_id, required_practices }, { onConflict: 'technique_id' })
  // onSuccess: invalidate ['technique-learning-status']
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `useUpdateTechniqueThreshold` — upsert call, error handling, invalidation | Vitest: mock supabase, assert upsert was called with correct payload |
| Unit | `useTechniqueThresholds` — sort order, default threshold of 10 | Vitest: mock data, assert mapped output |
| Integration | Page renders skeleton while loading | Vitest + Testing Library |
| Integration | Save button calls mutation and input resets on success | Vitest + Testing Library |

## Migration / Rollout

No migration required. The `technique_learning_thresholds` table already exists. The change adds only admin UI.

## Open Questions

- [ ] None