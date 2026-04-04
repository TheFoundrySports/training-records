# Training Records

A workout tracking web app for athletes — built with React 19, TypeScript, Vite, Tailwind CSS v4, and Supabase.

## Stack

| Layer | Technology |
|-------|-----------|
| UI | React 19 + TypeScript |
| Build | Vite 8 |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Routing | React Router v7 |
| Server state | TanStack Query v5 |
| Forms | React Hook Form + Zod |
| Auth / Backend | Supabase (Auth + PostgreSQL + Edge Functions) |
| Testing | Vitest + React Testing Library |
| E2E | Playwright (M3+) |

## Prerequisites

- Node.js LTS (see `.nvmrc` — currently v24)
- npm 10+
- A Supabase project (required for M2+ integration)

## Setup

```bash
# 1. Clone the repo and install dependencies
npm install

# 2. Configure environment variables
cp .env.example .env.local
# Edit .env.local and fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

# 3. Start the dev server
npm run dev
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | TypeScript check + Vite production build |
| `npm test` | Run Vitest (watch mode) |
| `npm run lint` | ESLint |
| `npm run preview` | Preview production build |

## Project structure

```
src/
├── app/           # Entry point, Router, AppShell, providers
├── features/
│   ├── auth/      # Login, AuthContext, ProtectedRoute
│   ├── workouts/  # Workout pages, hooks, schemas, types
│   └── ai/        # AI workout generation chat
├── components/ui/ # shadcn/ui component copies
├── lib/
│   ├── api.ts     # Fetch wrapper with Bearer auth
│   ├── queryClient.ts
│   └── supabase.ts
└── types/         # Shared TypeScript types
```

## Milestones

| Milestone | Status | Description |
|-----------|--------|-------------|
| M1 — Skeleton | ✅ Done | Repo scaffold, routing, auth shell, Vitest wired |
| M2 — Read path | Pending | WorkoutList + Detail pages, TanStack Query hooks, API client |
| M3 — Write path | Pending | Create/edit/delete, forms, AI generate, Playwright smoke |
| M4 — Hardening | Pending | A11y pass, CI, RLS docs |

## Commit convention

This project uses [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add workout list page
fix: correct Bearer token header format
chore: update dependencies
docs: update README setup steps
```
