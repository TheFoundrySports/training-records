# Design: BJJ Blue Belt Progression Tracker

> **Domain**: `belt-progression-tracking`
> **Change**: bjj-blue-belt-progression
> **Status**: Active
> **Phase**: Design

---

## 1. Database Migration

### Migration File: `supabase/migrations/20260513000001_belt_progression.sql`

```sql
-- =========================================================
-- belt_progression — per-user per-item completion state
-- =========================================================
create table public.belt_progression (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references auth.users(id) on delete cascade,
  belt_level    text        not null default 'blue' check (belt_level = 'blue'),
  section_id    text        not null,
  item_id       text        not null,
  is_complete   boolean     not null default false,
  completed_at  timestamptz,
  technique_id  uuid        references public.bjj_techniques(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  unique (user_id, belt_level, section_id, item_id)
);

alter table public.belt_progression enable row level security;

-- Users CRUD only their own rows
create policy "Users can read own belt_progression"
  on public.belt_progression for select
  using (auth.uid() = user_id);

create policy "Users can insert own belt_progression"
  on public.belt_progression for insert
  with check (auth.uid() = user_id);

create policy "Users can update own belt_progression"
  on public.belt_progression for update
  using (auth.uid() = user_id);

create policy "Users can delete own belt_progression"
  on public.belt_progression for delete
  using (auth.uid() = user_id);

-- Auto-update updated_at
create or replace function public.set_belt_progression_updated_at()
returns trigger language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger belt_progression_updated_at
  before update on public.belt_progression
  for each row execute procedure public.set_belt_progression_updated_at();

-- Index for fast user lookup (most common query)
create index idx_belt_progression_user_id on public.belt_progression(user_id);

-- =========================================================
-- belt_progression_ui_state — per-user per-section collapse state
-- =========================================================
create table public.belt_progression_ui_state (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references auth.users(id) on delete cascade,
  belt_level   text        not null default 'blue' check (belt_level = 'blue'),
  section_id   text        not null,
  is_expanded  boolean     not null default false,
  updated_at   timestamptz not null default now(),

  unique (user_id, belt_level, section_id)
);

alter table public.belt_progression_ui_state enable row level security;

-- Users CRUD only their own rows
create policy "Users can read own belt_progression_ui_state"
  on public.belt_progression_ui_state for select
  using (auth.uid() = user_id);

create policy "Users can insert own belt_progression_ui_state"
  on public.belt_progression_ui_state for insert
  with check (auth.uid() = user_id);

create policy "Users can update own belt_progression_ui_state"
  on public.belt_progression_ui_state for update
  using (auth.uid() = user_id);

create policy "Users can delete own belt_progression_ui_state"
  on public.belt_progression_ui_state for delete
  using (auth.uid() = user_id);

-- Auto-update updated_at
create or replace function public.set_belt_progression_ui_state_updated_at()
returns trigger language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger belt_progression_ui_state_updated_at
  before update on public.belt_progression_ui_state
  for each row execute procedure public.set_belt_progression_ui_state_updated_at();

-- Index for fast user lookup
create index idx_belt_progression_ui_state_user_id on public.belt_progression_ui_state(user_id);
```

### Rollback SQL

```sql
-- Rollback: drop in reverse dependency order (ui_state has no FK deps, progression has technique_id FK)
DROP TRIGGER IF EXISTS belt_progression_ui_state_updated_at ON public.belt_progression_ui_state;
DROP FUNCTION IF EXISTS public.set_belt_progression_ui_state_updated_at();
DROP TABLE IF EXISTS public.belt_progression_ui_state;

DROP TRIGGER IF EXISTS belt_progression_updated_at ON public.belt_progression;
DROP FUNCTION IF EXISTS public.set_belt_progression_updated_at();
DROP TABLE IF EXISTS public.belt_progression;
```

---

## 2. Component Architecture

### Component Tree

```
BeltProgressionPage
└── ProgressionSection (×5)
    ├── [SectionHeader — <button> with aria-expanded]
    ├── [Collapsible content — hidden when collapsed]
    │   └── ProgressionChecklistItem (×N per section)
    │       └── <input type="checkbox"> with aria-checked
    └── [SectionProgressBar — shown below section header]
```

### Props Interfaces

```tsx
// src/features/bjj/progression/types/belt-progression.types.ts

/** Matches belt_progression DB row */
export interface BeltProgressionItem {
  id: string
  userId: string
  beltLevel: 'blue'
  sectionId: string
  itemId: string
  isComplete: boolean
  completedAt: string | null
  techniqueId: string | null
  createdAt: string
  updatedAt: string
}

/** Matches belt_progression_ui_state DB row */
export interface BeltProgressionUIState {
  id: string
  userId: string
  beltLevel: 'blue'
  sectionId: string
  isExpanded: boolean
  updatedAt: string
}

/** Section definition (TypeScript constant — not stored in DB) */
export interface ProgressionSection {
  id: string
  title: string
  isInformational: boolean
  items: ProgressionItem[]
}

/** Item within a section (TypeScript constant — not stored in DB) */
export interface ProgressionItem {
  id: string       // unique within section, e.g. "tecnicas-closed-guard-0"
  label: string    // display text, e.g. "Closed Guard"
  techniqueId?: string  // optional FK → bjj_techniques.id
  category?: string    // e.g. "guard", "takedown"
}
```

### Custom ProgressBar Component

```tsx
// src/features/bjj/progression/components/ProgressionProgressBar.tsx
interface ProgressBarProps {
  value: number       // 0–100
  label?: string      // e.g. "12/45"
  className?: string
}

function ProgressionProgressBar({ value, label, className }: ProgressBarProps) {
  const clampedValue = Math.min(100, Math.max(0, value))

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className="relative h-2 flex-1 overflow-hidden rounded-full bg-gray-700"
        role="progressbar"
        aria-valuenow={clampedValue}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Progress: ${clampedValue}%`}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-amber-400 transition-all duration-300"
          style={{ width: `${clampedValue}%` }}
        />
      </div>
      {label && (
        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
          {label}
        </span>
      )}
    </div>
  )
}
```

### Collapsible Pattern (Headless)

```tsx
// Inside ProgressionSection.tsx
// Uses native <details>/<summary> OR controlled div + aria
// Choice: controlled div with useState (consistent with optimistic updates)

interface CollapsibleSectionProps {
  isExpanded: boolean
  onToggle: () => void
  trigger: React.ReactNode    // section header button
  children: React.ReactNode
}

function CollapsibleSection({ isExpanded, onToggle, trigger, children }: CollapsibleSectionProps) {
  return (
    <div>
      <div onClick={onToggle}>{trigger}</div>
      <div
        aria-hidden={!isExpanded}
        className={cn(
          "overflow-hidden transition-all duration-200",
          isExpanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        {children}
      </div>
    </div>
  )
}
```

### ResetDialog (shadcn/ui Dialog)

```tsx
// src/features/bjj/progression/components/ProgressionResetButton.tsx
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { RotateCcwIcon } from "lucide-react"

interface ResetDialogProps {
  onReset: () => void
  isPending: boolean
}

function ResetDialog({ onReset, isPending }: ResetDialogProps) {
  return (
    <Dialog>
      <DialogTrigger render={<Button variant="ghost" size="sm"><RotateCcwIcon /> Reiniciar Progreso</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>¿Reiniciar progreso?</DialogTitle>
          <DialogDescription>
            Se borrarán todas las marcas de los 45 requisitos. Esta acción no se puede deshacer.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline">Cancelar</Button>} />
          <Button variant="destructive" onClick={onReset} disabled={isPending}>
            {isPending ? "Reiniciando..." : "Confirmar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

---

## 3. TanStack Query Hooks

### `useBeltProgression`

```tsx
// src/features/bjj/progression/hooks/useBeltProgression.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { BeltProgressionItem } from '../types/belt-progression.types'

type BeltProgressionRow = {
  id: string
  user_id: string
  belt_level: string
  section_id: string
  item_id: string
  is_complete: boolean
  completed_at: string | null
  technique_id: string | null
  created_at: string
  updated_at: string
}

export function useBeltProgression() {
  const queryClient = useQueryClient()
  const queryKey = ['belt-progression']

  // ── Query ─────────────────────────────────────────────────
  const query = useQuery({
    queryKey,
    queryFn: async (): Promise<BeltProgressionItem[]> => {
      const { data, error } = await supabase
        .from('belt_progression')
        .select('*')
        .eq('belt_level', 'blue')

      if (error) throw error
      return (data as BeltProgressionRow[]).map(mapProgressionRow)
    },
    staleTime: 60_000,
  })

  // ── Toggle mutation ───────────────────────────────────────
  const toggleMutation = useMutation({
    mutationFn: async ({
      sectionId,
      itemId,
      isComplete,
    }: {
      sectionId: string
      itemId: string
      isComplete: boolean
    }) => {
      const { error } = await supabase
        .from('belt_progression')
        .upsert(
          {
            belt_level: 'blue',
            section_id: sectionId,
            item_id: itemId,
            is_complete: isComplete,
            completed_at: isComplete ? new Date().toISOString() : null,
          },
          {
            onConflict: 'user_id,belt_level,section_id,item_id',
          },
        )

      if (error) throw error
    },

    // Optimistic update
    onMutate: async ({ sectionId, itemId, isComplete }) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<BeltProgressionItem[]>(queryKey)

      queryClient.setQueryData<BeltProgressionItem[]>(queryKey, (old = []) => {
        const key = `${sectionId}::${itemId}`
        const existing = old.find((r) => r.sectionId === sectionId && r.itemId === itemId)

        if (existing) {
          return old.map((r) =>
            r.sectionId === sectionId && r.itemId === itemId
              ? { ...r, isComplete, completedAt: isComplete ? new Date().toISOString() : null }
              : r,
          )
        }

        if (isComplete) {
          return [
            ...old,
            {
              id: `optimistic-${key}`,
              userId: '',
              beltLevel: 'blue' as const,
              sectionId,
              itemId,
              isComplete: true,
              completedAt: new Date().toISOString(),
              techniqueId: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ]
        }

        return old
      })

      return { previous }
    },

    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous)
      }
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey })
    },
  })

  // ── Reset mutation ────────────────────────────────────────
  const resetMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('belt_progression')
        .delete()
        .eq('belt_level', 'blue')

      if (error) throw error
    },

    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['belt-progression'] })
      void queryClient.invalidateQueries({ queryKey: ['belt-progression-ui-state'] })
    },
  })

  return {
    progression: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    toggleItem: toggleMutation.mutate,
    toggleItemAsync: toggleMutation.mutateAsync,
    isToggling: toggleMutation.isPending,
    resetProgress: resetMutation.mutate,
    resetProgressAsync: resetMutation.mutateAsync,
    isResetting: resetMutation.isPending,
  }
}

function mapProgressionRow(row: BeltProgressionRow): BeltProgressionItem {
  return {
    id: row.id,
    userId: row.user_id,
    beltLevel: row.belt_level as BeltProgressionItem['beltLevel'],
    sectionId: row.section_id,
    itemId: row.item_id,
    isComplete: row.is_complete,
    completedAt: row.completed_at,
    techniqueId: row.technique_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
```

### `useBeltProgressionUIState`

```tsx
// src/features/bjj/progression/hooks/useBeltProgressionUIState.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { BeltProgressionUIState } from '../types/belt-progression.types'

type BeltProgressionUIStateRow = {
  id: string
  user_id: string
  belt_level: string
  section_id: string
  is_expanded: boolean
  updated_at: string
}

export function useBeltProgressionUIState() {
  const queryClient = useQueryClient()
  const queryKey = ['belt-progression-ui-state']

  // ── Query ─────────────────────────────────────────────────
  const query = useQuery({
    queryKey,
    queryFn: async (): Promise<BeltProgressionUIState[]> => {
      const { data, error } = await supabase
        .from('belt_progression_ui_state')
        .select('*')
        .eq('belt_level', 'blue')

      if (error) throw error
      return (data as BeltProgressionUIStateRow[]).map(mapUIStateRow)
    },
    staleTime: 60_000,
  })

  // ── Toggle section collapse mutation ───────────────────────
  const toggleSectionMutation = useMutation({
    mutationFn: async ({ sectionId, isExpanded }: { sectionId: string; isExpanded: boolean }) => {
      const { error } = await supabase
        .from('belt_progression_ui_state')
        .upsert(
          {
            belt_level: 'blue',
            section_id: sectionId,
            is_expanded: isExpanded,
          },
          {
            onConflict: 'user_id,belt_level,section_id',
          },
        )

      if (error) throw error
    },

    // Optimistic update
    onMutate: async ({ sectionId, isExpanded }) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<BeltProgressionUIState[]>(queryKey)

      queryClient.setQueryData<BeltProgressionUIState[]>(queryKey, (old = []) => {
        const existing = old.find((r) => r.sectionId === sectionId)
        if (existing) {
          return old.map((r) =>
            r.sectionId === sectionId ? { ...r, isExpanded } : r,
          )
        }
        return [
          ...old,
          {
            id: `optimistic-${sectionId}`,
            userId: '',
            beltLevel: 'blue' as const,
            sectionId,
            isExpanded,
            updatedAt: new Date().toISOString(),
          },
        ]
      })

      return { previous }
    },

    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous)
      }
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey })
    },
  })

  return {
    uiState: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    toggleSection: toggleSectionMutation.mutate,
    toggleSectionAsync: toggleSectionMutation.mutateAsync,
    isTogglingSection: toggleSectionMutation.isPending,
  }
}

function mapUIStateRow(row: BeltProgressionUIStateRow): BeltProgressionUIState {
  return {
    id: row.id,
    userId: row.user_id,
    beltLevel: row.belt_level as BeltProgressionUIState['beltLevel'],
    sectionId: row.section_id,
    isExpanded: row.is_expanded,
    updatedAt: row.updated_at,
  }
}
```

---

## 4. Type Definitions

```tsx
// src/features/bjj/progression/types/belt-progression.types.ts

/** Matches belt_progression DB table row */
export interface BeltProgressionItem {
  id: string
  userId: string
  beltLevel: 'blue'
  sectionId: string
  itemId: string
  isComplete: boolean
  completedAt: string | null
  techniqueId: string | null
  createdAt: string
  updatedAt: string
}

/** Matches belt_progression_ui_state DB table row */
export interface BeltProgressionUIState {
  id: string
  userId: string
  beltLevel: 'blue'
  sectionId: string
  isExpanded: boolean
  updatedAt: string
}

/** Section definition as TypeScript constant (not stored in DB) */
export interface ProgressionSection {
  id: string
  title: string
  isInformational: boolean
  items: ProgressionItem[]
}

/** Item within a section (TypeScript constant, not stored in DB) */
export interface ProgressionItem {
  id: string
  label: string
  techniqueId?: string
  category?: string
}
```

---

## 5. File Structure

```
src/features/bjj/progression/
├── pages/
│   └── BeltProgressionPage.tsx
├── components/
│   ├── ProgressionSection.tsx
│   ├── ProgressionChecklistItem.tsx
│   ├── ProgressionProgressBar.tsx
│   └── ProgressionResetButton.tsx
├── hooks/
│   ├── useBeltProgression.ts
│   └── useBeltProgressionUIState.ts
├── utils/
│   ├── belt-progression-sections.ts   # 45 items as constants
│   └── calculateProgress.ts
├── types/
│   └── belt-progression.types.ts
└── index.ts
```

### `index.ts` barrel

```ts
export { BeltProgressionPage } from './pages/BeltProgressionPage'
export { ProgressionSection } from './components/ProgressionSection'
export { ProgressionChecklistItem } from './components/ProgressionChecklistItem'
export { ProgressionProgressBar } from './components/ProgressionProgressBar'
export { ProgressionResetButton } from './components/ProgressionResetButton'
export { useBeltProgression } from './hooks/useBeltProgression'
export { useBeltProgressionUIState } from './hooks/useBeltProgressionUIState'
export { PROGRESSION_SECTIONS } from './utils/belt-progression-sections'
export { calculateProgress, calculateSectionProgress } from './utils/calculateProgress'
export type {
  BeltProgressionItem,
  BeltProgressionUIState,
  ProgressionSection,
  ProgressionItem,
} from './types/belt-progression.types'
```

---

## 6. Data Flow

### Initial Load: Parallel Fetch

```tsx
// In BeltProgressionPage
function BeltProgressionPage() {
  const { progression, isLoading: progLoading } = useBeltProgression()
  const { uiState, isLoading: uiLoading } = useBeltProgressionUIState()

  const isLoading = progLoading || uiLoading

  // Build checked map: { "sectionId::itemId": true }
  const checkedMap = useMemo(() => {
    const map = new Map<string, boolean>()
    for (const item of progression) {
      map.set(`${item.sectionId}::${item.itemId}`, item.isComplete)
    }
    return map
  }, [progression])

  // Build expanded map: { sectionId: isExpanded }
  const expandedMap = useMemo(() => {
    const map = new Map<string, boolean>()
    for (const state of uiState) {
      map.set(state.sectionId, state.isExpanded)
    }
    return map
  }, [uiState])

  // Client-side: default all sections to collapsed on first visit
  const sectionExpandedMap = useMemo(() => {
    const map = new Map(expandedMap)
    for (const section of PROGRESSION_SECTIONS) {
      if (!map.has(section.id)) {
        map.set(section.id, false)  // default: collapsed
      }
    }
    return map
  }, [expandedMap])

  // ... render
}
```

### Check Item Flow

```
User clicks checkbox
  │
  ├─ [1] Optimistic update: queryClient.setQueryData — checkbox flips immediately
  │
  ├─ [2] useMutation.mutate() fires Supabase upsert
  │       POST /belt_progression (upsert)
  │
  ├─ [3a] On error: rollback to previous query data, show toast
  │
  └─ [3b] On success: invalidate queries → refetch
```

### Collapse Section Flow

```
User clicks section header
  │
  ├─ [1] Optimistic update: local state flips (aria-expanded updates)
  │
  ├─ [2] useMutation.mutate() fires Supabase upsert
  │       POST /belt_progression_ui_state (upsert)
  │
  ├─ [3a] On error: rollback, section reverts
  │
  └─ [3b] On success: invalidate → refetch
```

### Reset Flow

```
User clicks "Reiniciar Progreso"
  │
  ├─ [1] ResetDialog opens (confirmation required)
  │
  ├─ [2] User confirms → resetMutation.mutate()
  │       DELETE /belt_progression WHERE belt_level = 'blue'
  │
  ├─ [3] onSuccess: invalidate BOTH queries
  │       → belt-progression refetches → empty
  │       → belt-progression-ui-state refetches (sections stay expanded)
  │
  └─ [4] Progress bars update to 0%
```

---

## 7. Accessibility Strategy

### Checkbox

```tsx
<input
  type="checkbox"
  id={itemId}
  checked={isComplete}
  aria-checked={isComplete}
  aria-label={item.label}
  onChange={() => toggleItem(sectionId, item.id, !isComplete)}
  className="sr-only"  // visually hidden, label provides visible text
/>
{/* Visible custom checkbox */}
<div className={cn(
  "h-4 w-4 rounded border",
  isComplete ? "bg-amber-400 border-amber-400" : "border-muted-foreground"
)}>
  {isComplete && <CheckIcon className="h-3 w-3 text-black" />}
</div>
```

### Section Header (Collapsible)

```tsx
<button
  type="button"
  onClick={() => toggleSection(section.id, !isExpanded)}
  aria-expanded={isExpanded}
  aria-controls={`section-content-${section.id}`}
  className="flex w-full items-center justify-between py-3 text-left"
>
  <span className="font-medium">{section.title}</span>
  <ChevronDownIcon
    className={cn(
      "h-4 w-4 transition-transform duration-200",
      isExpanded && "rotate-180"
    )}
  />
</button>
```

### Focus Management

- Standard Tab order (no focus trap)
- Tab → checkbox → next checkbox... → next section header
- `aria-live="polite"` on progress bar container for screen reader announcements

```tsx
<div aria-live="polite" aria-atomic="true">
  <ProgressionProgressBar value={globalProgress} label={`${globalProgress}%`} />
</div>
```

---

## 8. Styling Approach

### Tailwind CSS v4 (existing CSS vars)

Using existing dark-mode CSS variables:

```tsx
// Progress bar: amber-400 fill, gray-700 background
<div className="h-2 w-full rounded-full bg-gray-700">
  <div
    className="h-full rounded-full bg-amber-400 transition-all duration-300"
    style={{ width: `${progress}%` }}
  />
</div>

// Card component from shadcn/ui
<Card className="mb-4">
  <CardHeader>
    <CardTitle>{section.title}</CardTitle>
  </CardHeader>
  <CardContent>
    {/* checklist items */}
  </CardContent>
</Card>

// Responsive layout
<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
  {/* sections stack on mobile, single column on tablet+ */}
</div>
```

### Dark Mode

All colors use CSS variables (`--background`, `--foreground`, `--muted-foreground`, `amber-400`) so dark mode works automatically via the existing `dark:` Tailwind variant and `class="dark"` on `<html>`.

---

## 9. Testing Strategy

### E2E: Playwright (5+ scenarios)

```ts
// e2e/belt-progression.spec.ts
import { test, expect } from '@playwright/test'
import { loginAsTestUser } from './auth.setup'

test.describe('BJJ Blue Belt Progression', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page)
    await page.goto('/bjj/blue-belt-progression')
  })

  test('check item persists across refresh', async ({ page }) => {
    const firstCheckbox = page.locator('input[type="checkbox"]').first()
    await firstCheckbox.check()
    await expect(firstCheckbox).toBeChecked()

    await page.reload()
    await expect(firstCheckbox).toBeChecked()
  })

  test('collapse section persists', async ({ page }) => {
    const sectionHeader = page.locator('button[aria-expanded]').nth(1)
    await sectionHeader.click()
    await expect(sectionHeader).toHaveAttribute('aria-expanded', 'false')

    await page.reload()
    await expect(sectionHeader).toHaveAttribute('aria-expanded', 'false')
  })

  test('progress calculation — 0 items = 0%', async ({ page }) => {
    const progressBar = page.locator('[role="progressbar"]').first()
    await expect(progressBar).toHaveAttribute('aria-valuenow', '0')
  })

  test('check 22 items → 49% progress', async ({ page }) => {
    const checkboxes = page.locator('input[type="checkbox"]')
    const count = await checkboxes.count()
    for (let i = 0; i < 22; i++) {
      await checkboxes.nth(i).check()
    }
    const progressBar = page.locator('[role="progressbar"]').first()
    await expect(progressBar).toHaveAttribute('aria-valuenow', '49')
  })

  test('reset with confirmation — confirm', async ({ page }) => {
    // Check some items first
    await page.locator('input[type="checkbox"]').first().check()

    // Open reset dialog
    await page.getByRole('button', { name: /reiniciar/i }).click()
    await expect(page.getByRole('dialog')).toBeVisible()

    // Confirm
    await page.getByRole('button', { name: /confirmar/i }).click()
    await expect(page.getByRole('progressbar').first()).toHaveAttribute('aria-valuenow', '0')
  })

  test('reset with confirmation — cancel', async ({ page }) => {
    await page.locator('input[type="checkbox"]').first().check()
    await page.getByRole('button', { name: /reiniciar/i }).click()
    await page.getByRole('button', { name: /cancelar/i }).click()

    // Checkbox should still be checked
    await expect(page.locator('input[type="checkbox"]').first()).toBeChecked()
  })
})
```

### Unit: `calculateProgress`

```ts
// src/features/bjj/progression/utils/__tests__/calculateProgress.test.ts
import { describe, it, expect } from 'vitest'
import { calculateProgress, calculateSectionProgress } from '../calculateProgress'

describe('calculateProgress', () => {
  it('returns 0 when no items checked', () => {
    expect(calculateProgress(0, 45)).toBe(0)
  })

  it('returns 0 when checked = 0, denominator = 45', () => {
    expect(calculateProgress(0, 45)).toBe(0)
  })

  it('returns 49 when 22/45 (rounded)', () => {
    expect(calculateProgress(22, 45)).toBe(49)  // 22/45 = 48.88 → 49
  })

  it('returns 100 when all 45 checked', () => {
    expect(calculateProgress(45, 45)).toBe(100)
  })

  it('returns 50 when 50% checked', () => {
    expect(calculateProgress(23, 45)).toBe(51)  // 23/45 = 51.1 → 51
    expect(calculateProgress(22, 45)).toBe(49)
    expect(calculateProgress(45, 45)).toBe(100)
  })
})

describe('calculateSectionProgress', () => {
  it('informational section with 0 checkable → 100%', () => {
    expect(calculateSectionProgress('pilares', 0, 0)).toBe(100)
  })

  it('section with checked/total', () => {
    expect(calculateSectionProgress('tecnicas', 10, 32)).toBe(31)
  })
})
```

---

## 10. Migration Path

### No localStorage Migration

Users who previously used localStorage-based tracking will re-check items manually. This is the explicit MVP decision per the proposal risk assessment.

### No Database Seed Data

The 45 progression items are **TypeScript constants** in `belt-progression-sections.ts` — they are NOT database records. This means:

- No `section_id` or `item_id` rows in any DB table
- All 45 items are defined in code and rendered client-side
- The `belt_progression` table only stores *checked* items (not the full item list)

### Route Registration

Add to `src/app/router.tsx`:

```tsx
import { BeltProgressionPage } from '@/features/bjj/progression'

// Inside the protected route children:
{
  path: 'bjj/blue-belt-progression',
  element: <BeltProgressionPage />,
},
```

Navigation link should appear in AppShell BJJ section pointing to `/bjj/blue-belt-progression`.

---

## Architecture Decisions

| # | Decision | Choice | Rationale |
|---|----------|--------|-----------|
| 1 | Collapsible: controlled div + aria | Controlled state + CSS max-height transition | Consistent with optimistic update pattern; avoids `<details>`/`<summary>` complexities with animation |
| 2 | Progress bar: custom Tailwind component | Custom `ProgressionProgressBar` | Requires amber-400 fill on gray-700 bg; shadcn/ui has no equivalent |
| 3 | 45 items as TypeScript constants, not DB rows | Static constants | Items are static catalog; no need for CMS/admin management |
| 4 | Upsert (not insert/delete) for toggle | `supabase.upsert()` with `onConflict` | Idempotent; handles both check and uncheck atomically |
| 5 | Two separate tables for state vs UI | `belt_progression` + `belt_progression_ui_state` | Different access patterns (progression changes frequently; UI state is stable) |
| 6 | Optimistic updates on both mutations | TanStack Query `onMutate` + rollback `onError` | Immediate feedback; rollback on failure |
| 7 | Client-side default collapsed state | Initial data `{ isExpanded: false }` | First visit shows all sections collapsed; no DB write needed |

---

## Open Questions

- [ ] Navigation link placement: AppShell BJJ section or separate "Progreso" link?
- [ ] `techniqueId` linking: should we show a badge or link icon if the item has a linked `bjj_techniques` FK?
- [ ] Should section 1 (Pilares) show a progress bar at all? Spec says it renders as informational (no checkboxes), so it's excluded from denominator but could show 100% or be hidden.