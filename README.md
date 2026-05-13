# Training Records

A workout tracking web app for athletes — log CrossFit/functional workouts and BJJ sessions, browse your training calendar, generate workouts with AI, and import Garmin activity data.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Features](#features)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Local Setup](#local-setup)
- [Seed Data](#seed-data)
- [Scripts](#scripts)
- [AI Integration](#ai-integration)
- [User Roles](#user-roles)
- [Database](#database)
- [Commit Convention](#commit-convention)

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| UI | React | 19.x |
| Language | TypeScript | 5.9.x |
| Build | Vite | 8.x |
| Styling | Tailwind CSS v4 + shadcn/ui | 4.x |
| Routing | React Router | 7.x |
| Server state | TanStack Query | 5.x |
| Forms | React Hook Form + Zod | 7.x + 4.x |
| Auth / Backend | Supabase (Auth + PostgreSQL + Edge Functions) | 2.x |
| Unit testing | Vitest + React Testing Library | 4.x |
| E2E testing | Playwright | 1.59.x |

---

## Features

### Workouts
- **Workout list** (`/workouts`) — browse all logged workouts with type badges and date
- **Workout detail** (`/workouts/:id`) — view full workout, movements, notes, RPE, Garmin data
- **CrossFit / Functional workout form** (`/workouts/new/crossfit`) — structured form with movement field arrays, WOD format selector, RPE, and notes
- **Workout type picker** (`/workouts/new`) — choose between CrossFit/Functional or BJJ before creating
- **Edit workout** (`/workouts/:id/edit`) — full edit of existing workouts

### BJJ
- **BJJ workout form** (`/bjj/new`) — multi-section editor; each section has goal, description, duration, and technique multi-select
- **AI section enhancement** — click "Enhance with AI" on any section to get a refined description and matched techniques; preview the result before applying
- **Technique search** — combobox with debounced search over the technique catalog; opens on focus

### AI
- **AI workout generator** (`/ai`) — free-text prompt → AI generates a structured workout proposal → prefill into the workout form
- **BJJ section AI** — enhances section descriptions and suggests relevant techniques from the catalog

### Calendar
- **Monthly calendar** (`/calendar`) — visual overview of all workouts by day; navigate by month

### Exercises
- **Exercise library** (`/exercises`) — browse and manage the exercise catalog
- **Create / Edit exercise** (`/exercises/new`, `/exercises/:id/edit`) — form with name, description, category, and equipment

### Garmin (embedded)
- **FIT file import** — import Garmin activity data linked to a workout
- **Training evaluation** — AI-generated evaluation card based on Garmin HR/pace data
- **Adaptation warning** — detects overtraining signals from recent activity data
- **HR zone bar** — visualises heart rate zone distribution per activity

### Admin
- **BJJ technique catalog** (`/admin/bjj-techniques`) — manage the technique library (admin only)
- **AI settings** (`/admin/ai-settings`) — configure the AI provider: name, base URL, and model (admin only); see [AI Integration](#ai-integration)

---

## Project Structure

```
src/
├── app/                        # Router, AppShell, providers
├── components/
│   └── ui/                     # shadcn/ui component copies
├── features/
│   ├── admin/
│   │   ├── ai-settings/        # AI provider config page + hook
│   │   └── bjj-techniques/     # BJJ technique catalog CRUD
│   ├── ai/                     # AI workout generation chat page
│   ├── auth/                   # Login, AuthContext, ProtectedRoute, AdminRoute
│   ├── bjj/                    # BJJ workout form, section editor, technique search, AI preview
│   ├── calendar/               # Monthly calendar view, hooks, utils
│   ├── exercises/              # Exercise library CRUD
│   ├── garmin/                 # FIT import, training evaluation, HR zones
│   ├── public-wods/            # Public WOD library hooks
│   └── workouts/               # CrossFit/functional workout CRUD, format registry
├── lib/
│   ├── api.ts                  # Fetch wrapper with Bearer auth
│   ├── queryClient.ts
│   └── supabase.ts
└── types/                      # Shared TypeScript types

supabase/
├── functions/                  # Deno Edge Functions
│   ├── ai-generate/            # Workout generation from free-text prompt
│   ├── bjj-section-ai/         # BJJ section enhancement + technique matching
│   ├── exercises/              # Exercise CRUD
│   ├── garmin-import/          # Garmin FIT file processing
│   ├── public-wods/            # Public WOD library
│   ├── training-evaluation/    # Garmin-based training evaluation
│   └── workouts/               # Workout CRUD
├── migrations/                 # Ordered SQL migrations
└── seed.sql                    # Reference + sample data
```

---

## Prerequisites

- Node.js LTS (v24 — see `.nvmrc`)
- npm 10+
- [Supabase CLI](https://supabase.com/docs/guides/cli) — `brew install supabase/tap/supabase`
- Docker (required by Supabase local dev stack)

---

## Local Setup

### Initial setup (first time only)

```bash
# 1. Install dependencies
npm install

# 2. Configure environment variables
cp .env.example .env
# Defaults already point to the local Supabase instance (127.0.0.1:54321)

# 3. Start the Supabase local stack (DB + Auth + Storage)
supabase start

# 4. Apply migrations and seed reference data
supabase db reset

# 5. Seed users
bash scripts/seed-users.sh
```

### Starting services (day-to-day)

Run these commands in **separate terminals**:

**Terminal 1 — Supabase Edge Functions:**
```bash
supabase functions serve
```

**Terminal 2 — Vite dev server:**
```bash
npm run dev
```

**Terminal 3 (optional) — Engram Cloud (persistent memory across team):**
```bash
cd infra/engram-cloud
docker compose up
```

> `supabase functions serve` and `npm run dev` must run concurrently.
> Vite proxies `/api/v1/*` → `http://127.0.0.1:54321/functions/v1/*`.

---

## Seed Data

`supabase db reset` applies all migrations and runs `supabase/seed.sql`, which inserts:

- **Reference data** — 4 workout categories, 6 equipment items, ~30 exercises
- **Public WODs** — 37 benchmark and hero WODs (Murph, Fran, Cindy, DT, etc.)
- **BJJ techniques** — ~35 techniques across takedowns, guard passes, guards, submissions, and escapes
- **Sample workouts** — a few logged workouts for the seeded athletes

`scripts/seed-users.sh` creates three test users (run after `supabase db reset`):

| Email | Password | Role |
|-------|----------|------|
| `athlete1@example.com` | `Password123!` | athlete |
| `athlete2@example.com` | `Password123!` | athlete |
| `admin@example.com` | `Password123!` | admin |

> The script uses `docker exec` directly into the GoTrue container — it works with Supabase CLI 2.x and above. Override the container name via `SUPABASE_AUTH_CONTAINER` env var if needed.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | TypeScript check + Vite production build |
| `npm run lint` | ESLint |
| `npm run preview` | Preview production build |
| `npm test` | Vitest (watch mode) |
| `npm run test:coverage` | Vitest with v8 coverage report |
| `npm run test:e2e` | Playwright E2E tests |

---

## AI Integration

The app uses an **OpenAI-compatible** chat completions interface — any provider that exposes a `POST /chat/completions` endpoint works (OpenAI, MiniMax, Azure OpenAI, OpenRouter, local Ollama, etc.).

### How it works

1. The `bjj-section-ai` and `ai-generate` Edge Functions call the AI provider
2. The provider is configured in two places:
   - **API key** — set as a Supabase Edge Function secret (never stored in DB)
   - **Provider settings** (base URL + model) — configurable by an admin from `/admin/ai-settings`

### Developer setup

#### Step 1 — Set the API key as a Supabase secret

For local development:

```bash
# Create supabase/functions/.env (gitignored)
echo "OPENAI_API_KEY=your-api-key-here" >> supabase/functions/.env
```

For production (Supabase hosted):

```bash
supabase secrets set OPENAI_API_KEY=your-api-key-here
```

The env var name is always `OPENAI_API_KEY` regardless of the provider — it's just the key value that changes.

#### Step 2 — Configure provider settings (admin UI)

Log in as `admin@example.com`, go to **Admin → AI Settings**, and set:

| Field | Description | Default |
|-------|-------------|---------|
| Provider Name | Label for the config (e.g. `openai`, `minimax`) | `openai` |
| Base URL | API endpoint root | `https://api.openai.com/v1` |
| Model | Model identifier | `gpt-4o-mini` |

**Examples for common providers:**

| Provider | Base URL | Model example |
|----------|----------|---------------|
| OpenAI | `https://api.openai.com/v1` | `gpt-4o-mini` |
| MiniMax 2.7 | `https://api.minimaxi.chat/v1` | `MiniMax-Text-01` |
| Azure OpenAI | `https://{resource}.openai.azure.com/openai/deployments/{deployment}` | `gpt-4o` |
| OpenRouter | `https://openrouter.ai/api/v1` | `openai/gpt-4o-mini` |
| Ollama (local) | `http://localhost:11434/v1` | `llama3` |

#### Fallback behaviour

| State | Behaviour |
|-------|-----------|
| DB config present + `OPENAI_API_KEY` set | Full AI — uses DB base URL + model + env key |
| No DB config + `OPENAI_API_KEY` set | Falls back to OpenAI defaults (`gpt-4o-mini`) |
| No key at all | Returns a mock response — app doesn't crash |

---

## User Roles

| Role | Access |
|------|--------|
| `athlete` | All app pages — workouts, BJJ, calendar, exercises, AI chat |
| `admin` | Everything above + `/admin/bjj-techniques` + `/admin/ai-settings` |

Role is stored in `profiles.role` (PostgreSQL) and in Supabase user metadata. The `AdminRoute` component guards all `/admin/*` routes client-side; RLS policies enforce it server-side.

---

## Database

Migrations live in `supabase/migrations/` and are applied in order by `supabase db reset`.

| Migration | Description |
|-----------|-------------|
| `20260404223748` | Profiles table (id, role) |
| `20260404223751` | Workouts table |
| `20260406000001` | Workout iteration 2 columns |
| `20260406000002` | Categories reference table |
| `20260406000003` | Equipment reference table |
| `20260406000004` | Exercises table |
| `20260407000001` | Public WODs table |
| `20260409000001` | Allow anon SELECT on public WODs |
| `20260412000001` | Garmin activities table |
| `20260412000002` | Training evaluations table |
| `20260412000003` | Workouts ↔ Garmin FK |
| `20260412000004` | Garmin FIT files storage bucket |
| `20260415000001` | Extend workout type enum for BJJ |
| `20260415000002` | BJJ tables (workouts, sections, techniques) |
| `20260415000003` | BJJ create workout RPC |
| `20260426000001` | Add `guard_pass` to BJJ category constraint |
| `20260427000001` | AI settings table (provider config) |

---

## Commit Convention

This project follows [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(bjj): add technique search combobox
fix(auth): redirect to login on 401
chore(deps): update vite to 8.0.1
docs: update AI setup instructions
test(calendar): add CalendarGrid unit tests
```
