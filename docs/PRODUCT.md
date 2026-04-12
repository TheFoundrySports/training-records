# Product Context

Authoritative requirements for the current initiative are in [docs/PRD.md](PRD.md). This page is the **living** product summary; update it when the PRD (or shipped work) stabilises.

**Terminology:** **Training** here means **fitness training** — **workouts and exercise sessions**, not workplace courses or compliance training.

## Vision

Provide a **dependable web application** for **recording, viewing, and managing workout and training-session information**—so individuals (and optionally coaches) can maintain a clear **training log** for progress, reflection, and consistency without relying on scattered notes or ad hoc spreadsheets.

## Problem Statement

Workout history is often fragmented across notes apps, chats, and multiple tools. That fragmentation makes it harder to **see trends**, **remember what you did**, and **adjust programming** with confidence. This product concentrates **workout records** in one place with a clear, accessible UI.

## Target Users

- **Individuals / athletes** — log sessions, review recent training, and keep notes (RPE, how it felt, constraints).
- **Coaches or trainers** (when in scope) — view an athlete’s log when permissions allow.
- **Administrators** — manage users, roles, or shared templates (scope evolves with releases).

## Key Features

- **Workout list** — browse sessions relevant to the user with clear loading and empty states.
- **Session detail** — view activity, date/time, duration (or distance), notes, tags, and related metadata.
- **Create / edit / delete** — add and maintain records with validation and permission-aware actions (exact rules per release; see PRD).
- **Training calendar** — month, week, and day views of workouts with URL-driven `view` and `date`, navigation, and links into list/detail flows ([spec](features/calendar.md)).

Feature-level specs may live under [docs/features/](features/) as they are added.

## User Journeys

- **Athlete** — opens the app, reviews the list of workouts, opens a session for detail, logs or edits entries as allowed.
- **Coach** — (when in scope) reviews an athlete’s training log from permitted views.
- **Administrator** — (when in scope) configures access or shared programs.

## Roadmap

See milestones in [docs/PRD.md](PRD.md#12-milestones-and-release-criteria). High level:

- **MVP** — read/write **workout** records in the web app with agreed auth and persistence.
- **Later** — richer analytics, export, integrations with wearables or platforms (per PRD non-goals and phases).

## Risks

- Backend and **authentication choices** can block integration if deferred too long (mitigate with an early API contract).
- **Scope creep** into full gym CRM or nutrition products—avoid by holding the PRD non-goals until explicitly reprioritised.
