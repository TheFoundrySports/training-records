# Standards

## Development Process

Feature branches are created from `develop` and merged back via pull requests. At least one peer approval is required before merging.

**Branching strategy:**

| Branch | Purpose |
|---|---|
| `main` | Production-ready code; the default branch |
| `develop` | Integration branch; CI runs here |
| `feat/<slug>` | Feature branches, created from `develop` |

**Release flow:** Features are merged into `develop`, then promoted to `main`. Production deployments are triggered manually.

**Commit message format:** [Conventional Commits](https://www.conventionalcommits.org/) — `type(scope): description`.

```
feat(workouts): add duration field to form
fix(auth): redirect to login on 401
chore(ci): add GitHub Actions workflow
```

No commit-msg hook is enforced, but PRs may be linted via CI.

## Development Stack

See [Architecture](ARCHITECTURE.md) for the full technology stack.

### Frontend

- **Language:** TypeScript 5.x
- **Framework:** React 19 + Vite (SPA)
- **Styling:** Tailwind CSS v4
- **Component library:** shadcn/ui (built on `@base-ui/react` and Radix UI primitives)
- **Forms:** React Hook Form + Zod v4
- **Data fetching:** TanStack Query v5
- **Routing:** React Router v7
- **Package manager:** npm

### Backend (BaaS)

- **Auth:** Supabase Auth (JWT, email/password)
- **Database:** Supabase PostgreSQL with Row Level Security (RLS)
- **API:** Supabase PostgREST + Edge Functions (Deno)
- **TypeScript types:** auto-generated via `supabase gen types typescript` → `src/types/supabase.ts`

### Local development

```bash
npx supabase start   # start local Supabase stack
npm run dev          # start Vite dev server
```

See [README.md](../README.md) for full setup instructions.

## Testing

| Layer | Tool |
|-------|------|
| Unit / integration | Vitest + React Testing Library |
| E2E (manual) | Playwright |

```bash
npm test            # run all unit tests (watch mode)
npm test -- --run   # run all unit tests (CI mode)
npm run test:e2e    # run Playwright smoke tests (requires running app)
```

Tests live next to the source files they test (`*.test.tsx` / `*.test.ts`). Playwright specs live in `e2e/`.

## Feature Documentation

Each feature has a dedicated spec in `docs/features/`. Features are listed in [docs/PRODUCT.md](PRODUCT.md) with a one-line description and a link to the spec.

## Code Style

**TypeScript/JavaScript:** ESLint with TypeScript-ESLint and Prettier integration.

```bash
npm run lint        # check
```

**Formatting:** Prettier. Run via editor integration or:

```bash
npx prettier --write src/
```

**CSS:** Tailwind utility classes only — no custom CSS files unless strictly necessary.
