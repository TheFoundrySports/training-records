# Product Requirements Document: Training Records (Workouts Web App)

## 1. Document control

| Field       | Value                                                                                                                                                                                                      |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Title**   | Training Records — initial product requirements (workouts / fitness)                                                                                                                                       |
| **Version** | 0.8                                                                                                                                                                                                        |
| **Date**    | 2026-04-12                                                                                                                                                                                                 |
| **Author**  | Francisco José Seva Mora                                                                                                                                                                                   |
| **Status**  | Draft — BaaS/Supabase + MVP testing; iteration 2 CrossFit / WOD authoring requirements drafted; iteration 3 Calendar / Training Planner drafted; iteration 4 Garmin Import + Training Intelligence drafted |

**Related links**

- Product context: [docs/PRODUCT.md](PRODUCT.md)
- Architecture (as-built): [docs/ARCHITECTURE.md](ARCHITECTURE.md)
- Ticket / issue: TBD
- Design files: TBD

**Terminology:** In this document, **training** means **physical training: workouts and exercise sessions**, not workplace courses or compliance training.

---

## 2. Summary

This initiative defines a **web application for recording, viewing, and managing workout and training-session information** (for example: activity type, date and time, duration, intensity, notes, and optional media or links). The product is aimed at **people who want a reliable log of their fitness training** (solo athletes, hobby lifters, runners, etc.—exact primary user to be confirmed) and optionally **coaches or training partners** who need shared visibility.

The first release should deliver a **credible MVP**: authenticated access via **Supabase Auth** (JWT, email/password, two roles: Athlete and Administrator), a minimal data model for **workout records**, list and detail views, and basic create/edit flows. The UI is built with **React**, **TypeScript**, and **Tailwind CSS** (shadcn/ui); the backend is **Supabase** (PostgreSQL + PostgREST + Edge Functions). Full stack decisions are documented under [Technical approach](./PRD.md#ref-prd-section-10).

---

## 3. Problem and goals

### Problem

People who train regularly often lack a **single, dependable place** to track **workouts**. Logs may live in notes apps, spreadsheets, or several apps, which makes it harder to **see progress**, **spot patterns**, and **stay consistent**.

### Goals

- **G1:** Users can **see a consolidated view** of workout records relevant to them.
- **G2:** Authorised users can **add or update** records with clear validation and feedback.
- **G3:** The app is **accessible and understandable** on common desktop and mobile viewports (baseline defined under NFRs).
- **G4:** The codebase remains **maintainable** through TypeScript typing and a consistent UI approach (Tailwind).
- **G5:** The user will be able to plan worksouts. There will be not date limit.
- **G6:** The app will receive all workout data from a modern watch (Garmin Fenix 7X for example). So it will provide heart rate , zones reached and more.
- **G7:** The app MVP will cover only crossfit workouts and functional training.
- **G8:** The app will process the data and provide important information that will help to improve next training.
- **G9:** The workouts could be generated automatically by the app using AI.
- **G10:** There will be only two types of users in the MVP, atlethe and administrator
- **G11:** The product will support **many workout formats** over time; **each format may need its own interaction model** (fields, validation, scoring, display)—not a single rigid form for every type.
- **G12:** The **codebase** shall make it **straightforward for developers to add new workout types** using a **documented extensibility pattern** (see **NFR-006** in [§8](./PRD.md#ref-prd-section-8) and [Workout type extensibility](./PRD.md#ref-prd-workout-type-extensibility) in [§10](./PRD.md#ref-prd-section-10)) so new types do not require rewriting core flows.
- **G13:** The user shall be able to **see all workouts — past and planned — on a calendar view**, navigable by day, week, and month, with **date-range filtering**, so that training load and future planning are visible at a glance.
- **G14:** The user shall be able to **import wearable data from a Garmin device** (`.fit` file upload for MVP; Garmin Connect API as stretch goal) and link it to a planned or unplanned workout, so that real physiological data is stored alongside the workout record.
- **G15:** The app shall display **training intelligence widgets** — a curated set of 5–7 key metrics derived from imported Garmin data (e.g. avg heart rate, HR zone distribution, training load, VO2max estimate, recovery time) — prominently on the workout detail page, so the athlete gets actionable insight at a glance.
- **G16:** The app shall deliver an **AI-generated training evaluation** for each workout with imported data, structured into four components: training summary, readiness level, next training suggestion, and adaptation warning (when recovery time conflicts with a planned workout).

### Non-goals (this PRD)

- **NG1:** Full **gym or studio management** (billing, class scheduling, member CRM)—out of scope unless explicitly added later.
- **NG2:** **Nutrition tracking**, sleep, or body metrics as first-class features—out of scope for MVP (may link externally later).
- **NG3:** Native mobile apps—web-first only.
- ~~**NG4:** Replacing dedicated **wearable or device ecosystems** as the system of record—integration may come later; MVP may be standalone.~~ _(removed in v0.8 — Garmin import promoted to iteration 4)_
- ~~**NG5:** Complex logic to process data from garmin~~ _(removed in v0.8 — training intelligence and AI evaluation promoted to iteration 4)_

---

## 4. Users and stakeholders

| Role                                | Needs                                                         |
| ----------------------------------- | ------------------------------------------------------------- |
| **End user (athlete / individual)** | Log and review own workouts; add notes or tags where allowed. |
| **Coach / trainer** (optional)      | View an athlete’s log when permissions allow.                 |
| **Administrator**                   | Configure users/roles or shared programs (scope TBD for MVP). |

**Approvers:** product owner / sponsor — TBD.

---

## 5. User stories (initial backlog)

- **US-1:** As a user, I want to **see a list of my workout records**, so that I can review recent training.
- **US-2:** As a user, I want to **open a record and see details** (activity, date/time, duration, intensity, notes), so that I can verify what I did.
- **US-3:** As a user, I want to **log a new workout**, so that my history stays current.
- **US-4:** As a user, I want to **edit or delete** a record I am allowed to change, so that I can correct mistakes.
- **US-5:** As a user, I want the UI to be **usable with a keyboard and screen reader** for primary flows, so that I am not excluded.
- **US-6:** As a user, I want to be able to explain what type of workout I want to create it using AI.
- **US-7:** As an athlete, I want to **pick a workout format** (e.g. AMRAP vs For Time vs EMOM) and see **inputs and scoring that fit that format**, so that what I log matches the WOD.
- **US-8:** As an athlete, I want to **see all my workouts on a calendar** (day / week / month views), so that I can understand my training density and spot gaps or overloads.
- **US-9:** As an athlete, I want to **plan a future workout on a specific date** from the calendar view, so that I can schedule upcoming training sessions without leaving the calendar context.
- **US-10:** As an athlete, I want to **filter the calendar by a custom date range**, so that I can review a specific training block (e.g. last 4 weeks, a competition prep cycle).
- **US-11:** As an athlete, I want to **upload a `.fit` file from my Garmin device** after finishing a workout, so that my physiological data (heart rate, zones, training load, etc.) is stored alongside the workout record.
- **US-12:** As an athlete, I want to **see key training metrics** (avg HR, HR zone breakdown, training load, recovery time, VO2max estimate) prominently on the workout detail page, so I can understand the physiological impact at a glance.
- **US-13:** As an athlete, I want to **see an AI-generated training summary** for each workout with Garmin data, so I understand what the session actually demanded of my body.
- **US-14:** As an athlete, I want to **receive an adaptation warning** when my recovery time from a completed workout conflicts with a planned upcoming workout, so I can adjust my schedule proactively.
- **US-15:** As an athlete, I want the app to **suggest the next training session** based on my current readiness and training history, so I can make smarter decisions about what to do next.
- **US-16:** As an athlete, I want to **link a Garmin import to an existing planned workout or save it as a new standalone record**, so that my log stays accurate whether or not I followed the plan.

---

## 6. Scope

### In scope (MVP)

- Web UI for **list**, **detail**, **create**, and **edit** workout records (exact fields in FR section).
- **Client-side and API validation** aligned with Supabase PostgREST constraints and Edge Function logic.
- **Responsive layout** using Tailwind (including quick logging on mobile).
- **Authentication via Supabase Auth** — email/password, JWT, two roles: **Athlete** and **Administrator** (enforced via RLS policies and a `role` custom claim).
- There will be 2 types of users **Athlete** and **Administrator**
- Users will be able to generate workouts using AI

### Out of scope (deferred)

- Advanced analytics dashboards (PR charts, periodisation views) — **Phase 2** unless promoted.
- Deep integration with **Strava, Apple Health** — **Phase 2+**. **Garmin `.fit` upload** is now **in scope for iteration 4**; Garmin Connect OAuth is a **stretch goal for iteration 4**.
- Offline-first or PWA — **later**.

### In scope — iteration 2 (CrossFit WOD authoring; planned)

This subsection records **planned** scope for a second iteration. It **does not remove** MVP requirements above; it **adds** product and engineering expectations. Details may be refined in [docs/ARCHITECTURE.md](ARCHITECTURE.md) when implemented.

- **Free-text WOD capture:** A **long text** field to paste a workout; the system shall **store and display** it. **Structured parsing** from pasted text (rules or AI) is **optional / later** unless promoted.
- **Structured CrossFit-style builder:** Athletes compose WODs from a **shared exercise library** (select movements, prescriptions, format)—aligned with the domain described in `docs/oldcode/foundry-workouts/` (types, movements, score semantics).
- **Exercise catalog (administrator):** **Create, update, and delete** exercises and related **reference data** (e.g. categories, equipment) per agreed rules; **athletes** **read** the catalog and use it to build WODs (not author catalog entries), unless a future change explicitly widens permissions.
- **Many workout types, different approaches:** The product will **add more workout formats over time**. **Different types may require different approaches**—for example distinct **UI sections**, **validation**, **score fields**, or **API payload shape**—so the system must **not** assume one generic form or one fixed schema fits every format for all time.
- **Developer extensibility (mandatory):** Implementation shall follow an **explicit pattern** so developers can **extend** the app with **new workout types** in a controlled way (see **FR-008**, **FR-009**, **NFR-006**, and [Workout type extensibility](./PRD.md#ref-prd-workout-type-extensibility) in §10).

### In scope — iteration 3 (Calendar / Training Planner)

This subsection records **planned** scope for a third iteration. It **does not remove** prior requirements; it **adds** a calendar-centric view of all workouts (past and future). Details may be refined in [docs/ARCHITECTURE.md](ARCHITECTURE.md) when implemented.

- **Calendar page (`/calendar`):** A dedicated page showing workouts plotted on a calendar. The default landing is the **current week**. No date boundaries — athletes can navigate freely into the past (history) and future (planning).
- **Three view modes:** The user can switch between **Day**, **Week**, and **Month** views. Each view shows workout entries on their `performedAt` date; future-dated workouts are visually distinguished (e.g. muted or labelled "Planned").
- **Date-range filter:** A date picker or range control lets the user jump to or filter by an arbitrary range (e.g. "last 4 weeks", "this training block"). The URL shall reflect the active range so links are shareable.
- **Entry interaction:**
  - Clicking a past workout navigates to its **detail page**.
  - Clicking a future workout navigates to its **detail page** (read) or **edit form** (owner only).
  - Clicking an **empty day/slot** opens the **create workout form** pre-filled with that date.
- **No new data model required:** The calendar reads from the existing `workouts` resource via `GET /api/v1/workouts?fromDate=&toDate=`. No new backend endpoints are required for MVP of this view.
- **Responsive:** Day and week views are usable on mobile; month view may degrade gracefully (compact dots / count per day) on small viewports.

### In scope — iteration 4 (Garmin Import + Training Intelligence)

This subsection records **planned** scope for a fourth iteration. It **does not remove** prior requirements; it **adds** wearable data import and AI-driven training intelligence. Details may be refined in [docs/ARCHITECTURE.md](ARCHITECTURE.md) when implemented.

- **Garmin `.fit` file upload (MVP):** Athletes can upload a `.fit` file from any Garmin device after finishing a workout. The server parses the file and extracts key metrics.
- **Garmin Connect OAuth (stretch goal):** Automatic pull of the latest activity via the official Garmin Connect API. Not required for MVP; implement only if `.fit` upload is shipped and time allows.
- **Data storage:** Raw parsed data stored as `jsonb`; key typed metrics (avg HR, zone distribution, training load, recovery time, VO2max estimate, etc.) stored in their own typed columns for efficient querying and display.
- **Import linking:** The athlete can link a Garmin import to an existing planned workout (if one exists for that date) or save it as a standalone unplanned record.
- **Training intelligence widgets:** 5–7 key metrics displayed prominently on the workout detail page — less is more; only the most actionable metrics are surfaced.
- **AI training evaluation:** After import, the server calls a lightweight LLM (Gemini Flash or GPT-4o-mini) and returns a structured JSON evaluation validated with Zod: `training_summary`, `readiness_level`, `next_training_suggestion`, `adaptation_warning`.
- **Adaptation warning:** When the computed `recovery_time_hours` from a completed workout conflicts with the next planned workout's `performedAt`, the app displays a prominent warning on both the completed workout detail and the calendar.

| ID         | Requirement                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **FR-001** | The system shall display a **paginated or scrollable list** of workout records available to the signed-in user. Authentication is required; unauthenticated access is not permitted (Supabase Auth + RLS enforce this).                                                                                                                                                                                                                                                                                                                                                                                             |
| **FR-002** | The system shall provide a **detail view** for a single workout record, including at minimum: **title or activity label**, **date and time (or date only)**, **duration** (or distance where relevant), and **notes or tags** as applicable. Optional fields (e.g. **perceived intensity / RPE**) may be added when agreed.                                                                                                                                                                                                                                                                                         |
| **FR-003** | The system shall allow **creating** a workout record with required field validation; invalid submissions show **inline or summary errors**.                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **FR-004** | The system shall allow **editing** and **deleting** a record when the user has permission. Permission rules for MVP: **athletes** may only modify their own records (enforced by Supabase RLS `user_id = auth.uid()`); **administrators** have read access to all records but do not bypass write restrictions.                                                                                                                                                                                                                                                                                                     |
| **FR-005** | The system shall **persist** data in **Supabase PostgreSQL** via the Edge Function REST API (`/api/v1/`\*). A documented mock/fixture layer (`supabase/seed.sql`) may be used for local development only — not production.                                                                                                                                                                                                                                                                                                                                                                                          |
| **FR-006** | The system shall provide **navigation** between list, detail, and forms without losing essential context (e.g. return to list after save).                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **FR-007** | The system shall provide a chat where the user should be able to describe the type of workout that want to generate using AI so it can be saved and added to the day).                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| **FR-008** | The system shall support **multiple workout formats** (existing and **future**). **Different workout types may require different user flows, validation, scoring capture, and presentation**; the product shall not rely on a single universal form or a single fixed field set for every type without an extension mechanism.                                                                                                                                                                                                                                                                                      |
| **FR-009** | The system shall allow **new workout types to be introduced** as the product evolves (including types not listed at initial delivery). Adding a type shall be possible **without replacing the entire workout model** each time; how types are **registered or configured** (e.g. data-driven catalog vs versioned code modules) is an implementation choice recorded in [docs/ARCHITECTURE.md](ARCHITECTURE.md).                                                                                                                                                                                                   |
| **FR-010** | The system shall provide a **Calendar page** (`/calendar`) where the authenticated user can view all their workouts — past and future-planned — plotted on a calendar. The page shall support **Day**, **Week**, and **Month** view modes, a **date-range filter**, and navigation to adjacent periods. Clicking a workout entry shall navigate to its detail or edit page; clicking an empty date slot shall open the create form pre-filled with that date. The URL shall encode the active view mode and date range so the state is bookmarkable and shareable.                                                  |
| **FR-011** | The system shall allow an authenticated athlete to **upload a `.fit` file** from a Garmin device (max 25 MB, MIME-type validated server-side) and associate the import with a workout record (planned or new standalone). The file shall be stored in a **private Supabase Storage bucket** and never exposed to unauthenticated clients.                                                                                                                                                                                                                                                                           |
| **FR-012** | The system shall **parse the uploaded `.fit` file** server-side and persist the extracted data in two ways: (a) raw parsed payload as **`jsonb`** for forward-compatibility; (b) key typed columns (`avg_heart_rate`, `max_heart_rate`, `hr_zone_1_pct`–`hr_zone_5_pct`, `training_load`, `recovery_time_hours`, `vo2max_estimate`, `total_calories`, `active_duration_seconds`) for efficient querying and display.                                                                                                                                                                                                |
| **FR-013** | The workout detail page shall display a **training intelligence widget section** showing 5–7 key metrics derived from the imported Garmin data: average heart rate, HR zone distribution (stacked bar or pie), training load score, estimated recovery time, VO2max estimate, total calories, and active duration. The widget section shall only appear when Garmin data has been imported for that workout.                                                                                                                                                                                                        |
| **FR-014** | After a successful Garmin import, the system shall call a lightweight LLM (Gemini Flash or GPT-4o-mini — model choice recorded in §10 open decisions) from a Supabase Edge Function and persist a **structured AI training evaluation**. The LLM response schema (validated with **Zod**) shall contain: `training_summary` (string), `readiness_level` (`low` \| `moderate` \| `high`), `next_training_suggestion` (string), `adaptation_warning` (string \| null). If the LLM call fails or returns an invalid schema, the system shall store a null evaluation and surface a non-blocking error state in the UI. |
| **FR-015** | When the computed `recovery_time_hours` from a completed workout's Garmin data conflicts with the `performedAt` of the athlete's **next planned workout**, the system shall display a prominent **adaptation warning** on the completed workout detail page (and optionally on the calendar chip). The warning shall include the conflicting planned workout's title and date.                                                                                                                                                                                                                                      |
| **FR-016** | The system shall display the **next training suggestion** (from the AI evaluation, FR-014) as an actionable card on the workout detail page. The card shall include a CTA that pre-fills the create workout form with the suggested workout description and the next available date after the computed recovery window.                                                                                                                                                                                                                                                                                             |

---

<a id="ref-prd-section-8"></a>

## 8. Non-functional requirements (NFRs)

| ID          | Area            | Requirement                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ----------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **NFR-001** | Accessibility   | Primary flows meet **WCAG 2.2 Level AA** intent for components built in-house (focus order, labels, contrast).                                                                                                                                                                                                                                                                                                                                                                                                      |
| **NFR-002** | Performance     | Initial route interactive on mid-tier hardware; specific metrics (LCP, bundle budget) to be set when hosting target is chosen.                                                                                                                                                                                                                                                                                                                                                                                      |
| **NFR-003** | Browser support | Latest two versions of evergreen browsers (Chrome, Firefox, Safari, Edge) unless otherwise agreed.                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **NFR-004** | Security        | No secrets in client bundle; **HTTPS** in deployed environments; follow secure defaults for auth tokens (details depend on auth provider).                                                                                                                                                                                                                                                                                                                                                                          |
| **NFR-005** | Maintainability | **TypeScript** strictness as per repo config; components colocated and styled with **Tailwind** utilities consistently.                                                                                                                                                                                                                                                                                                                                                                                             |
| **NFR-006** | Extensibility   | Workout **formats** shall be implemented using a **documented extension pattern** (e.g. **registry**, **strategy**, or **plugin-style** modules per type) so developers can **add or adjust a workout type** by implementing agreed **contracts** (types, validation entry points, optional UI slots) **without** copying unrelated routing, auth, or API plumbing. The pattern and extension points shall be described in [docs/ARCHITECTURE.md](ARCHITECTURE.md) and kept aligned with **FR-008** and **FR-009**. |
| **NFR-007** | AI reliability  | LLM responses for training evaluation (**FR-014**) shall be validated against a **Zod schema** before persistence. An invalid or unparseable response must not crash the import flow; the evaluation shall be stored as `null` and the UI shall surface a non-blocking warning. The system must not depend on a live LLM call as a gate for CI.                                                                                                                                                                     |
| **NFR-008** | File security   | Uploaded `.fit` files shall be stored in a **private Supabase Storage bucket** (no public access). File size is capped at **25 MB**. MIME type is validated server-side; client-side filtering is a UX hint only. Files are accessible only to the owning athlete and admins via signed URLs.                                                                                                                                                                                                                       |

---

## 9. UX and design

- **Key screens:** list (index), detail, create/edit form, **calendar (day/week/month)**, **workout detail with training intelligence widgets**, **AI evaluation card**, **adaptation warning**, empty state, error state.
- **Training intelligence widgets:** Displayed as a dedicated section on the workout detail page when Garmin data is present. Shows avg HR, HR zone distribution (visual bar), training load score, recovery time countdown, VO2max estimate, calories, and active duration. Metrics are presented as cards — prominently sized, not buried in a table.
- **AI evaluation card:** Four structured sub-sections — Training Summary (prose), Readiness Level (color-coded badge: low/moderate/high), Next Training Suggestion (actionable text + CTA button), Adaptation Warning (highlighted alert if recovery conflict detected).
- **Design system:** **Tailwind CSS** for layout and tokens; **shadcn/ui** (Radix UI primitives) for accessible component implementation — decision recorded in §16. **Forms** use **React Hook Form** + **Zod** per §10.

---

<a id="ref-prd-section-10"></a>

## 10. Technical approach (fixed stack + open choices)

BaaS platform choice and rationale: _[§18](./PRD.md#ref-prd-section-18)._

### Decided

| Area             | Decision                                                                                                                                                                                                                                                                                                                                                                |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| UI               | **React**                                                                                                                                                                                                                                                                                                                                                               |
| Language         | **TypeScript**                                                                                                                                                                                                                                                                                                                                                          |
| Styling          | **Tailwind CSS**                                                                                                                                                                                                                                                                                                                                                        |
| React framework  | Vite + React SPA                                                                                                                                                                                                                                                                                                                                                        |
| State            | Local state + **TanStack Query** for server/async state vs minimal global store (**Zustand**) if needed.                                                                                                                                                                                                                                                                |
| Forms            | **React Hook Form** with **Zod** schemas and **`@hookform/resolvers`** (zod adapter); fields composed with shadcn/ui **Form** primitives. Chosen for **React 19** + Vite SPA: maintained peer support, fewer unnecessary re-renders (uncontrolled registration by default), and alignment with shadcn/ui patterns. Trivial two-field surfaces may use local state only. |
| Routing          | React Router                                                                                                                                                                                                                                                                                                                                                            |
| API              | REST with **OpenAPI** contract                                                                                                                                                                                                                                                                                                                                          |
| Testing          | **Vitest** + React Testing Library; **Playwright** for critical E2E after the write path (see [§12.1](./PRD.md#ref-prd-section-testing)).                                                                                                                                                                                                                               |
| Auth             | **Supabase Auth** — JWT (access token + refresh token). Role stored as `role` custom claim (`athlete`                                                                                                                                                                                                                                                                   | `admin`). |
| BaaS / backend   | **Supabase** (BaaS) — PostgreSQL + PostgREST (REST + OpenAPI) + Edge Functions + Auth; full rationale in [§18](./PRD.md#ref-prd-section-18).                                                                                                                                                                                                                            |
| API URL pattern  | **Edge Functions as gateway** — SPA calls `/api/v1/`\* via Supabase Edge Functions; PostgREST (`/rest/v1/`) is used server-side only.                                                                                                                                                                                                                                   |
| TypeScript types | Generated from Supabase schema via `supabase gen types typescript`; committed to `src/types/supabase.ts`.                                                                                                                                                                                                                                                               |

<a id="ref-prd-workout-type-extensibility"></a>

### Workout type extensibility (iteration 2+)

This subsection turns **G12**, **FR-008**, **FR-009**, and **NFR-006** into engineering intent (exact libraries stay **open**).

- **Problem:** Workout **formats** (AMRAP, For Time, EMOM, Tabata, ladders, chipper-style, future types) differ in **scoring**, **time domains**, and **prescription**; a single mega-form becomes unmaintainable.
- **Requirement:** The codebase shall isolate **per-type behaviour** behind a small set of **extension points**—for example a **registry** mapping type id → **handlers** (validation/schema, optional React **form sections**, score normalization for display/API)—so a new type is added by **new module(s) + registration**, not by editing unrelated screens.
- **Documentation:** [docs/ARCHITECTURE.md](ARCHITECTURE.md) shall name the chosen pattern, folder layout, and how **server-side** validation (Edge Functions / Zod) stays consistent with the client.
- **Non-prescriptive:** The PRD does not mandate a specific design pattern name; it mandates **discoverability** and **low coupling** for new workout types.

### Open decisions (record outcome in this doc when closed)

| Topic                                                     | Options / notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Workout type registration**                             | **Data-driven** (rows in DB, admin-editable metadata) vs **code-first** (enum + registered modules per release) vs **hybrid** (catalog in DB, behaviour in code). Record decision when iteration 2 implementation starts.                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **Shared vs per-type API payloads**                       | Single `workouts` resource with **discriminated** `type` + `payload` JSON vs separate sub-resources; affects OpenAPI and migrations.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **AI model for training evaluation**                      | **Gemini Flash** (low cost, Google ecosystem) vs **GPT-4o-mini** (OpenAI, already in use for AI generation) vs **Groq Llama 3** (fast, free tier). Decision before iteration 4 implementation begins.                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **Garmin Connect API feasibility**                        | Official Garmin Connect API requires OAuth approval. Evaluate feasibility as a stretch goal for iteration 4; `.fit` file upload is the MVP path regardless.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **Garmin Connect IQ native watch app (future iteration)** | Evaluated in PRD v0.8. Technically feasible: `Toybox.Communications.makeWebRequest()` (Connect IQ SDK v9.1.0) routes HTTP via BLE → Garmin Connect Mobile → Internet, allowing the watch to POST data directly after an activity ends — no file upload needed. Scoped to a **future iteration** (not iteration 4) due to: Monkey C ramp-up, Connect IQ Store review process, and dependency on the user having Garmin Connect Mobile paired. Tracked in [issue #17](https://github.com/TheFoundrySports/training-records/issues/17). Garmin Health API (server-to-server push, requires formal Garmin partnership) was also evaluated and ruled out as not viable for this project. |

Intent in this PRD is captured here; **as-built** design lives in [docs/ARCHITECTURE.md](ARCHITECTURE.md).

---

## 11. Data and integrations

### Core entities (conceptual)

- **WorkoutRecord** (or **TrainingSession**): id, title/activity, startedAt or performedOn, duration (or distance), optional intensity/RPE, notes, tags, attachments (optional, later), owner/user id, timestamps.
- **User** (if multi-user): id, role, link to coach or group (TBD).
- **GarminActivity** (iteration 4): id, workout_id (FK), raw_fit_data (jsonb), avg_heart_rate, max_heart_rate, hr_zone_1_pct–hr_zone_5_pct, training_load, recovery_time_hours, vo2max_estimate, total_calories, active_duration_seconds, fit_file_path (Storage reference), imported_at.
- **TrainingEvaluation** (iteration 4): id, workout_id (FK), training_summary (text), readiness_level (`low` | `moderate` | `high`), next_training_suggestion (text), adaptation_warning (text | null), evaluated_at, model_used.

### Integrations

- **Auth / IdP:** **Supabase Auth** — email/password for MVP; JWT issued by Supabase, consumed by Edge Functions and the React SPA.
- **AI:** **OpenAI** (or compatible LLM) called server-side from a Supabase Edge Function; API key stored as a Supabase secret, never in the client bundle.
- **AI training evaluation (iteration 4):** Lightweight LLM (Gemini Flash, GPT-4o-mini, or Groq Llama 3 — TBD) called after Garmin import; response validated with Zod before persistence.
- **Wearables — Garmin (iteration 4):** `.fit` file upload (MVP); Garmin Connect OAuth API (stretch goal). Apple Health / Strava remain Phase 2+.
- **Export:** CSV or PDF — Phase 2 unless required for MVP.

---

## 12. Milestones and release criteria

| Milestone           | Outcome                                                                                                                                                                                                     |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **M1 — Skeleton**   | Repo runs locally; app shell, routing placeholder, Tailwind configured; TypeScript passes.                                                                                                                  |
| **M2 — Read path**  | List + detail backed by API or agreed mock; loading and error states.                                                                                                                                       |
| **M3 — Write path** | Create + edit + delete per permissions; validation UX complete.                                                                                                                                             |
| **M4 — Hardening**  | A11y pass on primary flows; automated SPA tests green in CI when a pipeline exists; Playwright smoke (post–write path) green; deployment story documented; manual Supabase/RLS checks documented per §12.1. |

<a id="ref-prd-section-testing"></a>

### Testing and verification (MVP)

This subsection defines **what “tested enough for MVP” means**: required tooling, **minimum automated coverage**, **manual backend verification**, and **definitions**. It is **requirements documentation only** — implementation details and file paths may be recorded in [docs/ARCHITECTURE.md](ARCHITECTURE.md) when the codebase exists.

#### Objectives

- Catch regressions in **validation**, **API usage**, and **primary UI flows** without requiring a live OpenAI key in CI.
- Prove **end-to-end product wiring** (auth → API → persistence → UI) once **create/update/delete** exists (**M3**).
- Record **Row Level Security (RLS) and role behaviour** in a repeatable **manual** way for MVP (automated database tests in CI are **out of scope** for MVP unless explicitly promoted later).

#### Test requirements (MVP)

| ID         | Requirement                                                                                                                                                                                                                                                                                                                                                                         |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **TR-001** | The SPA shall use **Vitest** and **React Testing Library** as the default automated test stack for unit and component/integration-style tests.                                                                                                                                                                                                                                      |
| **TR-002** | Automated tests shall cover **workout validation** (e.g. Zod schemas aligned with API fields: required properties, `type` enum, dates, numeric bounds) and **standard API error shape** handling (`{ "error": { "code", "message", "details" } }`).                                                                                                                                 |
| **TR-003** | Automated tests shall cover the **HTTP client** behaviour relevant to MVP: correct `/api/v1/` usage, **`Authorization: Bearer`** on authenticated calls, and parsing of success and error responses (using **mocks** — no production Supabase or OpenAI in unit/component test runs).                                                                                               |
| **TR-004** | Automated **UI tests** shall exercise **primary flows** with **mocked** auth session and **mocked** API: unauthenticated users cannot access protected views; **list** and **detail** show loading, empty, and error states as designed; **create/edit** surfaces show validation feedback and invoke create/update with valid payloads.                                            |
| **TR-005** | **Playwright** shall run at least **one smoke end-to-end spec** after **M3 (write path)** is implemented: **sign-in** → **create workout** → **workout appears in list** (extend with **edit/delete** when low cost). E2E runs against **local Supabase with seed data** or a **documented staging** project — **deterministic** test data, **no** live OpenAI calls in CI for MVP. |
| **TR-006** | **AI workout generation** (**FR-007**, `POST /api/v1/ai/workouts/generate`): automated tests shall use a **mocked LLM/HTTP response** only; **secrets** stay out of client bundles (**NFR-004**) and **CI must not depend** on a paid or rate-limited live model for MVP gates.                                                                                                     |
| **TR-007** | **Supabase RLS and roles** (**FR-004**, Architecture): MVP shall include a **documented manual verification** procedure (two athletes, one admin, expected allow/deny matrix) plus **optional SQL snippets** reviewers can run to confirm isolation and admin read rules. Automated policy tests in CI are **not** required for MVP.                                                |
| **TR-008** | When **continuous integration** exists for the repository, **SPA automated tests** (`npm test` or equivalent) shall run on every merge request / main pipeline; Playwright runs when the E2E spec and environment are **stable** (typically from **M3** onward).                                                                                                                    |

#### Traceability (functional requirements → minimum verification)

| Functional area                      | Minimum verification (MVP)                                                                                                                                     |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **FR-001** List                      | UI tests (mocked API): loading, empty, error, list with rows; E2E smoke includes list after create.                                                            |
| **FR-002** Detail                    | UI tests: detail from mocked `GET /workouts/{id}`; E2E optional if already covered by navigation from list.                                                    |
| **FR-003** Create                    | Zod/client tests + UI validation; E2E create path in smoke spec.                                                                                               |
| **FR-004** Edit/delete + permissions | UI tests with mocked API; **TR-007** manual RLS matrix; E2E edit/delete if cheap.                                                                              |
| **FR-005** Persistence               | E2E smoke against real DB (local/staging); client tests remain mocked.                                                                                         |
| **FR-006** Navigation                | Assert return to list after save in UI or E2E (at least one layer).                                                                                            |
| **FR-007** AI chat/generate          | Client or handler tests with **mocked** generate response (**TR-006**); no E2E dependency on OpenAI for MVP.                                                   |
| **NFR-001** Accessibility            | Manual a11y pass in **M4**; automated UI tests use semantic queries (`getByRole`, labels) where practical — optional axe tooling is **not** mandatory for MVP. |

**Iteration 2 (when in scope):** **FR-008** and **FR-009** shall have automated coverage for **per-type validation** and **routing to the correct UI** where applicable; **NFR-006** shall be evidenced by **ARCHITECTURE.md** describing the extension pattern and at least one **worked example** of adding a type without touching unrelated modules.

#### Definitions

| Term                            | Definition (MVP)                                                                                                                 |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **Unit test**                   | Tests **pure logic** with no browser DOM: schemas, mappers, small utilities.                                                     |
| **Component / UI test**         | **Vitest + React Testing Library** tests that render components in **jsdom** with **mocked** auth and network.                   |
| **Integration test (frontend)** | Tests that combine **hooks + UI** (e.g. TanStack Query with mocked `fetch` or MSW) without a real Supabase project.              |
| **End-to-end (E2E) test**       | **Playwright** tests against a **running app** and **real auth + database** (local or staging), using **seeded** users and data. |
| **Smoke test**                  | **Minimal** E2E path proving the app is **not fundamentally broken** (auth + one CRUD vertical slice).                           |
| **Manual verification**         | A **documented checklist** (and optional SQL) performed by a human, recorded for audits and releases.                            |

#### Out of scope for MVP automated testing

- Full **visual regression** suites, **load/performance** gates, and **automated RLS/policy** test jobs in CI (unless later added).
- **Contract tests** against production Supabase or OpenAI as a **merge gate**.

#### Alignment with milestones

| Milestone | Testing expectation                                                    |
| --------- | ---------------------------------------------------------------------- |
| **M1**    | Vitest + RTL **wired** (config, scripts, optional empty passing test). |
| **M2**    | **TR-002–TR-004** for **read path** (list, detail, states).            |
| **M3**    | **TR-004** for write path; implement **TR-005** Playwright smoke.      |
| **M4**    | **TR-007** documented; **TR-008** CI green; a11y pass per **NFR-001**. |

### Definition of done (MVP)

- All **P0** functional requirements (FR-001–FR-007) implemented for agreed auth model.
- **NFR-001** (accessibility) addressed for primary flows (documented exceptions if any).
- **Testing and verification (MVP)** (§12.1, **TR-001–TR-008**) satisfied.
- Deployed to **staging** (or agreed environment) with environment variables documented.
- [docs/ARCHITECTURE.md](ARCHITECTURE.md) updated to match implementation.

### Definition of done (iteration 2 — CrossFit WOD authoring and workout types)

- **FR-008** and **FR-009** implemented: multiple workout formats with **type-appropriate** flows (not a single rigid form for every format).
- **NFR-006** satisfied: **documented** developer extension pattern (registry / strategy / plugin-style) and **ARCHITECTURE.md** updated with extension points and a **concrete example** of adding a new workout type.
- Iteration 2 scope in [§6](./PRD.md#6-scope) (free-text capture, structured builder, admin exercise catalog) delivered per agreed priority; **paste parsing** remains optional unless promoted.

### Definition of done (iteration 4 — Garmin Import + Training Intelligence)

- **FR-011** implemented: `.fit` file upload, private storage, file size and MIME validation.
- **FR-012** implemented: server-side parsing, raw `jsonb` + typed columns persisted.
- **FR-013** implemented: training intelligence widgets rendered on workout detail when data is present.
- **FR-014** implemented: AI evaluation triggered after import, Zod-validated, non-blocking on failure.
- **FR-015** implemented: adaptation warning shown when recovery conflicts with next planned workout.
- **FR-016** implemented: next training suggestion card with CTA to pre-fill create form.
- **NFR-007** satisfied: Zod validation in place; LLM failure handled gracefully (null evaluation, UI warning).
- **NFR-008** satisfied: private bucket, 25 MB cap, server-side MIME validation.
- **ARCHITECTURE.md** updated with Garmin import flow and AI evaluation pipeline.

---

## 13. Risks, assumptions, dependencies

| Type           | Item                                                                                                                                                                                                                                                                                                              |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Assumption** | A single user or small group for MVP unless multi-tenant coaching product is required from day one.                                                                                                                                                                                                               |
| **Risk**       | ~~Late auth/backend decisions block integration~~ — **mitigated:** Supabase Auth + PostgREST + Edge Functions decided; see §10 and ARCHITECTURE.md.                                                                                                                                                               |
| **Risk**       | Supabase Edge Function cold-start latency may affect perceived performance — **mitigation:** keep functions lightweight; monitor with Supabase logs.                                                                                                                                                              |
| **Dependency** | Supabase project creation and environment variables (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `OPENAI_API_KEY`) must be set before integration work begins.                                                                                                                                                           |
| **Dependency** | Design approval for key screens.                                                                                                                                                                                                                                                                                  |
| **Risk**       | **Workout type proliferation** without a clear extension pattern leads to **conditional spaghetti** in forms and APIs — **mitigation:** **NFR-006** and early **ARCHITECTURE.md** alignment with **FR-008** / **FR-009**.                                                                                         |
| **Risk**       | **LLM response inconsistency** — the AI evaluation model may return malformed JSON or hallucinate invalid `readiness_level` values — **mitigation:** strict Zod schema validation on every response; null-fallback with non-blocking UI error; no CI dependency on live model calls (**NFR-007**).                |
| **Risk**       | **Garmin `.fit` file parsing complexity** — `.fit` is a binary protocol with device-specific quirks; the FIT SDK or `fit-file-parser` npm package may not cover all Garmin Fenix 7X fields — **mitigation:** extract only the 7–8 key metrics needed for iteration 4; store raw `jsonb` for future extensibility. |

---

## 14. Open questions

1. Who is the **primary user** for v1 (solo athlete, coach–athlete pair, gym)?
2. ~~**Authentication:** required for MVP or is a seeded demo acceptable?~~ — **Closed:** Supabase Auth (JWT, email/password) is required for MVP; no public/unauthenticated access.
3. **Units and locale:** metric vs imperial for distance; timezone handling for session times?

---

## 16. Component library decision (MVP)

### Decision

- Use **Tailwind CSS for styling**
- Use **Radix UI primitives via shadcn/ui for component implementation**

---

### Rationale

- **Faster MVP delivery**: prebuilt, composable components reduce time to implement forms, dialogs, and navigation.
- **Accessibility by default**: Radix primitives align with **WCAG 2.2 AA** requirements (keyboard navigation, focus management, ARIA attributes).
- **Consistency**: shared component patterns across the application (buttons, inputs, modals, etc.).
- **Customizability**: shadcn/ui components are not a black box; they are copied into the codebase and can be modified freely.
- **Stack alignment**: fits natively with **React + TypeScript + Tailwind CSS** already defined in the technical approach.

---

### Implementation guidelines

- Use **shadcn/ui** as the base component layer.
- Use **React Hook Form** + **Zod** + **`@hookform/resolvers`** with shadcn/ui **Form** components for create/edit and other non-trivial forms (see §10). Prefer **`register`** for native inputs; use **`Controller`** when a control cannot forward a ref. Very small forms may omit RHF in favor of local state.
- Use **Radix primitives** for:
  - Dialogs (modals)
  - Dropdown menus
  - Popovers
  - Tabs
  - Tooltips
- Use **Tailwind CSS utilities** for:
  - Layout
  - Spacing
  - Responsive design
  - Theming and visual customization
- Avoid introducing additional UI frameworks (e.g. Material UI, Bootstrap).

---

### Non-goals

- Do not build custom low-level primitives (e.g. dialog, select, menu) unless strictly necessary.
- Do not introduce multiple competing component libraries.

---

### Future considerations

- Evaluate extracting a **shared design system layer** if the app grows significantly.
- Consider documenting reusable components in a **storybook-like environment** in later phases.

---

## 15. Appendix (optional)

- Glossary: **Workout record** — a single entry representing one **training session** (workout): exercise or session type, when it happened, duration or load, and optional notes—**not** a workplace training course or HR certification.

---

## 17. Technical approach — API decision (MVP)

### API choice

- **REST API with OpenAPI contract (mandatory for MVP)**
- GraphQL is explicitly **out of scope for MVP**
- Decision rationale:
  - Simpler CRUD model aligned with product scope
  - Better fit with TanStack Query
  - Faster implementation and onboarding

---

### API design (MVP - REST + OpenAPI)

#### Principles

- Resource-oriented design (e.g. `/workouts`, `/users`)
- JSON request/response format
- Stateless communication
- Versioning via `/api/v1`
- Consistent error handling format
- OpenAPI specification as source of truth (used for documentation and type generation)

---

#### Core endpoints

**Workouts**

- `GET /api/v1/workouts`
  - Returns paginated list of workouts for the authenticated user
  - Supports filters:
    - `?fromDate=`
    - `?toDate=`
    - `?type=`
    - `?limit=`
    - `?cursor=`
- `GET /api/v1/workouts/{id}`
  - Returns a single workout record
- `POST /api/v1/workouts`
  - Creates a new workout
  - Validates required fields
- `PUT /api/v1/workouts/{id}`
  - Updates an existing workout
- `DELETE /api/v1/workouts/{id}`
  - Deletes a workout

---

**AI Workouts**

- `POST /api/v1/ai/workouts/generate`
  - Accepts natural language prompt
  - Returns structured workout proposal
  - Does NOT persist automatically

---

**Garmin Import (iteration 4)**

- `POST /api/v1/workouts/{id}/garmin-import`
  - Accepts multipart/form-data with `.fit` file
  - Parses file, persists raw + typed metrics
  - Triggers AI evaluation asynchronously (or inline)
  - Returns created `GarminActivity` record
- `GET /api/v1/workouts/{id}/garmin-data`
  - Returns parsed Garmin metrics for a workout
- `POST /api/v1/workouts/{id}/evaluate`
  - Triggers AI training evaluation (idempotent — re-runs if called again)
  - Returns created/updated `TrainingEvaluation` record
- `GET /api/v1/workouts/{id}/evaluation`
  - Returns the stored AI training evaluation for a workout

---

**Users (MVP minimal)**

- `GET /api/v1/me`
  - Returns current authenticated user

---

#### Data model (API level)

**Workout**

```json
{
  "id": "string",
  "title": "string",
  "type": "crossfit | functional",
  "performedAt": "ISO8601 datetime",
  "durationMinutes": 0,
  "notes": "string",
  "rpe": 1,
  "createdAt": "ISO8601 datetime",
  "updatedAt": "ISO8601 datetime"
}
```

---

#### Error format (standardized)

All errors should follow:

```json
{
  "error": {
    "code": "string",
    "message": "human readable message",
    "details": {}
  }
}
```

---

#### OpenAPI requirements

- The backend MUST expose an OpenAPI 3.x specification — satisfied by **Supabase PostgREST** (auto-generated at `/rest/v1/`)
- The spec MUST include:
  - All endpoints
  - Request/response schemas
  - Authentication method (Supabase JWT Bearer token)
- TypeScript types are generated via `supabase gen types typescript` and committed to `src/types/supabase.ts`
- The generated types file is kept in sync with migrations via CI

---

#### Frontend integration guidelines

- Use TanStack Query for all API interactions
- One hook per resource:
  - `useWorkouts()`
  - `useWorkout(id)`
  - `useCreateWorkout()`
  - `useUpdateWorkout()`
  - `useDeleteWorkout()`
- Centralize API client (fetch/axios wrapper)
- Handle errors consistently using API error format

---

#### Non-goals (API MVP)

- No GraphQL in MVP
- No complex aggregation endpoints
- No real-time (WebSockets) in MVP

---

<a id="ref-prd-section-18"></a>

## 18. BaaS / backend platform decision (MVP)

### Decision

- The product uses **Backend-as-a-Service (BaaS)** for persistence, auth, and serverless API logic.
- The chosen platform is **Supabase**: managed **PostgreSQL**, **PostgREST**, **Supabase Auth**, and **Supabase Edge Functions**.

### Why BaaS

- Delivers a **credible MVP** with less custom server operations and hosting to own.
- Fits the shape of the product: **REST CRUD** for workouts plus **one custom path** (AI workout generation) on Edge Functions.

### Why Supabase

- The MVP requires a **REST API with an OpenAPI 3.x contract**. **PostgREST** exposes an auto-generated REST surface and OpenAPI spec from the database schema.
- **Relational PostgreSQL** matches structured workout fields and supports **future analytics** and **wearable-derived structured data** (for example heart rate and zones) better than a document-only store.
- **Edge Functions** implement `POST /api/v1/ai/workouts/generate` and the **Edge gateway** pattern (SPA → `/api/v1/`\*, PostgREST `/rest/v1/` server-side only), as recorded in §10 and §17.
- **Supabase Auth** and **Row Level Security (RLS)** align with the **Athlete** and **Administrator** roles and per-user data isolation.

### Alternatives considered (summary)

- **Firebase / Firestore:** No native REST + OpenAPI surface for the data layer; satisfying the PRD would imply building a custom API layer, which weakens the BaaS value for this product.
- **PocketBase** and **Appwrite:** Viable in other contexts; for this PRD the combination of **first-class OpenAPI from PostgREST** and **PostgreSQL** ecosystem tilted the choice toward Supabase. Further comparison lives in [docs/ARCHITECTURE.md](ARCHITECTURE.md).

### Reference

- As-built stack, diagrams, and extended rationale: [docs/ARCHITECTURE.md](ARCHITECTURE.md).
