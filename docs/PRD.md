# Product Requirements Document: Training Records (Workouts Web App)

## 1. Document control

| Field | Value |
| --- | --- |
| **Title** | Training Records — initial product requirements (workouts / fitness) |
| **Version** | 0.2 |
| **Date** | 2026-03-25 |
| **Author** | TBD |
| **Status** | Draft |

**Related links**

- Product context: [docs/PRODUCT.md](PRODUCT.md)
- Architecture (as-built): [docs/ARCHITECTURE.md](ARCHITECTURE.md)
- Ticket / issue: TBD
- Design files: TBD

**Terminology:** In this document, **training** means **physical training: workouts and exercise sessions**, not workplace courses or compliance training.

---

## 2. Summary

This initiative defines a **web application for recording, viewing, and managing workout and training-session information** (for example: activity type, date and time, duration, intensity, notes, and optional media or links). The product is aimed at **people who want a reliable log of their fitness training** (solo athletes, hobby lifters, runners, etc.—exact primary user to be confirmed) and optionally **coaches or training partners** who need shared visibility.

The first release should deliver a **credible MVP**: authenticated or clearly scoped access (TBD), a minimal data model for **workout records**, list and detail views, and basic create/edit flows where applicable. The UI will be built with **React**, **TypeScript**, and **Tailwind CSS**, with further framework and API choices documented under [Technical approach](#10-technical-approach-fixed-stack--open-choices).

---

## 3. Problem and goals

### Problem

People who train regularly often lack a **single, dependable place** to track **workouts**. Logs may live in notes apps, spreadsheets, or several apps, which makes it harder to **see progress**, **spot patterns**, and **stay consistent**.

### Goals

- **G1:** Users can **see a consolidated view** of workout records relevant to them.
- **G2:** Authorised users can **add or update** records with clear validation and feedback.
- **G3:** The app is **accessible and understandable** on common desktop and mobile viewports (baseline defined under NFRs).
- **G4:** The codebase remains **maintainable** through TypeScript typing and a consistent UI approach (Tailwind).

### Non-goals (this PRD)

- **NG1:** Full **gym or studio management** (billing, class scheduling, member CRM)—out of scope unless explicitly added later.
- **NG2:** **Nutrition tracking**, sleep, or body metrics as first-class features—out of scope for MVP (may link externally later).
- **NG3:** Native mobile apps—web-first only.
- **NG4:** Replacing dedicated **wearable or device ecosystems** as the system of record—integration may come later; MVP may be standalone.

---

## 4. Users and stakeholders

| Role | Needs |
| --- | --- |
| **End user (athlete / individual)** | Log and review own workouts; add notes or tags where allowed. |
| **Coach / trainer** (optional) | View an athlete’s log when permissions allow. |
| **Administrator** | Configure users/roles or shared programs (scope TBD for MVP). |

**Approvers:** product owner / sponsor — TBD.

---

## 5. User stories (initial backlog)

- **US-1:** As a user, I want to **see a list of my workout records**, so that I can review recent training.
- **US-2:** As a user, I want to **open a record and see details** (activity, date/time, duration, intensity, notes), so that I can verify what I did.
- **US-3:** As a user, I want to **log a new workout**, so that my history stays current.
- **US-4:** As a user, I want to **edit or delete** a record I am allowed to change, so that I can correct mistakes.
- **US-5:** As a user, I want the UI to be **usable with a keyboard and screen reader** for primary flows, so that I am not excluded.

---

## 6. Scope

### In scope (MVP)

- Web UI for **list**, **detail**, **create**, and **edit** workout records (exact fields in FR section).
- **Client-side and/or API validation** aligned with the chosen backend (TBD).
- **Responsive layout** using Tailwind (including quick logging on mobile).
- **Authentication model** to be decided (see Open questions); MVP may use a simple agreed approach (e.g. mock auth for prototype only if explicitly allowed).

### Out of scope (deferred)

- Advanced analytics dashboards (PR charts, periodisation views) — **Phase 2** unless promoted.
- Deep integration with **Strava, Apple Health, Garmin**, etc. — **Phase 2+**.
- Offline-first or PWA — **later**.

---

## 7. Functional requirements

| ID | Requirement |
| --- | --- |
| **FR-001** | The system shall display a **paginated or scrollable list** of workout records available to the signed-in user (or public subset if no auth in prototype—must be an explicit decision). |
| **FR-002** | The system shall provide a **detail view** for a single workout record, including at minimum: **title or activity label**, **date and time (or date only)**, **duration** (or distance where relevant), and **notes or tags** as applicable. Optional fields (e.g. **perceived intensity / RPE**) may be added when agreed. |
| **FR-003** | The system shall allow **creating** a workout record with required field validation; invalid submissions show **inline or summary errors**. |
| **FR-004** | The system shall allow **editing** and **deleting** a record when the user has permission (rules TBD; at minimum, owner-only for MVP if multi-user). |
| **FR-005** | The system shall **persist** data according to the chosen backend (see Technical approach); if backend is not ready, a **documented mock or fixture layer** may be used only for demos, not production. |
| **FR-006** | The system shall provide **navigation** between list, detail, and forms without losing essential context (e.g. return to list after save). |

---

## 8. Non-functional requirements (NFRs)

| ID | Area | Requirement |
| --- | --- | --- |
| **NFR-001** | Accessibility | Primary flows meet **WCAG 2.2 Level AA** intent for components built in-house (focus order, labels, contrast). |
| **NFR-002** | Performance | Initial route interactive on mid-tier hardware; specific metrics (LCP, bundle budget) to be set when hosting target is chosen. |
| **NFR-003** | Browser support | Latest two versions of evergreen browsers (Chrome, Firefox, Safari, Edge) unless otherwise agreed. |
| **NFR-004** | Security | No secrets in client bundle; **HTTPS** in deployed environments; follow secure defaults for auth tokens (details depend on auth provider). |
| **NFR-005** | Maintainability | **TypeScript** strictness as per repo config; components colocated and styled with **Tailwind** utilities consistently. |

---

## 9. UX and design

- **Key screens:** list (index), detail, create/edit form, empty state, error state.
- **Design system:** **Tailwind CSS** for layout and tokens; optional **headless primitives** (e.g. Radix UI) + patterns such as shadcn/ui—**decision recorded when chosen** (see Open questions).

---

## 10. Technical approach (fixed stack + open choices)

### Decided

| Area | Decision |
| --- | --- |
| UI | **React** |
| Language | **TypeScript** |
| Styling | **Tailwind CSS** |

### Open decisions (record outcome in this doc when closed)

| Topic | Options / notes |
| --- | --- |
| **React framework** | Vite + React SPA, **Next.js** (App Router), Remix, etc. |
| **State** | Local state + **TanStack Query** for server/async state vs minimal global store (**Zustand**) if needed. |
| **Routing** | Depends on framework (e.g. React Router vs file-based). |
| **API** | REST vs GraphQL; **OpenAPI** contract recommended if REST. |
| **Auth** | Session cookies vs JWT; IdP (Auth0, Cognito, etc.) vs custom—**required before production**. |
| **Testing** | **Vitest** + React Testing Library; **Playwright** for critical E2E when flows exist. |

Intent in this PRD is captured here; **as-built** design lives in [docs/ARCHITECTURE.md](ARCHITECTURE.md).

---

## 11. Data and integrations

### Core entities (conceptual)

- **WorkoutRecord** (or **TrainingSession**): id, title/activity, startedAt or performedOn, duration (or distance), optional intensity/RPE, notes, tags, attachments (optional, later), owner/user id, timestamps.
- **User** (if multi-user): id, role, link to coach or group (TBD).

### Integrations

- **External APIs / IdP:** TBD.
- **Wearables / Apple Health / Strava:** Phase 2+ unless required for MVP.
- **Export:** CSV or PDF — Phase 2 unless required for MVP.

---

## 12. Milestones and release criteria

| Milestone | Outcome |
| --- | --- |
| **M1 — Skeleton** | Repo runs locally; app shell, routing placeholder, Tailwind configured; TypeScript passes. |
| **M2 — Read path** | List + detail backed by API or agreed mock; loading and error states. |
| **M3 — Write path** | Create + edit + delete per permissions; validation UX complete. |
| **M4 — Hardening** | A11y pass on primary flows; smoke tests; deployment story documented. |

### Definition of done (MVP)

- [ ] All **P0** functional requirements (FR-001–FR-006) implemented for agreed auth model.
- [ ] **NFR-001** (accessibility) addressed for primary flows (documented exceptions if any).
- [ ] Deployed to **staging** (or agreed environment) with environment variables documented.
- [ ] [docs/ARCHITECTURE.md](ARCHITECTURE.md) updated to match implementation.

---

## 13. Risks, assumptions, dependencies

| Type | Item |
| --- | --- |
| **Assumption** | A single user or small group for MVP unless multi-tenant coaching product is required from day one. |
| **Risk** | Late auth/backend decisions block integration—**mitigation:** agree stub contract early. |
| **Dependency** | Design approval for key screens; API availability for persistence. |

---

## 14. Open questions

1. Who is the **primary user** for v1 (solo athlete, coach–athlete pair, gym)?
2. **Authentication:** required for MVP or is a seeded demo acceptable for first internal release?
3. **React framework:** Vite vs Next.js (SSR/SSG needs?)?
4. **Units and locale:** metric vs imperial for distance; timezone handling for session times?
5. **Component library:** Tailwind-only vs Radix/shadcn-style primitives?

---

## 15. Appendix (optional)

- Glossary: **Workout record** — a single entry representing one **training session** (workout): exercise or session type, when it happened, duration or load, and optional notes—**not** a workplace training course or HR certification.
